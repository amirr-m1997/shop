"""End-to-end business-flow regressions across the public store APIs."""

from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.core.cache import cache
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from accounts.models import UserProfile
from orders.models import Order
from payments.models import Payment
from shop.tests import (
    CouponFactory,
    ProductFactory,
    ShippingAddressFactory,
    create_user_with_token,
)


MERCHANT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'


def gateway_response(code=100, **data):
    return MagicMock(
        status_code=200,
        json=MagicMock(return_value={
            'data': {'code': code, **data},
            'errors': {},
        }),
    )


class AuthenticatedPurchaseBusinessFlowTests(APITestCase):
    """A real cart/checkout/payment flow using only public API contracts."""

    def setUp(self):
        cache.clear()
        self.user, self.token = create_user_with_token(username='flow-buyer')
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.product = ProductFactory(price=Decimal('200000'), stock=8)
        self.address = ShippingAddressFactory(user=self.user)

    @patch('payments.views.ZARINPAL_MERCHANT_ID', MERCHANT_ID)
    @patch('payments.views.requests.post')
    @patch('django_q.tasks.async_task')
    def test_cart_to_verified_payment_uses_server_totals_once(
        self, async_task, gateway_post,
    ):
        add = self.client.post('/api/cart/add_item/', {
            'product_id': self.product.id,
            'quantity': 1,
        }, format='json')
        self.assertEqual(add.status_code, status.HTTP_201_CREATED)

        item_id = add.data['items'][0]['id']
        update = self.client.patch('/api/cart/update_item/', {
            'item_id': item_id,
            'quantity': 2,
        }, format='json')
        self.assertEqual(update.status_code, status.HTTP_200_OK)

        coupon = CouponFactory(
            code='FLOW10', discount_type='percentage', value=Decimal('10'),
            min_amount=None,
        )
        checkout = self.client.post('/api/orders/orders/create_order/', {
            'shipping_address_id': self.address.id,
            'payment_method': 'online',
            'coupon_code': coupon.code,
            # These untrusted values must never become accounting data.
            'subtotal': '1',
            'shipping_cost': '0',
            'discount': '999999999',
            'total': '1',
        }, format='json')
        self.assertEqual(checkout.status_code, status.HTTP_201_CREATED)

        order = Order.objects.get(user=self.user)
        self.assertEqual(order.subtotal, Decimal('400000'))
        self.assertEqual(order.discount, Decimal('40000'))
        self.assertEqual(order.total, order.subtotal + order.shipping_cost - order.discount)
        self.assertEqual(order.shipping_address_id, self.address.id)
        self.assertEqual(order.items.get().price, Decimal('200000'))
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 6)

        gateway_post.return_value = gateway_response(authority='FLOW-AUTH')
        initiate = self.client.post('/api/payments/initiate/', {
            'order_id': order.id,
            'amount': 1,
        }, format='json')
        self.assertEqual(initiate.status_code, status.HTTP_200_OK)
        payment = Payment.objects.get(order=order)
        self.assertEqual(payment.amount, order.total)
        self.assertEqual(gateway_post.call_args.kwargs['json']['amount'], int(order.total))

        gateway_post.return_value = gateway_response(
            ref_id='987654', card_pan='123456******1234', fee=0,
        )
        callback_url = (
            f'/api/payments/verify/?payment_id={payment.id}'
            '&Authority=FLOW-AUTH&Status=OK'
        )
        verified = self.client.get(callback_url)
        duplicate = self.client.get(callback_url)
        self.assertEqual(verified.status_code, status.HTTP_302_FOUND)
        self.assertEqual(duplicate.status_code, status.HTTP_302_FOUND)

        order.refresh_from_db()
        payment.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(order.status, 'pending')
        self.assertEqual(order.payment_status, 'paid')
        self.assertEqual(payment.status, 'success')
        self.assertEqual(payment.ref_id, '987654')
        self.assertEqual(self.product.stock, 6)
        self.assertEqual(Payment.objects.filter(order=order).count(), 1)
        self.assertEqual(async_task.call_count, 3)


class GuestPurchaseAndClaimBusinessFlowTests(APITestCase):
    """Regression for secure ownership transfer after a guest purchase."""

    session_id = 'guest-flow-browser-session'

    def setUp(self):
        cache.clear()
        self.product = ProductFactory(price=Decimal('300000'), stock=4)

    @patch('payments.views.ZARINPAL_MERCHANT_ID', MERCHANT_ID)
    @patch('payments.views.requests.post')
    @patch('django_q.tasks.async_task')
    def test_paid_guest_order_is_claimed_only_after_same_session_email_verification(
        self, async_task, gateway_post,
    ):
        headers = {'HTTP_X_SESSION_ID': self.session_id}
        add = self.client.post('/api/cart/add_item/', {
            'product_id': self.product.id,
            'quantity': 1,
        }, format='json', **headers)
        self.assertEqual(add.status_code, status.HTTP_201_CREATED)

        checkout = self.client.post('/api/orders/orders/create_order/', {
            'payment_method': 'online',
            'guest_email': 'guest-flow@example.com',
            'guest_phone': '09120000000',
            'full_name': 'Guest Flow',
            'address_line1': 'Tehran, Test Street',
            'city': 'Tehran',
            'state': 'Tehran',
            'postal_code': '1234567890',
        }, format='json', **headers)
        self.assertEqual(checkout.status_code, status.HTTP_201_CREATED)
        order = Order.objects.get(guest_email='guest-flow@example.com')
        address_id = order.shipping_address_id
        self.assertIsNone(order.user_id)

        gateway_post.return_value = gateway_response(authority='GUEST-AUTH')
        initiate = self.client.post('/api/payments/initiate/', {
            'order_id': order.id,
        }, format='json', **headers)
        self.assertEqual(initiate.status_code, status.HTTP_200_OK)
        payment = Payment.objects.get(order=order)

        gateway_post.return_value = gateway_response(ref_id='112233', fee=0)
        verified = self.client.get(
            f'/api/payments/verify/?payment_id={payment.id}'
            '&Authority=GUEST-AUTH&Status=OK',
        )
        self.assertEqual(verified.status_code, status.HTTP_302_FOUND)

        attack = self.client.post('/api/auth/guest-register/', {
            'email': 'guest-flow@example.com',
            'order_number': order.order_number,
            'password': 'SecureGuest987!',
        }, format='json', HTTP_X_SESSION_ID='different-browser-session')
        self.assertEqual(attack.status_code, status.HTTP_403_FORBIDDEN)
        order.refresh_from_db()
        self.assertIsNone(order.user_id)

        registered = self.client.post('/api/auth/guest-register/', {
            'email': 'GUEST-FLOW@example.com',
            'order_number': order.order_number,
            'password': 'SecureGuest987!',
        }, format='json', **headers)
        self.assertEqual(registered.status_code, status.HTTP_201_CREATED)
        token = registered.data['token']
        user = Token.objects.select_related('user').get(key=token).user
        order.refresh_from_db()
        self.assertIsNone(order.user_id)

        profile = UserProfile.objects.get(user=user)
        profile.verification_code = '654321'
        profile.verification_type = 'email'
        profile.code_generated_at = timezone.now()
        profile.save(update_fields=[
            'verification_code', 'verification_type', 'code_generated_at',
        ])
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        confirm = self.client.post('/api/auth/verify-code/', {
            'type': 'email',
            'code': '654321',
        }, format='json', **headers)
        self.assertEqual(confirm.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        payment.refresh_from_db()
        order.shipping_address.refresh_from_db()
        self.assertEqual(order.user_id, user.id)
        self.assertEqual(order.shipping_address_id, address_id)
        self.assertEqual(order.shipping_address.user_id, user.id)
        self.assertEqual(payment.order_id, order.id)
        self.assertEqual(payment.status, 'success')
        self.assertIsNone(order.guest_email)
        self.assertIsNone(order.guest_session_id)

        listing = self.client.get('/api/orders/orders/')
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertEqual(listing.data['count'], 1)
        self.assertEqual(listing.data['results'][0]['id'], order.id)
        self.assertEqual(async_task.call_count, 3)
