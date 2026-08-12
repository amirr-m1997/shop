from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.test import RequestFactory, TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token

from accounts.models import DeliveryAttempt, UserProfile
from blog.serializers import BlogPostDetailSerializer
from shop.tests import (
    BlogPostFactory, OrderFactory, PaymentFactory, ShippingAddressFactory, UserFactory,
)
from shop.client_ip import get_client_ip
from shop.middleware import RequestLoggingMiddleware
from shop.observability import get_request_context
from django.conf import settings


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


    def test_regular_registration_does_not_claim_victim_guest_order(self):
        address = ShippingAddressFactory(user=None)
        order = OrderFactory(
            user=None, shipping_address=address, guest_email='victim@gmail.com',
            guest_session_id='victim-session',
        )

        response = self.client.post('/api/auth/register/', {
            'username': 'attacker', 'email': 'victim@gmail.com',
            'password': 'SecureAttacker987!',
        }, format='json', HTTP_X_SESSION_ID='attacker-session')

        self.assertEqual(response.status_code, 201)
        order.refresh_from_db()
        address.refresh_from_db()
        self.assertIsNone(order.user_id)
        self.assertIsNone(address.user_id)
        orders = self.client.get('/api/orders/orders/')
        self.assertEqual(orders.status_code, 200)
        self.assertEqual(orders.data['count'], 0)

    def test_verified_email_claims_only_orders_from_same_guest_session(self):
        user = UserFactory(username='verified-claim', email='guest@example.com')
        profile, _ = UserProfile.objects.get_or_create(user=user)
        token = Token.objects.create(user=user)
        own_order = OrderFactory(
            user=None, guest_email='guest@example.com', guest_session_id='own-session',
        )
        other_order = OrderFactory(
            user=None, guest_email='guest@example.com', guest_session_id='other-session',
        )
        profile.verification_code = '123456'
        profile.verification_type = 'email'
        profile.code_generated_at = timezone.now()
        profile.save()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        response = self.client.post('/api/auth/verify-code/', {
            'type': 'email', 'code': '123456',
        }, format='json', HTTP_X_SESSION_ID='own-session')

        self.assertEqual(response.status_code, 200)
        own_order.refresh_from_db()
        other_order.refresh_from_db()
        self.assertEqual(own_order.user_id, user.id)
        self.assertIsNone(other_order.user_id)

    def test_valid_guest_session_without_verified_email_does_not_claim(self):
        order = OrderFactory(
            user=None, guest_email='guest@example.com', guest_session_id='original-session',
        )
        response = self.client.post('/api/auth/guest-register/', {
            'email': order.guest_email,
            'order_number': order.order_number,
            'password': 'SecureGuest987!',
        }, format='json', HTTP_X_SESSION_ID='original-session')
        self.assertEqual(response.status_code, 201)
        order.refresh_from_db()
        self.assertIsNone(order.user_id)

    def test_changing_email_revokes_email_verification_and_pending_code(self):
        user = UserFactory(username='email-change', email='old@example.com')
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.email_verified = True
        profile.verification_code = '123456'
        profile.verification_type = 'email'
        profile.code_generated_at = timezone.now()
        profile.save()
        token = Token.objects.create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        response = self.client.put('/api/auth/user/', {
            'email': ' New@Example.com ',
        }, format='json')

        self.assertEqual(response.status_code, 200)
        user.refresh_from_db()
        profile.refresh_from_db()
        self.assertEqual(user.email, 'new@example.com')
        self.assertFalse(profile.email_verified)
        self.assertEqual(profile.verification_code, '')
        self.assertIsNone(profile.code_generated_at)

    def test_expired_verification_code_cannot_claim_order(self):
        user = UserFactory(username='expired-verify', email='guest@example.com')
        profile, _ = UserProfile.objects.get_or_create(user=user)
        token = Token.objects.create(user=user)
        order = OrderFactory(
            user=None, guest_email=user.email, guest_session_id='own-session',
        )
        profile.verification_code = '123456'
        profile.verification_type = 'email'
        profile.code_generated_at = timezone.now() - timedelta(minutes=11)
        profile.save()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        response = self.client.post('/api/auth/verify-code/', {
            'type': 'email', 'code': '123456',
        }, format='json', HTTP_X_SESSION_ID='own-session')

        self.assertEqual(response.status_code, 400)
        order.refresh_from_db()
        self.assertIsNone(order.user_id)


class RequestSecurityInfrastructureTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()

    def test_logging_middleware_runs_after_authentication_middleware(self):
        auth_index = settings.MIDDLEWARE.index(
            'django.contrib.auth.middleware.AuthenticationMiddleware'
        )
        logging_index = settings.MIDDLEWARE.index('shop.middleware.RequestLoggingMiddleware')
        self.assertGreater(logging_index, auth_index)

    def test_authenticated_user_is_present_in_log_context(self):
        user = UserFactory(username='logged-context-user')
        request = self.factory.get('/secure/', REMOTE_ADDR='192.0.2.10')
        request.user = user
        captured = {}

        def view(req):
            captured.update(get_request_context())
            from django.http import HttpResponse
            return HttpResponse('ok')

        RequestLoggingMiddleware(view)(request)
        self.assertEqual(captured['user'], user.username)
        self.assertEqual(captured['ip'], '192.0.2.10')

    @override_settings(TRUST_PROXY_HEADERS=False)
    def test_spoofed_forwarded_ip_is_ignored(self):
        request = self.factory.get(
            '/', REMOTE_ADDR='192.0.2.20', HTTP_X_FORWARDED_FOR='203.0.113.99'
        )
        self.assertEqual(get_client_ip(request), '192.0.2.20')

    @override_settings(TRUST_PROXY_HEADERS=True)
    def test_forwarded_ip_is_used_only_for_trusted_proxy_mode(self):
        request = self.factory.get(
            '/', REMOTE_ADDR='192.0.2.20', HTTP_X_FORWARDED_FOR='203.0.113.99, 10.0.0.1'
        )
        self.assertEqual(get_client_ip(request), '203.0.113.99')


class DeliverySecurityTests(TestCase):
    @patch('shop.tasks.async_task', return_value='task-id')
    def test_queued_email_has_persistent_status(self, mock_async_task):
        from shop.tasks import queue_email

        task_id = queue_email('subject', 'body', '', 'buyer@example.com', purpose='test')
        delivery = DeliveryAttempt.objects.get(channel='email')
        self.assertEqual(task_id, 'task-id')
        self.assertEqual(delivery.status, 'queued')
        self.assertEqual(delivery.purpose, 'test')
        mock_async_task.assert_called_once()

    @patch('shop.tasks.schedule')
    @patch('django.core.mail.EmailMultiAlternatives.send', side_effect=OSError('smtp down'))
    def test_email_failure_is_recorded_and_scheduled_with_backoff(self, _mock_send, mock_schedule):
        from shop.tasks import send_email_task

        delivery = DeliveryAttempt.objects.create(
            channel='email', purpose='test', recipient='buyer@example.com'
        )
        result = send_email_task(
            'subject', 'body', '', delivery.recipient, delivery_id=delivery.id
        )
        delivery.refresh_from_db()
        self.assertFalse(result)
        self.assertEqual(delivery.status, 'queued')
        self.assertEqual(delivery.attempts, 1)
        self.assertIn('smtp down', delivery.error)
        self.assertEqual(mock_schedule.call_args.kwargs['schedule_type'], 'O')


class EmailUniquenessRegressionTests(TestCase):
    def test_database_rejects_same_normalized_email_with_different_case(self):
        User.objects.create_user('first-email', 'user@example.com', 'SecurePass987!')
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                User.objects.create_user('second-email', ' User@Example.com ', 'SecurePass987!')


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
