from django.test import TestCase, TransactionTestCase, skipUnlessDBFeature
from django.db import IntegrityError, close_old_connections
from django.core.cache import cache
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch, MagicMock
from shop.tests import (
    UserFactory, ProductFactory, CartFactory, CartItemFactory,
    OrderFactory, OrderItemFactory, ShippingAddressFactory,
    CouponFactory, PaymentFactory, CategoryFactory, SizeFactory,
    ColorFactory, ProductVariantFactory, create_user_with_token,
    create_order_with_items, create_product_with_variant,
    AdminUserFactory, AdminProfileFactory, create_admin_with_token,
)
from cart.models import Cart, CartItem
from cart.services import merge_guest_cart_into_user_cart
from orders.models import Coupon
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


class CartGetOrCreateTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.user, self.token = create_user_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')

    def test_get_empty_cart_auto_created(self):
        response = self.client.get('/api/cart/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_items'], 0)
        self.assertTrue(Cart.objects.filter(user=self.user).exists())

    def test_get_existing_cart(self):
        cart = CartFactory(user=self.user)
        response = self.client.get('/api/cart/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], cart.id)

    def test_unauthenticated_user_gets_guest_cart(self):
        # Guest carts are supported: anonymous requests get a session-based
        # cart and the session id is returned via the X-Session-ID header.
        self.client.credentials()
        response = self.client.get('/api/cart/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_items'], 0)
        self.assertTrue(response.headers.get('X-Session-ID'))


class CartAddItemTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.user, self.token = create_user_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.category = make_category()
        self.product = ProductFactory(category=self.category, stock=10, price=Decimal('100000'))

    def test_add_item_valid(self):
        response = self.client.post('/api/cart/add_item/', {
            'product_id': self.product.id,
            'quantity': 2,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['total_items'], 2)
        cart_item = CartItem.objects.get(cart__user=self.user, product=self.product)
        self.assertEqual(cart_item.quantity, 2)

    def test_add_item_with_variant(self):
        variant = make_variant(self.product, stock=5)
        response = self.client.post('/api/cart/add_item/', {
            'product_id': self.product.id,
            'variant_id': variant.id,
            'quantity': 1,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        cart_item = CartItem.objects.get(cart__user=self.user, product=self.product, variant=variant)
        self.assertEqual(cart_item.quantity, 1)

    def test_add_item_invalid_product(self):
        response = self.client.post('/api/cart/add_item/', {
            'product_id': 99999,
            'quantity': 1,
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_add_item_inactive_product(self):
        self.product.is_active = False
        self.product.save()
        response = self.client.post('/api/cart/add_item/', {
            'product_id': self.product.id,
            'quantity': 1,
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_add_item_out_of_stock(self):
        self.product.stock = 0
        self.product.save()
        response = self.client.post('/api/cart/add_item/', {
            'product_id': self.product.id,
            'quantity': 1,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_item_exceeds_stock(self):
        response = self.client.post('/api/cart/add_item/', {
            'product_id': self.product.id,
            'quantity': 20,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_item_invalid_quantity_zero(self):
        response = self.client.post('/api/cart/add_item/', {
            'product_id': self.product.id,
            'quantity': 0,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_item_invalid_quantity_negative(self):
        response = self.client.post('/api/cart/add_item/', {
            'product_id': self.product.id,
            'quantity': -1,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_item_missing_product_id(self):
        response = self.client.post('/api/cart/add_item/', {
            'quantity': 1,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_item_increments_quantity(self):
        self.client.post('/api/cart/add_item/', {
            'product_id': self.product.id,
            'quantity': 2,
        })
        response = self.client.post('/api/cart/add_item/', {
            'product_id': self.product.id,
            'quantity': 3,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        cart_item = CartItem.objects.get(cart__user=self.user, product=self.product)
        self.assertEqual(cart_item.quantity, 5)
        self.assertEqual(CartItem.objects.filter(cart__user=self.user).count(), 1)

    def test_duplicate_item_exceeds_stock(self):
        self.client.post('/api/cart/add_item/', {
            'product_id': self.product.id,
            'quantity': 8,
        })
        response = self.client.post('/api/cart/add_item/', {
            'product_id': self.product.id,
            'quantity': 5,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_item_variant_not_found(self):
        response = self.client.post('/api/cart/add_item/', {
            'product_id': self.product.id,
            'variant_id': 99999,
            'quantity': 1,
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_add_item_variant_stock_exceeded(self):
        variant = make_variant(self.product, stock=3)
        response = self.client.post('/api/cart/add_item/', {
            'product_id': self.product.id,
            'variant_id': variant.id,
            'quantity': 5,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class CartUpdateItemTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.user, self.token = create_user_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.cart = CartFactory(user=self.user)
        self.category = make_category()
        self.product = ProductFactory(category=self.category, stock=10)
        self.cart_item = CartItemFactory(cart=self.cart, product=self.product, quantity=2)

    def test_update_item_valid(self):
        response = self.client.patch('/api/cart/update_item/', {
            'item_id': self.cart_item.id,
            'quantity': 5,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.cart_item.refresh_from_db()
        self.assertEqual(self.cart_item.quantity, 5)

    def test_update_item_invalid_quantity_zero(self):
        response = self.client.patch('/api/cart/update_item/', {
            'item_id': self.cart_item.id,
            'quantity': 0,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_item_invalid_quantity_negative(self):
        response = self.client.patch('/api/cart/update_item/', {
            'item_id': self.cart_item.id,
            'quantity': -1,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_item_exceeds_stock(self):
        response = self.client.patch('/api/cart/update_item/', {
            'item_id': self.cart_item.id,
            'quantity': 20,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_item_nonexistent(self):
        response = self.client.patch('/api/cart/update_item/', {
            'item_id': 99999,
            'quantity': 1,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_item_missing_item_id(self):
        response = self.client.patch('/api/cart/update_item/', {
            'quantity': 1,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_item_variant_stock_exceeded(self):
        variant = make_variant(self.product, stock=3)
        cart_item = CartItemFactory(cart=self.cart, product=self.product, variant=variant, quantity=1)
        response = self.client.patch('/api/cart/update_item/', {
            'item_id': cart_item.id,
            'quantity': 10,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class CartRemoveItemTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.user, self.token = create_user_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.cart = CartFactory(user=self.user)
        self.category = make_category()
        self.product = ProductFactory(category=self.category)
        self.cart_item = CartItemFactory(cart=self.cart, product=self.product)

    def test_remove_item_valid(self):
        response = self.client.delete(f'/api/cart/remove_item/?item_id={self.cart_item.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(CartItem.objects.filter(id=self.cart_item.id).exists())

    def test_remove_item_nonexistent(self):
        response = self.client.delete('/api/cart/remove_item/?item_id=99999')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_remove_item_missing_id(self):
        response = self.client.delete('/api/cart/remove_item/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_remove_item_via_body(self):
        response = self.client.delete('/api/cart/remove_item/', {'item_id': self.cart_item.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(CartItem.objects.filter(id=self.cart_item.id).exists())


class CartClearTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.user, self.token = create_user_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.cart = CartFactory(user=self.user)
        self.category = make_category()
        self.product1 = ProductFactory(category=self.category)
        self.product2 = ProductFactory(category=self.category)
        CartItemFactory(cart=self.cart, product=self.product1, quantity=3)
        CartItemFactory(cart=self.cart, product=self.product2, quantity=2)

    def test_clear_cart(self):
        response = self.client.delete('/api/cart/clear/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(CartItem.objects.filter(cart=self.cart).count(), 0)
        self.assertEqual(response.data['total_items'], 0)

    def test_clear_empty_cart(self):
        self.cart.items.all().delete()
        response = self.client.delete('/api/cart/clear/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_items'], 0)


class CartApplyCouponTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.user, self.token = create_user_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.cart = CartFactory(user=self.user)
        self.category = make_category()
        self.product = ProductFactory(category=self.category, price=Decimal('500000'))
        CartItemFactory(cart=self.cart, product=self.product, quantity=1)

    @patch('accounts.throttles.CouponThrottle.allow_request', return_value=True)
    def test_apply_coupon_valid_percentage(self, mock_throttle):
        coupon = CouponFactory(
            code='SAVE10',
            discount_type='percentage',
            value=Decimal('10'),
            min_amount=None,
        )
        response = self.client.post('/api/cart/apply_coupon/', {'code': 'SAVE10'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['valid'])
        self.assertEqual(Decimal(response.data['discount_amount']), Decimal('50000'))

    @patch('accounts.throttles.CouponThrottle.allow_request', return_value=True)
    def test_apply_coupon_valid_fixed(self, mock_throttle):
        coupon = CouponFactory(
            code='FLAT50K',
            discount_type='fixed',
            value=Decimal('50000'),
            min_amount=None,
        )
        response = self.client.post('/api/cart/apply_coupon/', {'code': 'FLAT50K'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['valid'])
        self.assertEqual(Decimal(response.data['discount_amount']), Decimal('50000'))

    @patch('accounts.throttles.CouponThrottle.allow_request', return_value=True)
    def test_apply_coupon_invalid_code(self, mock_throttle):
        response = self.client.post('/api/cart/apply_coupon/', {'code': 'INVALID'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch('accounts.throttles.CouponThrottle.allow_request', return_value=True)
    def test_apply_coupon_expired(self, mock_throttle):
        CouponFactory(
            code='EXPIRED',
            is_active=True,
            valid_from=timezone.now() - timedelta(days=30),
            valid_until=timezone.now() - timedelta(days=1),
        )
        response = self.client.post('/api/cart/apply_coupon/', {'code': 'EXPIRED'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('accounts.throttles.CouponThrottle.allow_request', return_value=True)
    def test_apply_coupon_inactive(self, mock_throttle):
        CouponFactory(code='INACTIVE', is_active=False)
        response = self.client.post('/api/cart/apply_coupon/', {'code': 'INACTIVE'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch('accounts.throttles.CouponThrottle.allow_request', return_value=True)
    def test_apply_coupon_min_amount_not_met(self, mock_throttle):
        CouponFactory(
            code='MINAMOUNT',
            discount_type='percentage',
            value=Decimal('10'),
            min_amount=Decimal('1000000'),
        )
        response = self.client.post('/api/cart/apply_coupon/', {'code': 'MINAMOUNT'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('accounts.throttles.CouponThrottle.allow_request', return_value=True)
    def test_apply_coupon_empty_code(self, mock_throttle):
        response = self.client.post('/api/cart/apply_coupon/', {'code': ''})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('accounts.throttles.CouponThrottle.allow_request', return_value=True)
    def test_apply_coupon_max_uses_reached(self, mock_throttle):
        coupon = CouponFactory(
            code='MAXEDOUT',
            max_uses=2,
            used_count=2,
            min_amount=None,
        )
        response = self.client.post('/api/cart/apply_coupon/', {'code': 'MAXEDOUT'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('accounts.throttles.CouponThrottle.allow_request', return_value=True)
    def test_apply_coupon_already_used_by_user(self, mock_throttle):
        from orders.models import CouponUsage
        coupon = CouponFactory(
            code='USED',
            min_amount=None,
        )
        CouponUsage.objects.create(coupon=coupon, user=self.user)
        response = self.client.post('/api/cart/apply_coupon/', {'code': 'USED'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('accounts.throttles.CouponThrottle.allow_request', return_value=True)
    def test_apply_coupon_percentage_over_100_caps_at_subtotal(self, mock_throttle):
        coupon = CouponFactory(
            code='OVER100',
            discount_type='percentage',
            value=Decimal('200'),
            min_amount=None,
        )
        response = self.client.post('/api/cart/apply_coupon/', {'code': 'OVER100'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data['discount_amount']), Decimal('500000'))

    @patch('accounts.throttles.CouponThrottle.allow_request', return_value=True)
    def test_apply_coupon_fixed_larger_than_subtotal(self, mock_throttle):
        coupon = CouponFactory(
            code='BIGFIXED',
            discount_type='fixed',
            value=Decimal('999999'),
            min_amount=None,
        )
        response = self.client.post('/api/cart/apply_coupon/', {'code': 'BIGFIXED'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data['discount_amount']), Decimal('500000'))


class CartTotalCalculationTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.user, self.token = create_user_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.cart = CartFactory(user=self.user)

    def test_cart_total_price_empty(self):
        response = self.client.get('/api/cart/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_items'], 0)

    def test_cart_total_price_with_items(self):
        self.category = make_category()
        p1 = ProductFactory(category=self.category, price=Decimal('100000'))
        p2 = ProductFactory(category=self.category, price=Decimal('200000'))
        CartItemFactory(cart=self.cart, product=p1, quantity=2)
        CartItemFactory(cart=self.cart, product=p2, quantity=1)
        response = self.client.get('/api/cart/')
        self.assertEqual(Decimal(response.data['total_price']), Decimal('400000'))
        self.assertEqual(response.data['total_items'], 3)

    def test_cart_item_total_price_with_variant(self):
        self.category = make_category()
        product = ProductFactory(category=self.category, price=Decimal('100000'))
        variant = make_variant(product, price_adjustment=Decimal('20000'))
        CartItemFactory(cart=self.cart, product=product, variant=variant, quantity=2)
        response = self.client.get('/api/cart/')
        item_total = Decimal('120000') * 2
        self.assertEqual(Decimal(response.data['total_price']), item_total)

    def test_cart_item_total_price_without_variant(self):
        self.category = make_category()
        product = ProductFactory(category=self.category, price=Decimal('150000'))
        CartItemFactory(cart=self.cart, product=product, quantity=3)
        response = self.client.get('/api/cart/')
        self.assertEqual(Decimal(response.data['total_price']), Decimal('450000'))
        self.assertEqual(response.data['total_items'], 3)


class CartItemUniqueTogetherTest(TestCase):
    def setUp(self):
        cache.clear()
        self.user = UserFactory()
        self.cart = CartFactory(user=self.user)
        self.category = make_category()
        self.product = ProductFactory(category=self.category)

    def test_duplicate_product_variant_get_or_create_increments(self):
        item1, created1 = CartItem.objects.get_or_create(
            cart=self.cart, product=self.product, variant=None, defaults={'quantity': 1}
        )
        item2, created2 = CartItem.objects.get_or_create(
            cart=self.cart, product=self.product, variant=None, defaults={'quantity': 1}
        )
        self.assertFalse(created2)
        item2.quantity += 1
        item2.save(update_fields=['quantity'])
        item1.refresh_from_db()
        self.assertEqual(item1.quantity, 2)
        self.assertEqual(CartItem.objects.filter(cart=self.cart).count(), 1)

    def test_same_product_different_variants_allowed(self):
        variant1 = make_variant(self.product)
        variant2 = make_variant(self.product)
        CartItem.objects.create(cart=self.cart, product=self.product, variant=variant1, quantity=1)
        CartItem.objects.create(cart=self.cart, product=self.product, variant=variant2, quantity=1)
        self.assertEqual(CartItem.objects.filter(cart=self.cart).count(), 2)

    def test_different_users_same_product_allowed(self):
        user2 = UserFactory()
        cart2 = CartFactory(user=user2)
        CartItem.objects.create(cart=self.cart, product=self.product, variant=None, quantity=1)
        CartItem.objects.create(cart=cart2, product=self.product, variant=None, quantity=1)
        self.assertEqual(CartItem.objects.filter(product=self.product).count(), 2)

    def test_duplicate_product_without_variant_is_rejected_by_database(self):
        CartItem.objects.create(
            cart=self.cart, product=self.product, variant=None, quantity=1,
        )
        with self.assertRaises(IntegrityError):
            CartItem.objects.create(
                cart=self.cart, product=self.product, variant=None, quantity=1,
            )


class GuestCartMergeTest(TestCase):
    def setUp(self):
        cache.clear()
        self.user = UserFactory()
        self.category = make_category()

    def guest_cart(self, session_id='merge-session'):
        return Cart.objects.create(session_id=session_id)

    def test_guest_cart_without_existing_user_cart(self):
        product = ProductFactory(category=self.category, stock=10)
        guest = self.guest_cart()
        CartItem.objects.create(cart=guest, product=product, quantity=3)

        cart = merge_guest_cart_into_user_cart(self.user, 'merge-session')

        self.assertEqual(cart.items.get(product=product).quantity, 3)
        self.assertFalse(Cart.objects.filter(pk=guest.pk).exists())

    def test_shared_product_quantities_are_combined(self):
        product = ProductFactory(category=self.category, stock=10)
        user_cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=user_cart, product=product, quantity=2)
        guest = self.guest_cart()
        CartItem.objects.create(cart=guest, product=product, quantity=3)

        merge_guest_cart_into_user_cart(self.user, 'merge-session')

        self.assertEqual(user_cart.items.get(product=product).quantity, 5)

    def test_shared_variant_quantities_are_combined(self):
        product = ProductFactory(category=self.category, stock=20)
        variant = make_variant(product, stock=8)
        user_cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(
            cart=user_cart, product=product, variant=variant, quantity=2,
        )
        guest = self.guest_cart()
        CartItem.objects.create(
            cart=guest, product=product, variant=variant, quantity=3,
        )

        merge_guest_cart_into_user_cart(self.user, 'merge-session')

        self.assertEqual(
            user_cart.items.get(product=product, variant=variant).quantity, 5,
        )

    def test_quantity_is_capped_at_current_stock(self):
        product = ProductFactory(category=self.category, stock=4)
        user_cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=user_cart, product=product, quantity=3)
        guest = self.guest_cart()
        CartItem.objects.create(cart=guest, product=product, quantity=3)

        merge_guest_cart_into_user_cart(self.user, 'merge-session')

        self.assertEqual(user_cart.items.get(product=product).quantity, 4)

    def test_out_of_stock_guest_item_is_dropped_without_zero_quantity(self):
        product = ProductFactory(category=self.category, stock=0)
        guest = self.guest_cart()
        CartItem.objects.create(cart=guest, product=product, quantity=2)

        cart = merge_guest_cart_into_user_cart(self.user, 'merge-session')

        self.assertFalse(cart.items.filter(product=product).exists())
        self.assertFalse(CartItem.objects.filter(quantity__lte=0).exists())
        self.assertFalse(Cart.objects.filter(pk=guest.pk).exists())

    def test_multiple_guest_products_are_merged(self):
        products = [
            ProductFactory(category=self.category, stock=10),
            ProductFactory(category=self.category, stock=10),
            ProductFactory(category=self.category, stock=10),
        ]
        guest = self.guest_cart()
        for product in products:
            CartItem.objects.create(cart=guest, product=product, quantity=2)

        cart = merge_guest_cart_into_user_cart(self.user, 'merge-session')

        self.assertEqual(cart.items.count(), 3)
        self.assertEqual(cart.total_items, 6)

    def test_exception_rolls_back_entire_merge_and_preserves_guest_cart(self):
        existing_product = ProductFactory(category=self.category, stock=10)
        new_product = ProductFactory(category=self.category, stock=10)
        user_cart = Cart.objects.create(user=self.user)
        existing = CartItem.objects.create(
            cart=user_cart, product=existing_product, quantity=1,
        )
        guest = self.guest_cart()
        CartItem.objects.create(cart=guest, product=existing_product, quantity=2)
        CartItem.objects.create(cart=guest, product=new_product, quantity=2)

        with patch('cart.services.CartItem.objects.create', side_effect=RuntimeError('boom')):
            with self.assertRaises(RuntimeError):
                merge_guest_cart_into_user_cart(self.user, 'merge-session')

        existing.refresh_from_db()
        self.assertEqual(existing.quantity, 1)
        self.assertTrue(Cart.objects.filter(pk=guest.pk).exists())
        self.assertEqual(guest.items.count(), 2)

    def test_second_merge_is_noop(self):
        product = ProductFactory(category=self.category, stock=10)
        guest = self.guest_cart()
        CartItem.objects.create(cart=guest, product=product, quantity=3)

        cart = merge_guest_cart_into_user_cart(self.user, 'merge-session')
        second_result = merge_guest_cart_into_user_cart(self.user, 'merge-session')

        self.assertIsNone(second_result)
        self.assertEqual(cart.items.get(product=product).quantity, 3)


class ConcurrentGuestCartMergeTest(TransactionTestCase):
    reset_sequences = True

    @skipUnlessDBFeature('has_select_for_update')
    def test_two_concurrent_merges_apply_guest_quantity_once(self):
        from concurrent.futures import ThreadPoolExecutor

        user = UserFactory()
        category = make_category()
        product = ProductFactory(category=category, stock=20)
        guest = Cart.objects.create(session_id='concurrent-session')
        CartItem.objects.create(cart=guest, product=product, quantity=4)

        def merge():
            close_old_connections()
            try:
                current_user = type(user).objects.get(pk=user.pk)
                merge_guest_cart_into_user_cart(current_user, 'concurrent-session')
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as executor:
            list(executor.map(lambda _: merge(), range(2)))

        item = CartItem.objects.get(cart__user=user, product=product)
        self.assertEqual(item.quantity, 4)
        self.assertFalse(Cart.objects.filter(pk=guest.pk).exists())
