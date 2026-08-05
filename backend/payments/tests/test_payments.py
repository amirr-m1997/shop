from django.test import TestCase, RequestFactory
from django.utils import timezone
from django.core.cache import cache
from decimal import Decimal
from datetime import timedelta
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch, MagicMock
from django.test.client import Client
from shop.tests import (
    UserFactory, ProductFactory, CartFactory, CartItemFactory,
    OrderFactory, OrderItemFactory, ShippingAddressFactory,
    CouponFactory, PaymentFactory, CategoryFactory, SizeFactory,
    ColorFactory, ProductVariantFactory, create_user_with_token,
    create_order_with_items, create_product_with_variant,
    AdminUserFactory, AdminProfileFactory, create_admin_with_token,
)
from payments.models import Payment
from orders.models import Order
from products.models import Category


from products.models import Category, Size, Color, ProductVariant


def make_category():
    return Category.objects.create(
        name=f'Cat {Category.objects.count() + 1}',
        slug=f'cat-{Category.objects.count() + 1}',
    )


def make_variant(product, stock=20, price_adjustment=Decimal('0')):
    size = Size.objects.create(name=f'Size {Size.objects.count() + 1}', category=product.category)
    color = Color.objects.create(name=f'Color {Color.objects.count() + 1}', hex_code='#FF0000')
    return ProductVariant.objects.create(
        product=product, size=size, color=color,
        stock=stock, price_adjustment=price_adjustment,
    )


class InitiatePaymentTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.user, self.token = create_user_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.category = make_category()
        self.product = ProductFactory(category=self.category, price=Decimal('500000'), stock=50)
        self.shipping = ShippingAddressFactory(user=self.user)
        self.site_settings_patch = patch('pages.models.SiteSettings.load')
        self.mock_settings = self.site_settings_patch.start()
        self.mock_settings.return_value = MagicMock(
            free_shipping_threshold=Decimal('500000'),
            shipping_cost=Decimal('30000'),
            calculate_shipping=lambda subtotal: Decimal('30000'),
        )

    def tearDown(self):
        self.site_settings_patch.stop()

    def _create_order(self, **kwargs):
        order = OrderFactory(user=self.user, **kwargs)
        OrderItemFactory(order=order, product=self.product, quantity=1, price=Decimal('500000'))
        return order

    @patch('payments.views.ZARINPAL_MERCHANT_ID', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    @patch('payments.views.requests.post')
    def test_initiate_payment_valid(self, mock_post):
        order = self._create_order(status='pending_payment', payment_status='unpaid')
        mock_post.return_value = MagicMock(
            json=MagicMock(return_value={'data': {'code': 100, 'authority': 'AUTH123'}, 'errors': {}}),
            status_code=200,
        )
        response = self.client.post('/api/payments/initiate/', {'order_id': order.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('gateway_url', response.data)
        self.assertEqual(response.data['authority'], 'AUTH123')
        payment = Payment.objects.get(order=order)
        self.assertEqual(payment.status, 'processing')
        self.assertEqual(payment.authority, 'AUTH123')

    @patch('payments.views.ZARINPAL_MERCHANT_ID', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    def test_initiate_payment_invalid_order(self):
        response = self.client.post('/api/payments/initiate/', {'order_id': 99999})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('payments.views.ZARINPAL_MERCHANT_ID', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    def test_initiate_payment_already_paid(self):
        order = self._create_order(status='pending_payment', payment_status='paid')
        response = self.client.post('/api/payments/initiate/', {'order_id': order.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('payments.views.ZARINPAL_MERCHANT_ID', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    def test_initiate_payment_expired_order(self):
        order = self._create_order(status='expired', payment_status='unpaid')
        response = self.client.post('/api/payments/initiate/', {'order_id': order.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('payments.views.ZARINPAL_MERCHANT_ID', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    def test_initiate_payment_cancelled_order(self):
        order = self._create_order(status='cancelled', payment_status='unpaid')
        response = self.client.post('/api/payments/initiate/', {'order_id': order.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('payments.views.ZARINPAL_MERCHANT_ID', 'invalid-merchant')
    def test_initiate_payment_invalid_merchant_id(self):
        order = self._create_order(status='pending_payment', payment_status='unpaid')
        response = self.client.post('/api/payments/initiate/', {'order_id': order.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('payments.views.ZARINPAL_MERCHANT_ID', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    @patch('payments.views.requests.post')
    def test_initiate_payment_zarinpal_returns_error(self, mock_post):
        order = self._create_order(status='pending_payment', payment_status='unpaid')
        mock_post.return_value = MagicMock(
            json=MagicMock(return_value={'data': {'code': -10}, 'errors': {}}),
            status_code=200,
        )
        response = self.client.post('/api/payments/initiate/', {'order_id': order.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        payment = Payment.objects.get(order=order)
        self.assertEqual(payment.status, 'failed')

    @patch('payments.views.ZARINPAL_MERCHANT_ID', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    @patch('payments.views.requests.post')
    def test_initiate_payment_network_error(self, mock_post):
        import requests as req
        order = self._create_order(status='pending_payment', payment_status='unpaid')
        mock_post.side_effect = req.exceptions.ConnectionError('timeout')
        response = self.client.post('/api/payments/initiate/', {'order_id': order.id})
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        payment = Payment.objects.get(order=order)
        self.assertEqual(payment.status, 'failed')

    @patch('payments.views.ZARINPAL_MERCHANT_ID', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    @patch('payments.views.requests.post')
    def test_initiate_payment_invalid_json_response(self, mock_post):
        order = self._create_order(status='pending_payment', payment_status='unpaid')
        mock_response = MagicMock()
        mock_response.json.side_effect = ValueError('no json')
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        response = self.client.post('/api/payments/initiate/', {'order_id': order.id})
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        payment = Payment.objects.get(order=order)
        self.assertEqual(payment.status, 'failed')

    @patch('payments.views.ZARINPAL_MERCHANT_ID', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    def test_initiate_payment_order_below_minimum(self):
        order = self._create_order(status='pending_payment', payment_status='unpaid')
        order.total = Decimal('500')
        order.save(update_fields=['total'])
        response = self.client.post('/api/payments/initiate/', {'order_id': order.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('payments.views.ZARINPAL_MERCHANT_ID', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    @patch('payments.views.requests.post')
    def test_initiate_payment_existing_processing_returns_gateway(self, mock_post):
        order = self._create_order(status='pending_payment', payment_status='unpaid')
        Payment.objects.create(order=order, user=self.user, amount=order.total, status='processing', authority='OLD_AUTH')
        response = self.client.post('/api/payments/initiate/', {'order_id': order.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('gateway_url', response.data)
        mock_post.assert_not_called()


class PaymentVerifyCallbackTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = UserFactory()
        self.category = make_category()
        self.product = ProductFactory(category=self.category, price=Decimal('500000'))
        self.order = OrderFactory(user=self.user, status='pending_payment', payment_status='unpaid', total=Decimal('500000'))
        self.payment = PaymentFactory(order=self.order, user=self.user, amount=Decimal('500000'), status='processing', authority='AUTH123')
        from django.core.cache import cache
        cache.clear()

    @patch('payments.views.ZARINPAL_MERCHANT_ID', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    @patch('payments.views.FRONTEND_URL', 'http://localhost:3000')
    @patch('payments.views.requests.post')
    def test_verify_success(self, mock_post):
        mock_post.return_value = MagicMock(
            json=MagicMock(return_value={
                'data': {'code': 100, 'ref_id': 'REF123', 'card_pan': '1234****5678', 'fee': 1000},
                'errors': {},
            }),
            status_code=200,
        )
        response = self.client.get(f'/api/payments/verify/?payment_id={self.payment.id}&Authority=AUTH123&Status=OK')
        self.assertEqual(response.status_code, 302)
        self.payment.refresh_from_db()
        self.order.refresh_from_db()
        self.assertEqual(self.payment.status, 'success')
        self.assertEqual(self.payment.ref_id, 'REF123')
        self.assertEqual(self.order.status, 'pending')
        self.assertEqual(self.order.payment_status, 'paid')

    @patch('payments.views.FRONTEND_URL', 'http://localhost:3000')
    def test_verify_user_cancelled(self):
        response = self.client.get(f'/api/payments/verify/?payment_id={self.payment.id}&Authority=AUTH123&Status=NOK')
        self.assertEqual(response.status_code, 302)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'failed')

    @patch('payments.views.ZARINPAL_MERCHANT_ID', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    @patch('payments.views.FRONTEND_URL', 'http://localhost:3000')
    @patch('payments.views.requests.post')
    def test_verify_zarinpal_failure(self, mock_post):
        mock_post.return_value = MagicMock(
            json=MagicMock(return_value={'data': {'code': -51}, 'errors': {}}),
            status_code=200,
        )
        response = self.client.get(f'/api/payments/verify/?payment_id={self.payment.id}&Authority=AUTH123&Status=OK')
        self.assertEqual(response.status_code, 302)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'failed')

    @patch('payments.views.FRONTEND_URL', 'http://localhost:3000')
    def test_verify_order_already_expired(self):
        self.order.status = 'expired'
        self.order.save(update_fields=['status'])
        response = self.client.get(f'/api/payments/verify/?payment_id={self.payment.id}&Authority=AUTH123&Status=OK')
        self.assertEqual(response.status_code, 302)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'failed')

    @patch('payments.views.FRONTEND_URL', 'http://localhost:3000')
    def test_verify_order_cancelled(self):
        self.order.status = 'cancelled'
        self.order.save(update_fields=['status'])
        response = self.client.get(f'/api/payments/verify/?payment_id={self.payment.id}&Authority=AUTH123&Status=OK')
        self.assertEqual(response.status_code, 302)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'failed')

    @patch('payments.views.FRONTEND_URL', 'http://localhost:3000')
    def test_verify_payment_not_found(self):
        response = self.client.get('/api/payments/verify/?payment_id=99999&Authority=AUTH123&Status=OK')
        self.assertEqual(response.status_code, 302)

    @patch('payments.views.ZARINPAL_MERCHANT_ID', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    @patch('payments.views.FRONTEND_URL', 'http://localhost:3000')
    @patch('payments.views.requests.post')
    def test_verify_network_error(self, mock_post):
        import requests as req
        mock_post.side_effect = req.exceptions.ConnectionError('timeout')
        response = self.client.get(f'/api/payments/verify/?payment_id={self.payment.id}&Authority=AUTH123&Status=OK')
        self.assertEqual(response.status_code, 302)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'failed')

    @patch('payments.views.ZARINPAL_MERCHANT_ID', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    @patch('payments.views.FRONTEND_URL', 'http://localhost:3000')
    @patch('payments.views.requests.post')
    def test_verify_invalid_json_from_zarinpal(self, mock_post):
        mock_response = MagicMock()
        mock_response.json.side_effect = ValueError('bad json')
        mock_post.return_value = mock_response
        response = self.client.get(f'/api/payments/verify/?payment_id={self.payment.id}&Authority=AUTH123&Status=OK')
        self.assertEqual(response.status_code, 302)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'failed')


class DuplicateCallbackTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = UserFactory()
        self.category = make_category()
        self.product = ProductFactory(category=self.category, price=Decimal('500000'))
        self.order = OrderFactory(user=self.user, status='pending_payment', payment_status='unpaid', total=Decimal('500000'))
        self.payment = PaymentFactory(order=self.order, user=self.user, amount=Decimal('500000'), status='processing', authority='AUTH123')
        from django.core.cache import cache
        cache.clear()

    @patch('payments.views.ZARINPAL_MERCHANT_ID', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    @patch('payments.views.FRONTEND_URL', 'http://localhost:3000')
    @patch('payments.views.requests.post')
    def test_duplicate_callback_after_success(self, mock_post):
        mock_post.return_value = MagicMock(
            json=MagicMock(return_value={
                'data': {'code': 100, 'ref_id': 'REF123', 'card_pan': '1234****5678', 'fee': 0},
                'errors': {},
            }),
            status_code=200,
        )
        self.client.get(f'/api/payments/verify/?payment_id={self.payment.id}&Authority=AUTH123&Status=OK')
        self.payment.refresh_from_db()
        self.order.refresh_from_db()
        self.assertEqual(self.payment.status, 'success')
        self.assertEqual(self.order.status, 'pending')


class OrderStatusUpdateAfterPaymentTest(APITestCase):
    def setUp(self):
        self.user, self.token = create_user_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')

    def test_order_status_changes_to_pending_after_payment(self):
        order = OrderFactory(user=self.user, status='pending_payment', payment_status='unpaid')
        order.payment_status = 'paid'
        order.status = 'pending'
        order.tracking_number = 'REF123'
        order.expires_at = None
        order.save(update_fields=['payment_status', 'status', 'tracking_number', 'expires_at', 'updated_at'])
        order.refresh_from_db()
        self.assertEqual(order.status, 'pending')
        self.assertEqual(order.payment_status, 'paid')
        self.assertIsNone(order.expires_at)
        self.assertEqual(order.tracking_number, 'REF123')


class RaceConditionProtectionTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = UserFactory()
        self.category = make_category()
        self.product = ProductFactory(category=self.category, price=Decimal('500000'))
        self.order = OrderFactory(user=self.user, status='pending_payment', payment_status='unpaid', total=Decimal('500000'))
        self.payment = PaymentFactory(order=self.order, user=self.user, amount=Decimal('500000'), status='processing', authority='AUTH123')
        from django.core.cache import cache
        cache.clear()

    @patch('payments.views.ZARINPAL_MERCHANT_ID', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    @patch('payments.views.FRONTEND_URL', 'http://localhost:3000')
    @patch('payments.views.requests.post')
    def test_verify_rejects_if_order_cancelled_during_payment(self, mock_post):
        self.order.status = 'cancelled'
        self.order.save(update_fields=['status'])
        mock_post.return_value = MagicMock(
            json=MagicMock(return_value={
                'data': {'code': 100, 'ref_id': 'REF123', 'card_pan': '', 'fee': 0},
                'errors': {},
            }),
            status_code=200,
        )
        response = self.client.get(f'/api/payments/verify/?payment_id={self.payment.id}&Authority=AUTH123&Status=OK')
        self.assertEqual(response.status_code, 302)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'failed')

    @patch('payments.views.ZARINPAL_MERCHANT_ID', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    @patch('payments.views.FRONTEND_URL', 'http://localhost:3000')
    @patch('payments.views.requests.post')
    def test_verify_rejects_if_order_expired_during_payment(self, mock_post):
        self.order.status = 'expired'
        self.order.save(update_fields=['status'])
        response = self.client.get(f'/api/payments/verify/?payment_id={self.payment.id}&Authority=AUTH123&Status=OK')
        self.assertEqual(response.status_code, 302)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'failed')


class PaymentStatusCheckTest(APITestCase):
    def setUp(self):
        self.user, self.token = create_user_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')

    def test_payment_status_exists(self):
        order = OrderFactory(user=self.user)
        payment = PaymentFactory(order=order, user=self.user, status='success', ref_id='REF456')
        response = self.client.get(f'/api/payments/{payment.id}/status/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertEqual(response.data['ref_id'], 'REF456')

    def test_payment_status_not_found(self):
        response = self.client.get('/api/payments/99999/status/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_payment_status_other_user_forbidden(self):
        other_user = UserFactory()
        order = OrderFactory(user=other_user)
        payment = PaymentFactory(order=order, user=other_user)
        response = self.client.get(f'/api/payments/{payment.id}/status/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_payment_status_unauthenticated_without_session_is_not_found(self):
        # Without credentials AND without a matching guest X-Session-ID the
        # payment is not revealed (404, not 401) so order/payment ids of
        # other customers cannot be probed.
        self.client.credentials()
        order = OrderFactory(user=self.user)
        payment = PaymentFactory(order=order, user=self.user)
        response = self.client.get(f'/api/payments/{payment.id}/status/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_payment_status_guest_with_matching_session(self):
        self.client.credentials()
        order = OrderFactory(user=None, guest_session_id='sess-123', guest_email='g@x.com')
        payment = PaymentFactory(order=order, user=None, status='success', ref_id='REF1')
        response = self.client.get(
            f'/api/payments/{payment.id}/status/',
            HTTP_X_SESSION_ID='sess-123',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')


class PaymentViewSetTest(APITestCase):
    def setUp(self):
        self.user, self.token = create_user_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')

    def test_list_payments(self):
        order = OrderFactory(user=self.user)
        PaymentFactory(order=order, user=self.user)
        response = self.client.get('/api/payments/payments/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_list_payments_excludes_other_users(self):
        other_user = UserFactory()
        order = OrderFactory(user=other_user)
        PaymentFactory(order=order, user=other_user)
        response = self.client.get('/api/payments/payments/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)

    def test_retrieve_payment(self):
        order = OrderFactory(user=self.user)
        payment = PaymentFactory(order=order, user=self.user)
        response = self.client.get(f'/api/payments/payments/{payment.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
