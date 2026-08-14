from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from orders.models import Order
from products.models import Product
from shop.tests import CartFactory, CartItemFactory, ProductFactory, ShippingAddressFactory, create_user_with_token

from .models import (
    LoyaltyAccount, LoyaltyEventType, LoyaltyRedemption, LoyaltyRedemptionRule,
    LoyaltyTransaction,
)
from .services import (
    InsufficientLoyaltyPoints, REDEMPTION_EVENT_CODE, RedemptionError,
    redeem_loyalty_reward, record_loyalty_transaction,
    redemption_discount_and_shipping, release_redemption_for_order,
    reserve_redemption_for_order,
)


User = get_user_model()


class LoyaltyRedemptionTests(TestCase):
    def setUp(self):
        self.user, self.token = create_user_with_token(username='redemption-user')
        self.event_type, _ = LoyaltyEventType.objects.get_or_create(
            code='redemption', defaults={'name': 'Redemption'},
        )
        record_loyalty_transaction(
            user=self.user, event_type=self.event_type, points_delta=100,
            idempotency_key='redemption-test-credit',
        )

    def rule(self, **kwargs):
        values = {
            'code': f"reward-{LoyaltyRedemptionRule.objects.count()}",
            'name': 'Test reward',
            'reward_type': LoyaltyRedemptionRule.REWARD_DISCOUNT,
            'points_required': 25,
            'discount_type': LoyaltyRedemptionRule.DISCOUNT_FIXED,
            'discount_value': Decimal('50000'),
        }
        values.update(kwargs)
        return LoyaltyRedemptionRule.objects.create(**values)

    def test_discount_redemption_creates_negative_ledger_and_deducts_exact_points(self):
        rule = self.rule()
        redemption = redeem_loyalty_reward(user=self.user, rule_id=rule.id, idempotency_key='redeem-1')

        self.assertEqual(redemption.status, LoyaltyRedemption.STATUS_AVAILABLE)
        self.assertEqual(redemption.discount_value, Decimal('50000.00'))
        transaction = redemption.ledger_transaction
        self.assertEqual(transaction.points_delta, -25)
        self.assertEqual(transaction.entry_type, LoyaltyTransaction.ENTRY_REDEMPTION)
        self.assertEqual(LoyaltyAccount.objects.get(user=self.user).available_points, 75)

    def test_free_shipping_redemption(self):
        rule = self.rule(
            code='free-shipping-reward', reward_type=LoyaltyRedemptionRule.REWARD_FREE_SHIPPING,
            discount_type=None, discount_value=0, points_required=30,
        )
        redemption = redeem_loyalty_reward(user=self.user, rule_id=rule.id, idempotency_key='redeem-free')
        discount, shipping = redemption_discount_and_shipping(
            redemption, subtotal=Decimal('100000'), shipping_cost=Decimal('30000'),
        )
        self.assertEqual(discount, Decimal('0'))
        self.assertEqual(shipping, Decimal('0'))

    def test_insufficient_inactive_and_out_of_date_rules_fail_without_mutation(self):
        expensive = self.rule(code='expensive', points_required=101)
        with self.assertRaises(InsufficientLoyaltyPoints):
            redeem_loyalty_reward(user=self.user, rule_id=expensive.id, idempotency_key='too-many')
        inactive = self.rule(code='inactive', is_active=False)
        with self.assertRaises(RedemptionError):
            redeem_loyalty_reward(user=self.user, rule_id=inactive.id, idempotency_key='inactive-request')
        future = self.rule(code='future', starts_at=timezone.now() + timedelta(days=1))
        with self.assertRaises(RedemptionError):
            redeem_loyalty_reward(user=self.user, rule_id=future.id, idempotency_key='future-request')
        self.assertEqual(LoyaltyAccount.objects.get(user=self.user).available_points, 100)
        self.assertEqual(LoyaltyRedemption.objects.count(), 0)

    def test_duplicate_request_is_idempotent(self):
        rule = self.rule(points_required=20)
        first = redeem_loyalty_reward(user=self.user, rule_id=rule.id, idempotency_key='same-request')
        second = redeem_loyalty_reward(user=self.user, rule_id=rule.id, idempotency_key='same-request')
        self.assertEqual(first.id, second.id)
        self.assertEqual(LoyaltyRedemption.objects.filter(user=self.user).count(), 1)
        self.assertEqual(LoyaltyTransaction.objects.filter(user=self.user, entry_type='redemption').count(), 1)
        self.assertEqual(LoyaltyAccount.objects.get(user=self.user).available_points, 80)

    def test_checkout_reservation_and_failed_checkout_restore_points(self):
        rule = self.rule(points_required=15)
        redemption = redeem_loyalty_reward(user=self.user, rule_id=rule.id, idempotency_key='restore-me')
        order = Order.objects.create(user=self.user, status='pending_payment', payment_status='unpaid', total=Decimal('150000'))
        reserve_redemption_for_order(
            redemption_code=redemption.redemption_code, user=self.user, order=order,
            subtotal=Decimal('150000'), shipping_cost=Decimal('30000'),
        )
        self.assertEqual(LoyaltyRedemption.objects.get(pk=redemption.pk).status, LoyaltyRedemption.STATUS_RESERVED)
        release_redemption_for_order(order=order)
        redemption.refresh_from_db()
        self.assertEqual(redemption.status, LoyaltyRedemption.STATUS_AVAILABLE)
        self.assertEqual(LoyaltyAccount.objects.get(user=self.user).available_points, 100)
        self.assertEqual(LoyaltyTransaction.objects.filter(user=self.user, entry_type='reversal').count(), 1)

    def test_api_lists_rewards_history_and_requires_idempotency(self):
        rule = self.rule(points_required=10)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        listing = client.get('/api/loyalty/rewards/')
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.data['available_points'], 100)
        redemption = client.post('/api/loyalty/rewards/redeem/', {'rule_id': rule.id, 'idempotency_key': 'api-redeem'})
        self.assertEqual(redemption.status_code, 200)
        self.assertIn('redemption_code', redemption.data)
        history = client.get('/api/loyalty/redemptions/')
        self.assertEqual(history.status_code, 200)
        self.assertEqual(len(history.data), 1)

    def test_existing_checkout_applies_discount_redemption_once(self):
        rule = self.rule(code='checkout-discount', points_required=10, discount_value=Decimal('20000'))
        redemption = redeem_loyalty_reward(user=self.user, rule_id=rule.id, idempotency_key='checkout-use')
        product = ProductFactory(price=Decimal('100000'), stock=10, is_active=True)
        cart = CartFactory(user=self.user)
        CartItemFactory(cart=cart, product=product, quantity=1)
        shipping = ShippingAddressFactory(user=self.user)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')

        response = client.post('/api/orders/orders/create_order/', {
            'shipping_address_id': shipping.id,
            'payment_method': 'online',
            'loyalty_redemption_code': redemption.redemption_code,
        })

        self.assertEqual(response.status_code, 201)
        order = Order.objects.get(user=self.user)
        self.assertEqual(order.discount, Decimal('20000.00'))
        redemption.refresh_from_db()
        self.assertEqual(redemption.status, LoyaltyRedemption.STATUS_RESERVED)
