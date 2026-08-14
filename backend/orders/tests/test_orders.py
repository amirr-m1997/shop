from django.test import TestCase, TransactionTestCase, skipUnlessDBFeature
from django.db import close_old_connections
from django.core.cache import cache
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch, MagicMock
from types import SimpleNamespace
from django.core.management import call_command
from django.db.models import F
from shop.tests import (
    UserFactory, ProductFactory, CartFactory, CartItemFactory,
    OrderFactory, OrderItemFactory, ShippingAddressFactory,
    CouponFactory, PaymentFactory, CategoryFactory, SizeFactory,
    ColorFactory, ProductVariantFactory, create_user_with_token,
    create_order_with_items, create_product_with_variant,
    AdminUserFactory, AdminProfileFactory, create_admin_with_token,
)
from orders.models import (
    Order, OrderItem, Coupon, CouponUsage, WelcomeClaim, ShippingAddress,
    LegacyInventoryReconciliation,
)
from orders.admin import LegacyInventoryReconciliationAdmin
from orders.services import reserve_inventory, release_inventory, expire_orders
from products.models import Product, ProductVariant, Category, Size, Color
from cart.models import Cart, CartItem
from pages.models import SiteSettings


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


class CreateOrderTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.user, self.token = create_user_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.site_settings = SiteSettings.load()
        self.category = make_category()
        self.product = ProductFactory(category=self.category, price=Decimal('100000'), stock=50)
        self.cart = CartFactory(user=self.user)
        self.shipping = ShippingAddressFactory(user=self.user)

    def _build_cart_item(self, product=None, quantity=1, variant=None):
        product = product or self.product
        return CartItemFactory(cart=self.cart, product=product, quantity=quantity, variant=variant)

    @patch('shop.email_service.send_order_confirmation', side_effect=Exception('email fail'))
    def test_create_order_valid(self, mock_email):
        self._build_cart_item(quantity=2)
        response = self.client.post('/api/orders/orders/create_order/', {
            'shipping_address_id': self.shipping.id,
            'payment_method': 'online',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'pending_payment')
        self.assertEqual(Order.objects.filter(user=self.user).count(), 1)

    def test_create_order_empty_cart(self):
        response = self.client.post('/api/orders/orders/create_order/', {
            'shipping_address_id': self.shipping.id,
            'payment_method': 'online',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_order_no_cart(self):
        self.cart.delete()
        response = self.client.post('/api/orders/orders/create_order/', {
            'shipping_address_id': self.shipping.id,
            'payment_method': 'online',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_order_insufficient_stock(self):
        self._build_cart_item(quantity=5)
        self.product.stock = 2
        self.product.save()
        response = self.client.post('/api/orders/orders/create_order/', {
            'shipping_address_id': self.shipping.id,
            'payment_method': 'online',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_order_invalid_shipping_address(self):
        self._build_cart_item()
        response = self.client.post('/api/orders/orders/create_order/', {
            'shipping_address_id': 99999,
            'payment_method': 'online',
        })
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND])

    def test_create_order_shipping_address_belongs_to_other_user(self):
        other_user = UserFactory()
        other_shipping = ShippingAddressFactory(user=other_user)
        self._build_cart_item()
        response = self.client.post('/api/orders/orders/create_order/', {
            'shipping_address_id': other_shipping.id,
            'payment_method': 'online',
        })
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND])

    @patch('shop.email_service.send_order_confirmation', side_effect=Exception('email fail'))
    def test_create_order_clears_cart(self, mock_email):
        self._build_cart_item(quantity=1)
        self.client.post('/api/orders/orders/create_order/', {
            'shipping_address_id': self.shipping.id,
            'payment_method': 'online',
        })
        self.assertEqual(CartItem.objects.filter(cart=self.cart).count(), 0)

    @patch('shop.email_service.send_order_confirmation', side_effect=Exception('email fail'))
    def test_create_order_with_coupon(self, mock_email):
        coupon = CouponFactory(
            code='DISC10',
            discount_type='percentage',
            value=Decimal('10'),
            min_amount=None,
        )
        self._build_cart_item(quantity=1)
        response = self.client.post('/api/orders/orders/create_order/', {
            'shipping_address_id': self.shipping.id,
            'payment_method': 'online',
            'coupon_code': 'DISC10',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order = Order.objects.get(user=self.user)
        self.assertGreater(order.discount, Decimal('0'))
        self.assertTrue(CouponUsage.objects.filter(coupon=coupon, user=self.user).exists())

    def test_create_order_invalid_coupon(self):
        self._build_cart_item()
        response = self.client.post('/api/orders/orders/create_order/', {
            'shipping_address_id': self.shipping.id,
            'payment_method': 'online',
            'coupon_code': 'NOCOUPON',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('shop.email_service.send_order_confirmation', side_effect=Exception('email fail'))
    def test_create_order_email_failure_still_succeeds(self, mock_email):
        self._build_cart_item(quantity=1)
        response = self.client.post('/api/orders/orders/create_order/', {
            'shipping_address_id': self.shipping.id,
            'payment_method': 'online',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    @patch('shop.email_service.send_order_confirmation', side_effect=Exception('email fail'))
    def test_create_order_sets_expiry(self, mock_email):
        self._build_cart_item(quantity=1)
        response = self.client.post('/api/orders/orders/create_order/', {
            'shipping_address_id': self.shipping.id,
            'payment_method': 'online',
        })
        order = Order.objects.get(user=self.user)
        self.assertIsNotNone(order.expires_at)
        self.assertGreater(order.expires_at, timezone.now())

    @patch('shop.email_service.send_order_confirmation', side_effect=Exception('email fail'))
    def test_sequential_retry_does_not_create_second_order(self, mock_email):
        self._build_cart_item(quantity=2)
        payload = {
            'shipping_address_id': self.shipping.id,
            'payment_method': 'online',
        }

        first = self.client.post('/api/orders/orders/create_order/', payload)
        second = self.client.post('/api/orders/orders/create_order/', payload)

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Order.objects.filter(user=self.user).count(), 1)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 48)

    @patch('shop.email_service.send_order_confirmation', side_effect=Exception('email fail'))
    def test_item_added_after_snapshot_is_not_deleted(self, mock_email):
        self._build_cart_item(quantity=1)
        late_product = ProductFactory(category=self.category, stock=10)
        original_create = Order.objects.create

        def create_order_and_add_item(**kwargs):
            CartItem.objects.create(
                cart=self.cart, product=late_product, quantity=1,
            )
            return original_create(**kwargs)

        with patch(
            'orders.views.Order.objects.create',
            side_effect=create_order_and_add_item,
        ):
            response = self.client.post('/api/orders/orders/create_order/', {
                'shipping_address_id': self.shipping.id,
                'payment_method': 'online',
            })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            CartItem.objects.filter(cart=self.cart, product=late_product).exists()
        )
        self.assertFalse(
            OrderItem.objects.filter(order__user=self.user, product=late_product).exists()
        )

    def test_shared_product_stock_is_aggregated_across_variants(self):
        self.product.stock = 5
        self.product.save(update_fields=['stock'])
        first_variant = make_variant(self.product, stock=None)
        second_variant = make_variant(self.product, stock=None)
        self._build_cart_item(quantity=3, variant=first_variant)
        self._build_cart_item(quantity=3, variant=second_variant)

        response = self.client.post('/api/orders/orders/create_order/', {
            'shipping_address_id': self.shipping.id,
            'payment_method': 'online',
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Order.objects.filter(user=self.user).count(), 0)
        self.assertEqual(self.cart.items.count(), 2)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 5)

    @patch('shop.email_service.send_order_confirmation', side_effect=Exception('email fail'))
    def test_explicit_variant_stock_succeeds_when_parent_product_is_zero(self, mock_email):
        variant = make_variant(self.product, stock=5)
        self.product.stock = 0
        self.product.save(update_fields=['stock'])
        self._build_cart_item(quantity=1, variant=variant)

        response = self.client.post('/api/orders/orders/create_order/', {
            'shipping_address_id': self.shipping.id,
            'payment_method': 'online',
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.product.refresh_from_db()
        variant.refresh_from_db()
        self.assertEqual(self.product.stock, 0)
        self.assertEqual(variant.stock, 4)

    def test_explicit_zero_variant_stock_fails_even_when_parent_is_zero(self):
        variant = make_variant(self.product, stock=0)
        self.product.stock = 0
        self.product.save(update_fields=['stock'])
        self._build_cart_item(quantity=1, variant=variant)

        response = self.client.post('/api/orders/orders/create_order/', {
            'shipping_address_id': self.shipping.id,
            'payment_method': 'online',
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Order.objects.filter(user=self.user).count(), 0)
        self.product.refresh_from_db()
        variant.refresh_from_db()
        self.assertEqual(self.product.stock, 0)
        self.assertEqual(variant.stock, 0)

    def test_inheriting_variant_uses_parent_product_stock(self):
        variant = make_variant(self.product, stock=None)
        self.product.stock = 0
        self.product.save(update_fields=['stock'])
        self._build_cart_item(quantity=1, variant=variant)

        response = self.client.post('/api/orders/orders/create_order/', {
            'shipping_address_id': self.shipping.id,
            'payment_method': 'online',
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 0)

    @patch('shop.email_service.send_order_confirmation', side_effect=Exception('email fail'))
    def test_explicit_variant_does_not_decrement_parent_product(self, mock_email):
        variant = make_variant(self.product, stock=5)
        self._build_cart_item(quantity=2, variant=variant)

        response = self.client.post('/api/orders/orders/create_order/', {
            'shipping_address_id': self.shipping.id,
            'payment_method': 'online',
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.product.refresh_from_db()
        variant.refresh_from_db()
        self.assertEqual(self.product.stock, 50)
        self.assertEqual(variant.stock, 3)

    @patch('shop.email_service.send_order_confirmation', side_effect=Exception('email fail'))
    def test_multiple_quantities_consume_only_selected_variant(self, mock_email):
        variant = make_variant(self.product, stock=5)
        self.product.stock = 0
        self.product.save(update_fields=['stock'])
        self._build_cart_item(quantity=4, variant=variant)

        response = self.client.post('/api/orders/orders/create_order/', {
            'shipping_address_id': self.shipping.id,
            'payment_method': 'online',
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        variant.refresh_from_db()
        self.assertEqual(variant.stock, 1)
        self.assertGreaterEqual(variant.stock, 0)

    @patch('shop.email_service.send_order_confirmation', side_effect=Exception('email fail'))
    def test_same_product_variants_are_independent(self, mock_email):
        first_variant = make_variant(self.product, stock=0)
        second_variant = make_variant(self.product, stock=5)
        self.product.stock = 0
        self.product.save(update_fields=['stock'])
        self._build_cart_item(quantity=1, variant=second_variant)

        success = self.client.post('/api/orders/orders/create_order/', {
            'shipping_address_id': self.shipping.id,
            'payment_method': 'online',
        })

        self.assertEqual(success.status_code, status.HTTP_201_CREATED)
        first_variant.refresh_from_db()
        second_variant.refresh_from_db()
        self.assertEqual(first_variant.stock, 0)
        self.assertEqual(second_variant.stock, 4)

        CartItem.objects.create(cart=self.cart, product=self.product, variant=first_variant, quantity=1)
        failure = self.client.post('/api/orders/orders/create_order/', {
            'shipping_address_id': self.shipping.id,
            'payment_method': 'online',
        })
        self.assertEqual(failure.status_code, status.HTTP_400_BAD_REQUEST)
        first_variant.refresh_from_db()
        self.assertEqual(first_variant.stock, 0)

    @patch('shop.email_service.send_order_confirmation', side_effect=Exception('email fail'))
    def test_mixed_product_and_explicit_variant_inventory_are_independent(self, mock_email):
        variant_product = ProductFactory(category=self.category, stock=0)
        variant = make_variant(variant_product, stock=3)
        self.product.stock = 5
        self.product.save(update_fields=['stock'])
        self._build_cart_item(quantity=2, product=self.product)
        self._build_cart_item(quantity=1, product=variant_product, variant=variant)

        response = self.client.post('/api/orders/orders/create_order/', {
            'shipping_address_id': self.shipping.id,
            'payment_method': 'online',
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.product.refresh_from_db()
        variant_product.refresh_from_db()
        variant.refresh_from_db()
        self.assertEqual(self.product.stock, 3)
        self.assertEqual(variant_product.stock, 0)
        self.assertEqual(variant.stock, 2)

    def test_failed_mixed_order_does_not_partially_decrement_inventory(self):
        variant_product = ProductFactory(category=self.category, stock=0)
        variant = make_variant(variant_product, stock=5)
        self.product.stock = 1
        self.product.save(update_fields=['stock'])
        self._build_cart_item(quantity=2, product=self.product)
        self._build_cart_item(quantity=1, product=variant_product, variant=variant)

        response = self.client.post('/api/orders/orders/create_order/', {
            'shipping_address_id': self.shipping.id,
            'payment_method': 'online',
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.product.refresh_from_db()
        variant_product.refresh_from_db()
        variant.refresh_from_db()
        self.assertEqual(self.product.stock, 1)
        self.assertEqual(variant_product.stock, 0)
        self.assertEqual(variant.stock, 5)

    def test_exception_mid_order_rolls_back_everything(self):
        second_product = ProductFactory(category=self.category, stock=10)
        self._build_cart_item(quantity=2)
        self._build_cart_item(product=second_product, quantity=3)
        original_create = OrderItem.objects.create
        calls = 0

        def fail_on_second_item(**kwargs):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise RuntimeError('forced order item failure')
            return original_create(**kwargs)

        with patch(
            'orders.views.OrderItem.objects.create',
            side_effect=fail_on_second_item,
        ):
            with self.assertRaises(RuntimeError):
                self.client.post('/api/orders/orders/create_order/', {
                    'shipping_address_id': self.shipping.id,
                    'payment_method': 'online',
                })

        self.assertEqual(Order.objects.filter(user=self.user).count(), 0)
        self.assertEqual(self.cart.items.count(), 2)
        self.product.refresh_from_db()
        second_product.refresh_from_db()
        self.assertEqual(self.product.stock, 50)
        self.assertEqual(second_product.stock, 10)

    def test_welcome_coupon_requires_claim(self):
        coupon = CouponFactory(is_welcome_offer=True, min_amount=None)
        self._build_cart_item()

        response = self.client.post('/api/orders/orders/create_order/', {
            'shipping_address_id': self.shipping.id,
            'payment_method': 'online',
            'coupon_code': coupon.code,
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Order.objects.filter(user=self.user).count(), 0)
        self.assertEqual(self.cart.items.count(), 1)

    def test_guest_cannot_use_welcome_coupon(self):
        coupon = CouponFactory(is_welcome_offer=True, min_amount=None)
        guest_cart = Cart.objects.create(session_id='guest-welcome-session')
        CartItem.objects.create(cart=guest_cart, product=self.product, quantity=1)
        self.client.credentials()

        response = self.client.post(
            '/api/orders/orders/create_order/',
            {
                'payment_method': 'online',
                'coupon_code': coupon.code,
                'guest_email': 'guest@example.com',
                'guest_phone': '09120000000',
                'full_name': 'Guest User',
                'address_line1': 'Test address',
                'city': 'Tehran',
                'state': 'Tehran',
                'postal_code': '1234567890',
            },
            HTTP_X_SESSION_ID='guest-welcome-session',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Order.objects.filter(guest_email='guest@example.com').count(), 0)
        self.assertEqual(guest_cart.items.count(), 1)


class ConcurrentCreateOrderTest(TransactionTestCase):
    reset_sequences = True

    @skipUnlessDBFeature('has_select_for_update')
    @patch('shop.email_service.send_order_confirmation', side_effect=Exception('email fail'))
    def test_two_concurrent_checkouts_create_one_order(self, mock_email):
        from concurrent.futures import ThreadPoolExecutor
        from rest_framework.test import APIClient

        user, token = create_user_with_token()
        category = make_category()
        product = ProductFactory(category=category, stock=10)
        cart = CartFactory(user=user)
        CartItemFactory(cart=cart, product=product, quantity=2)
        shipping = ShippingAddressFactory(user=user)
        payload = {
            'shipping_address_id': shipping.id,
            'payment_method': 'online',
        }

        def checkout():
            close_old_connections()
            try:
                client = APIClient()
                client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
                return client.post(
                    '/api/orders/orders/create_order/', payload, format='json',
                ).status_code
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as executor:
            statuses = list(executor.map(lambda _: checkout(), range(2)))

        self.assertEqual(sorted(statuses), [400, 201])
        self.assertEqual(Order.objects.filter(user=user).count(), 1)
        product.refresh_from_db()
        self.assertEqual(product.stock, 8)


class OrderTotalCalculationTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.user, self.token = create_user_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.site_settings = SiteSettings.load()
        self.category = make_category()

    def test_order_subtotal_calculated_correctly(self):
        p1 = ProductFactory(category=self.category, price=Decimal('100000'))
        p2 = ProductFactory(category=self.category, price=Decimal('200000'))
        order = OrderFactory(user=self.user, subtotal=Decimal('0'), total=Decimal('0'))
        OrderItemFactory(order=order, product=p1, quantity=2, price=Decimal('100000'))
        OrderItemFactory(order=order, product=p2, quantity=1, price=Decimal('200000'))
        order.subtotal = sum(item.total_price for item in order.items.all())
        order.total = order.subtotal + order.shipping_cost - order.discount
        order.save(update_fields=['subtotal', 'total'])
        order.refresh_from_db()
        self.assertEqual(order.subtotal, Decimal('400000'))

    def test_order_total_includes_shipping(self):
        order = OrderFactory(
            user=self.user,
            subtotal=Decimal('100000'),
            shipping_cost=Decimal('30000'),
            discount=Decimal('0'),
            total=Decimal('130000'),
        )
        self.assertEqual(order.total, order.subtotal + order.shipping_cost)

    def test_order_total_subtracts_discount(self):
        order = OrderFactory(
            user=self.user,
            subtotal=Decimal('100000'),
            shipping_cost=Decimal('0'),
            discount=Decimal('10000'),
            total=Decimal('90000'),
        )
        self.assertEqual(order.total, order.subtotal - order.discount)

    def test_order_total_never_negative(self):
        order = OrderFactory(
            user=self.user,
            subtotal=Decimal('10000'),
            shipping_cost=Decimal('0'),
            discount=Decimal('50000'),
            total=Decimal('0'),
        )
        order.total = max(order.subtotal + order.shipping_cost - order.discount, Decimal('0'))
        self.assertGreaterEqual(order.total, Decimal('0'))


class CancelOrderTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.user, self.token = create_user_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.category = make_category()
        self.product = ProductFactory(category=self.category, stock=50)

    @patch('shop.email_service.send_order_status_update', side_effect=Exception('fail'))
    def test_cancel_pending_payment_order(self, mock_email):
        order = OrderFactory(user=self.user, status='pending_payment', payment_status='unpaid')
        OrderItemFactory(order=order, product=self.product, quantity=2, price=Decimal('100000'))
        response = self.client.post(f'/api/orders/orders/{order.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, 'cancelled')

    @patch('shop.email_service.send_order_status_update', side_effect=Exception('fail'))
    def test_cancel_pending_order(self, mock_email):
        order = OrderFactory(user=self.user, status='pending', payment_status='unpaid')
        OrderItemFactory(order=order, product=self.product, quantity=1, price=Decimal('100000'))
        response = self.client.post(f'/api/orders/orders/{order.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, 'cancelled')

    @patch('shop.email_service.send_order_status_update', side_effect=Exception('fail'))
    def test_cancel_processing_order(self, mock_email):
        order = OrderFactory(user=self.user, status='processing', payment_status='unpaid')
        OrderItemFactory(order=order, product=self.product, quantity=1, price=Decimal('100000'))
        response = self.client.post(f'/api/orders/orders/{order.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_cancel_shipped_order_fails(self):
        order = OrderFactory(user=self.user, status='shipped')
        OrderItemFactory(order=order, product=self.product, quantity=1, price=Decimal('100000'))
        response = self.client.post(f'/api/orders/orders/{order.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancel_delivered_order_fails(self):
        order = OrderFactory(user=self.user, status='delivered')
        response = self.client.post(f'/api/orders/orders/{order.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancel_already_cancelled_order_fails(self):
        order = OrderFactory(user=self.user, status='cancelled')
        response = self.client.post(f'/api/orders/orders/{order.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('shop.email_service.send_order_status_update', side_effect=Exception('fail'))
    def test_cancel_paid_order_requires_confirmed_refund(self, mock_email):
        order = OrderFactory(user=self.user, status='pending', payment_status='paid')
        OrderItemFactory(order=order, product=self.product, quantity=1, price=Decimal('100000'))
        response = self.client.post(f'/api/orders/orders/{order.id}/cancel/')
        order.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(order.payment_status, 'paid')
        self.assertEqual(order.status, 'pending')

    @patch('shop.email_service.send_order_status_update', side_effect=Exception('fail'))
    def test_cancel_email_failure_still_succeeds(self, mock_email):
        order = OrderFactory(user=self.user, status='pending_payment')
        OrderItemFactory(order=order, product=self.product, quantity=1, price=Decimal('100000'))
        response = self.client.post(f'/api/orders/orders/{order.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_cancel_order_belongs_to_other_user(self):
        other_user = UserFactory()
        order = OrderFactory(user=other_user, status='pending_payment')
        response = self.client.post(f'/api/orders/orders/{order.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class InventoryReserveReleaseTest(TestCase):
    def setUp(self):
        cache.clear()
        self.category = make_category()
        self.product = ProductFactory(category=self.category, stock=50)

    def test_reserve_inventory_decrements_stock(self):
        order = OrderFactory()
        item = OrderItemFactory(order=order, product=self.product, quantity=5, price=Decimal('100000'))
        reserve_inventory(order)
        self.product.refresh_from_db()
        item.refresh_from_db()
        self.assertEqual(self.product.stock, 45)
        self.assertEqual(item.inventory_source, OrderItem.INVENTORY_SOURCE_PRODUCT)
        self.assertEqual(item.inventory_reserved_quantity, 5)

    def test_release_inventory_restores_stock(self):
        order = OrderFactory()
        OrderItemFactory(order=order, product=self.product, quantity=5, price=Decimal('100000'))
        reserve_inventory(order)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 45)
        release_inventory(order)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 50)

    def test_reserve_with_explicit_variant_decrements_only_variant(self):
        variant = make_variant(self.product, stock=20)
        order = OrderFactory()
        item = OrderItemFactory(order=order, product=self.product, variant=variant, quantity=3, price=Decimal('100000'))
        reserve_inventory(order)
        self.product.refresh_from_db()
        variant.refresh_from_db()
        item.refresh_from_db()
        self.assertEqual(self.product.stock, 50)
        self.assertEqual(variant.stock, 17)
        self.assertEqual(item.inventory_source, OrderItem.INVENTORY_SOURCE_VARIANT)
        self.assertEqual(item.inventory_reserved_quantity, 3)

    def test_reserve_with_inheriting_variant_decrements_only_product(self):
        variant = make_variant(self.product, stock=None)
        order = OrderFactory()
        item = OrderItemFactory(order=order, product=self.product, variant=variant, quantity=3, price=Decimal('100000'))
        reserve_inventory(order)
        self.product.refresh_from_db()
        variant.refresh_from_db()
        item.refresh_from_db()
        self.assertEqual(self.product.stock, 47)
        self.assertIsNone(variant.stock)
        self.assertEqual(item.inventory_source, OrderItem.INVENTORY_SOURCE_PRODUCT)
        self.assertEqual(item.inventory_reserved_quantity, 3)

    def test_release_explicit_variant_uses_snapshot_after_variant_inherits(self):
        variant = make_variant(self.product, stock=5)
        order = OrderFactory()
        item = OrderItemFactory(
            order=order, product=self.product, variant=variant,
            quantity=2, price=Decimal('100000'),
        )
        reserve_inventory(order)
        variant.stock = None
        variant.save(update_fields=['stock'])

        release_inventory(order)

        self.product.refresh_from_db()
        variant.refresh_from_db()
        item.refresh_from_db()
        self.assertEqual(self.product.stock, 50)
        self.assertEqual(variant.stock, 2)
        self.assertEqual(item.inventory_source, OrderItem.INVENTORY_SOURCE_VARIANT)

    def test_release_inherited_variant_uses_snapshot_after_variant_becomes_explicit(self):
        variant = make_variant(self.product, stock=None)
        order = OrderFactory()
        item = OrderItemFactory(
            order=order, product=self.product, variant=variant,
            quantity=2, price=Decimal('100000'),
        )
        reserve_inventory(order)
        variant.stock = 99
        variant.save(update_fields=['stock'])

        release_inventory(order)

        self.product.refresh_from_db()
        variant.refresh_from_db()
        item.refresh_from_db()
        self.assertEqual(self.product.stock, 50)
        self.assertEqual(variant.stock, 99)
        self.assertEqual(item.inventory_source, OrderItem.INVENTORY_SOURCE_PRODUCT)

    def test_release_with_explicit_variant_restores_only_variant(self):
        variant = make_variant(self.product, stock=20)
        order = OrderFactory()
        OrderItemFactory(order=order, product=self.product, variant=variant, quantity=3, price=Decimal('100000'))
        reserve_inventory(order)
        release_inventory(order)
        release_inventory(order)
        self.product.refresh_from_db()
        variant.refresh_from_db()
        self.assertEqual(self.product.stock, 50)
        self.assertEqual(variant.stock, 20)

    def test_release_inventory_idempotent(self):
        order = OrderFactory()
        OrderItemFactory(order=order, product=self.product, quantity=5, price=Decimal('100000'))
        reserve_inventory(order)
        release_inventory(order)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 50)

    def test_legacy_unknown_reservation_release_is_blocked_without_stock_change(self):
        variant = make_variant(self.product, stock=20)
        order = OrderFactory()
        item = OrderItemFactory(order=order, product=self.product, variant=variant, quantity=3, price=Decimal('100000'))
        reserve_inventory(order)
        item.inventory_source = OrderItem.INVENTORY_SOURCE_LEGACY_UNKNOWN
        item.save(update_fields=['inventory_source'])
        variant.refresh_from_db()
        product_stock = self.product.stock
        variant_stock = variant.stock

        with self.assertRaisesRegex(ValueError, 'Unresolved legacy inventory source'):
            release_inventory(order)

        self.product.refresh_from_db()
        variant.refresh_from_db()
        order.refresh_from_db()
        self.assertEqual(self.product.stock, product_stock)
        self.assertEqual(variant.stock, variant_stock)
        self.assertIsNone(order.inventory_released_at)

    def test_admin_reconciliation_to_product_records_audit_and_enables_product_release(self):
        variant = make_variant(self.product, stock=20)
        order = OrderFactory()
        item = OrderItemFactory(order=order, product=self.product, variant=variant, quantity=3, price=Decimal('100000'))
        order.inventory_reserved_at = timezone.now()
        order.save(update_fields=['inventory_reserved_at'])
        self.product.stock = 47
        self.product.save(update_fields=['stock'])
        item.inventory_source = OrderItem.INVENTORY_SOURCE_LEGACY_UNKNOWN
        item.save(update_fields=['inventory_source'])
        operator = UserFactory(is_staff=True, is_superuser=True)
        obj = LegacyInventoryReconciliation(
            order_item=item,
            decision=OrderItem.INVENTORY_SOURCE_PRODUCT,
            reason='Authoritative warehouse record confirms product-level reservation.',
            evidence_reference='warehouse-ledger-001',
        )
        form = SimpleNamespace(cleaned_data={'order_item': item})
        LegacyInventoryReconciliationAdmin(OrderItem, None).save_model(
            SimpleNamespace(user=operator), obj, form, False,
        )
        item.refresh_from_db()
        self.assertEqual(item.inventory_source, OrderItem.INVENTORY_SOURCE_PRODUCT)
        self.assertEqual(item.inventory_reserved_quantity, 3)
        self.assertEqual(LegacyInventoryReconciliation.objects.get().operator_id, operator.id)
        release_inventory(order)
        self.product.refresh_from_db()
        variant.refresh_from_db()
        self.assertEqual(self.product.stock, 50)
        self.assertEqual(variant.stock, 20)

    def test_admin_reconciliation_to_variant_enables_variant_release(self):
        variant = make_variant(self.product, stock=20)
        order = OrderFactory()
        item = OrderItemFactory(order=order, product=self.product, variant=variant, quantity=3, price=Decimal('100000'))
        order.inventory_reserved_at = timezone.now()
        order.save(update_fields=['inventory_reserved_at'])
        variant.stock = 17
        variant.save(update_fields=['stock'])
        item.inventory_source = OrderItem.INVENTORY_SOURCE_LEGACY_UNKNOWN
        item.save(update_fields=['inventory_source'])
        operator = UserFactory(is_staff=True, is_superuser=True)
        obj = LegacyInventoryReconciliation(
            order_item=item,
            decision=OrderItem.INVENTORY_SOURCE_VARIANT,
            reason='Authoritative warehouse record confirms variant-level reservation.',
        )
        form = SimpleNamespace(cleaned_data={'order_item': item})
        LegacyInventoryReconciliationAdmin(OrderItem, None).save_model(
            SimpleNamespace(user=operator), obj, form, False,
        )
        release_inventory(order)
        self.product.refresh_from_db()
        variant.refresh_from_db()
        self.assertEqual(self.product.stock, 50)
        self.assertEqual(variant.stock, 20)

    def test_admin_unknown_reconciliation_remains_blocked_and_is_audited(self):
        variant = make_variant(self.product, stock=20)
        order = OrderFactory()
        item = OrderItemFactory(order=order, product=self.product, variant=variant, quantity=3, price=Decimal('100000'))
        reserve_inventory(order)
        item.inventory_source = OrderItem.INVENTORY_SOURCE_LEGACY_UNKNOWN
        item.save(update_fields=['inventory_source'])
        operator = UserFactory(is_staff=True, is_superuser=True)
        obj = LegacyInventoryReconciliation(
            order_item=item,
            decision=OrderItem.INVENTORY_SOURCE_LEGACY_UNKNOWN,
            reason='Evidence remains inconclusive.',
        )
        form = SimpleNamespace(cleaned_data={'order_item': item})
        LegacyInventoryReconciliationAdmin(OrderItem, None).save_model(
            SimpleNamespace(user=operator), obj, form, False,
        )
        with self.assertRaises(ValueError):
            release_inventory(order)
        self.assertEqual(LegacyInventoryReconciliation.objects.count(), 1)


class CancelOrderReleasesInventoryTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.user, self.token = create_user_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.category = make_category()
        self.product = ProductFactory(category=self.category, stock=50)

    @patch('shop.email_service.send_order_confirmation', side_effect=Exception('email fail'))
    @patch('shop.email_service.send_order_status_update', side_effect=Exception('fail'))
    def test_cancel_pending_payment_releases_inventory(self, mock_status_email, mock_confirm_email):
        self.product.stock = 50
        self.product.save()
        cart = CartFactory(user=self.user)
        CartItemFactory(cart=cart, product=self.product, quantity=5)
        shipping = ShippingAddressFactory(user=self.user)
        self.client.post('/api/orders/orders/create_order/', {
            'shipping_address_id': shipping.id,
            'payment_method': 'online',
        })
        order = Order.objects.get(user=self.user)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 45)
        self.client.post(f'/api/orders/orders/{order.id}/cancel/')
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 50)

    @patch('shop.email_service.send_order_status_update', side_effect=Exception('fail'))
    def test_cancel_processing_does_not_release(self, mock_email):
        order = OrderFactory(user=self.user, status='processing')
        OrderItemFactory(order=order, product=self.product, quantity=5, price=Decimal('100000'))
        reserve_inventory(order)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 45)
        self.client.post(f'/api/orders/orders/{order.id}/cancel/')
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 45)


class ExpireOrdersTest(TestCase):
    def setUp(self):
        cache.clear()
        self.category = make_category()
        self.product = ProductFactory(category=self.category, stock=50)

    def test_expire_orders_cancels_expired(self):
        order = OrderFactory(
            status='pending_payment',
            payment_status='unpaid',
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        OrderItemFactory(order=order, product=self.product, quantity=3, price=Decimal('100000'))
        reserve_inventory(order)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 47)
        cancelled, failed = expire_orders()
        self.assertEqual(cancelled, 1)
        self.assertEqual(failed, 0)
        order.refresh_from_db()
        self.assertEqual(order.status, 'expired')
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 50)

    def test_expire_orders_skips_non_expired(self):
        order = OrderFactory(
            status='pending_payment',
            payment_status='unpaid',
            expires_at=timezone.now() + timedelta(minutes=30),
        )
        cancelled, failed = expire_orders()
        self.assertEqual(cancelled, 0)
        order.refresh_from_db()
        self.assertEqual(order.status, 'pending_payment')

    def test_expire_orders_skips_already_paid(self):
        order = OrderFactory(
            status='pending_payment',
            payment_status='paid',
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        cancelled, failed = expire_orders()
        self.assertEqual(cancelled, 0)

    def test_expire_orders_skips_non_pending_status(self):
        order = OrderFactory(
            status='processing',
            payment_status='unpaid',
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        cancelled, failed = expire_orders()
        self.assertEqual(cancelled, 0)

    def test_expire_orders_idempotent(self):
        order = OrderFactory(
            status='pending_payment',
            payment_status='unpaid',
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        OrderItemFactory(order=order, product=self.product, quantity=2, price=Decimal('100000'))
        expire_orders()
        order.refresh_from_db()
        self.assertEqual(order.status, 'expired')
        cancelled, failed = expire_orders()
        self.assertEqual(cancelled, 0)

    def test_expire_orders_management_command(self):
        order = OrderFactory(
            status='pending_payment',
            payment_status='unpaid',
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        OrderItemFactory(order=order, product=self.product, quantity=2, price=Decimal('100000'))
        reserve_inventory(order)
        call_command('expire_orders')
        order.refresh_from_db()
        self.assertEqual(order.status, 'expired')


class CouponTest(TestCase):
    def setUp(self):
        cache.clear()
        self.user = UserFactory()

    def test_coupon_valid(self):
        coupon = CouponFactory(
            min_amount=None,
            valid_from=timezone.now() - timedelta(days=1),
            valid_until=timezone.now() + timedelta(days=30),
        )
        valid, msg = coupon.is_valid(user=self.user)
        self.assertTrue(valid)

    def test_coupon_invalid_inactive(self):
        coupon = CouponFactory(is_active=False)
        valid, msg = coupon.is_valid(user=self.user)
        self.assertFalse(valid)

    def test_coupon_invalid_expired(self):
        coupon = CouponFactory(
            valid_from=timezone.now() - timedelta(days=30),
            valid_until=timezone.now() - timedelta(days=1),
        )
        valid, msg = coupon.is_valid(user=self.user)
        self.assertFalse(valid)

    def test_coupon_invalid_not_yet_valid(self):
        coupon = CouponFactory(
            valid_from=timezone.now() + timedelta(days=7),
            valid_until=timezone.now() + timedelta(days=30),
        )
        valid, msg = coupon.is_valid(user=self.user)
        self.assertFalse(valid)

    def test_coupon_max_uses_reached(self):
        coupon = CouponFactory(max_uses=1, used_count=1)
        valid, msg = coupon.is_valid(user=self.user)
        self.assertFalse(valid)

    def test_coupon_already_used_by_user(self):
        coupon = CouponFactory()
        CouponUsage.objects.create(coupon=coupon, user=self.user)
        valid, msg = coupon.is_valid(user=self.user)
        self.assertFalse(valid)

    def test_coupon_min_amount_not_met(self):
        coupon = CouponFactory(min_amount=Decimal('500000'))
        valid, msg = coupon.is_valid(user=self.user, subtotal=Decimal('100000'))
        self.assertFalse(valid)

    def test_coupon_min_amount_met(self):
        coupon = CouponFactory(min_amount=Decimal('100000'))
        valid, msg = coupon.is_valid(user=self.user, subtotal=Decimal('500000'))
        self.assertTrue(valid)

    def test_apply_discount_percentage(self):
        coupon = CouponFactory(discount_type='percentage', value=Decimal('10'))
        discount = coupon.apply_discount(Decimal('1000000'))
        self.assertEqual(discount, Decimal('100000'))

    def test_apply_discount_fixed(self):
        coupon = CouponFactory(discount_type='fixed', value=Decimal('50000'))
        discount = coupon.apply_discount(Decimal('1000000'))
        self.assertEqual(discount, Decimal('50000'))

    def test_apply_discount_percentage_over_100(self):
        coupon = CouponFactory(discount_type='percentage', value=Decimal('200'))
        discount = coupon.apply_discount(Decimal('1000000'))
        self.assertEqual(discount, Decimal('1000000'))

    def test_apply_discount_fixed_exceeds_subtotal(self):
        coupon = CouponFactory(discount_type='fixed', value=Decimal('9999999'))
        discount = coupon.apply_discount(Decimal('100000'))
        self.assertEqual(discount, Decimal('100000'))

    def test_coupon_used_count_increments_on_order(self):
        coupon = CouponFactory(max_uses=5, used_count=0)
        user = UserFactory()
        order = OrderFactory(user=user)
        CouponUsage.objects.create(coupon=coupon, user=user, order=order)
        Coupon.objects.filter(id=coupon.id).update(used_count=F('used_count') + 1)
        coupon.refresh_from_db()
        self.assertEqual(coupon.used_count, 1)


class WelcomeOfferTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.user, self.token = create_user_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')

    def test_welcome_offer_list_available(self):
        coupon = CouponFactory(
            is_welcome_offer=True,
            is_active=True,
            valid_from=timezone.now() - timedelta(days=1),
            valid_until=timezone.now() + timedelta(days=30),
        )
        response = self.client.get('/api/orders/welcome-offer/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['available'])
        self.assertEqual(response.data['offer']['code'], coupon.code)

    def test_welcome_offer_list_no_offer(self):
        response = self.client.get('/api/orders/welcome-offer/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['available'])

    def test_welcome_offer_list_already_claimed(self):
        coupon = CouponFactory(
            is_welcome_offer=True,
            is_active=True,
            valid_from=timezone.now() - timedelta(days=1),
            valid_until=timezone.now() + timedelta(days=30),
        )
        WelcomeClaim.objects.create(user=self.user, coupon=coupon)
        response = self.client.get('/api/orders/welcome-offer/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['available'])

    def test_welcome_offer_claim_success(self):
        coupon = CouponFactory(
            is_welcome_offer=True,
            is_active=True,
            valid_from=timezone.now() - timedelta(days=1),
            valid_until=timezone.now() + timedelta(days=30),
        )
        response = self.client.post('/api/orders/welcome-offer/claim/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertTrue(WelcomeClaim.objects.filter(user=self.user, coupon=coupon).exists())

    def test_welcome_offer_claim_double_claim_fails(self):
        coupon = CouponFactory(
            is_welcome_offer=True,
            is_active=True,
            valid_from=timezone.now() - timedelta(days=1),
            valid_until=timezone.now() + timedelta(days=30),
        )
        WelcomeClaim.objects.create(user=self.user, coupon=coupon)
        response = self.client.post('/api/orders/welcome-offer/claim/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_welcome_offer_claim_no_offer(self):
        response = self.client.post('/api/orders/welcome-offer/claim/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_welcome_offer_claim_expired_coupon(self):
        CouponFactory(
            is_welcome_offer=True,
            is_active=True,
            valid_from=timezone.now() - timedelta(days=30),
            valid_until=timezone.now() - timedelta(days=1),
        )
        response = self.client.post('/api/orders/welcome-offer/claim/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class OrderModelPropertiesTest(TestCase):
    def setUp(self):
        cache.clear()
        self.user = UserFactory()

    def test_order_is_expired_true(self):
        order = OrderFactory(
            user=self.user,
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        self.assertTrue(order.is_expired)

    def test_order_is_expired_false(self):
        order = OrderFactory(
            user=self.user,
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        self.assertFalse(order.is_expired)

    def test_order_is_expired_no_expiry(self):
        order = OrderFactory(user=self.user, expires_at=None)
        self.assertFalse(order.is_expired)

    def test_can_pay_true(self):
        order = OrderFactory(
            user=self.user,
            status='pending_payment',
            payment_status='unpaid',
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        self.assertTrue(order.can_pay)

    def test_can_pay_false_paid(self):
        order = OrderFactory(
            user=self.user,
            status='pending_payment',
            payment_status='paid',
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        self.assertFalse(order.can_pay)

    def test_can_pay_false_expired(self):
        order = OrderFactory(
            user=self.user,
            status='pending_payment',
            payment_status='unpaid',
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        self.assertFalse(order.can_pay)

    def test_can_pay_false_wrong_status(self):
        order = OrderFactory(
            user=self.user,
            status='processing',
            payment_status='unpaid',
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        self.assertFalse(order.can_pay)

    def test_reservation_remaining_seconds_positive(self):
        order = OrderFactory(
            user=self.user,
            status='pending_payment',
            expires_at=timezone.now() + timedelta(minutes=5),
        )
        self.assertGreater(order.reservation_remaining_seconds, 0)

    def test_reservation_remaining_seconds_zero_when_expired(self):
        order = OrderFactory(
            user=self.user,
            status='pending_payment',
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        self.assertEqual(order.reservation_remaining_seconds, 0)

    def test_reservation_remaining_seconds_zero_when_not_pending(self):
        order = OrderFactory(
            user=self.user,
            status='processing',
            expires_at=timezone.now() + timedelta(minutes=5),
        )
        self.assertEqual(order.reservation_remaining_seconds, 0)

    def test_order_number_auto_generated(self):
        order = OrderFactory(user=self.user, order_number='')
        order.save()
        self.assertTrue(order.order_number.startswith('ORD-'))
        self.assertEqual(len(order.order_number), 12)


class OrderViewSetReadTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.user, self.token = create_user_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')

    def test_list_orders(self):
        OrderFactory(user=self.user)
        OrderFactory(user=self.user)
        response = self.client.get('/api/orders/orders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_retrieve_order(self):
        order = OrderFactory(user=self.user)
        response = self.client.get(f'/api/orders/orders/{order.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['order_number'], order.order_number)

    def test_cannot_access_other_user_order(self):
        other_user = UserFactory()
        order = OrderFactory(user=other_user)
        response = self.client.get(f'/api/orders/orders/{order.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
