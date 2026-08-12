from django.test import TestCase
from rest_framework.test import APITestCase

from blog.serializers import BlogPostDetailSerializer
from shop.tests import BlogPostFactory, OrderFactory, PaymentFactory, UserFactory


class AuthenticationSecurityRegressionTests(APITestCase):
    def test_login_sets_httponly_cookie(self):
        UserFactory(username='cookie-user')
        response = self.client.post('/api/auth/login/', {
            'username': 'cookie-user', 'password': 'testpass123',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.cookies['shop_auth']['httponly'])

    def test_guest_order_claim_requires_original_session(self):
        order = OrderFactory(
            user=None, guest_email='guest@example.com', guest_session_id='original-session',
        )
        response = self.client.post('/api/auth/guest-register/', {
            'email': order.guest_email,
            'order_number': order.order_number,
            'password': 'SecureGuest987!',
        }, format='json', HTTP_X_SESSION_ID='attacker-session')
        self.assertEqual(response.status_code, 403)
        order.refresh_from_db()
        self.assertIsNone(order.user_id)


class ContentSecurityRegressionTests(TestCase):
    def test_blog_content_removes_scripts_and_event_handlers(self):
        post = BlogPostFactory(content='<p onclick="steal()">safe</p><script>steal()</script>')
        content = BlogPostDetailSerializer(post).data['content']
        self.assertNotIn('<script', content)
        self.assertNotIn('onclick', content)


class PaymentSecurityRegressionTests(APITestCase):
    def test_callback_rejects_mismatched_authority(self):
        payment = PaymentFactory(authority='EXPECTED')
        response = self.client.get('/api/payments/verify/', {
            'payment_id': payment.id, 'Authority': 'OTHER', 'Status': 'OK',
        })
        self.assertEqual(response.status_code, 302)
        self.assertIn('authority_mismatch', response.url)
        payment.refresh_from_db()
        self.assertNotEqual(payment.status, 'success')
