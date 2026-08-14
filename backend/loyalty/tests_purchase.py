from datetime import timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.utils import timezone

from orders.models import Order
from payments.models import Payment
from shop.tests import OrderFactory, PaymentFactory, ProductFactory

from .models import (
    LoyaltyAccount,
    LoyaltyEventType,
    LoyaltyRule,
    LoyaltyTransaction,
    PurchaseRewardTier,
    ReferralAttribution,
)
from .services import (
    PURCHASE_EVENT_CODE,
    REFERRAL_PURCHASE_EVENT_CODE,
    award_purchase_rewards_for_order,
    create_referral_attribution,
)


User = get_user_model()


class PurchaseRewardTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='purchase-buyer', password='safe-password-123')
        self.purchase_event, _ = LoyaltyEventType.objects.get_or_create(code=PURCHASE_EVENT_CODE, defaults={'name': 'Purchase'})
        self.purchase_rule = LoyaltyRule.objects.create(
            code='purchase-rule', event_type=self.purchase_event, name='Purchase rule', points=1,
        )
        self.product = ProductFactory()

    def tier(self, name, minimum, maximum, points, priority=0, **kwargs):
        return PurchaseRewardTier.objects.create(
            rule=self.purchase_rule, name=name, minimum_order_total=Decimal(str(minimum)),
            maximum_order_total=Decimal(str(maximum)) if maximum is not None else None,
            points=points, priority=priority, **kwargs,
        )

    def paid_order(self, total, *, user=None):
        user = user or self.user
        order = OrderFactory(user=user, total=Decimal(str(total)), subtotal=Decimal(str(total)), status='pending', payment_status='paid')
        payment = PaymentFactory(order=order, user=user, amount=Decimal(str(total)), status='success')
        return order, payment

    def test_successful_purchase_uses_configured_tier_and_snapshots_amount(self):
        tier = self.tier('Tier', 100, 200, 7)
        order, payment = self.paid_order(150)

        result = award_purchase_rewards_for_order(order=order, payment=payment)

        transaction = result[0]
        self.assertEqual(transaction.points_delta, 7)
        self.assertEqual(transaction.rule_id, self.purchase_rule.id)
        self.assertEqual(transaction.purchase_tier_id, tier.id)
        self.assertEqual(transaction.order_id, order.id)
        self.assertEqual(transaction.qualifying_order_amount, Decimal('150.00'))
        self.assertEqual(transaction.metadata['order_total_snapshot'], '150.00')

    def test_boundaries_and_priority_are_deterministic(self):
        low = self.tier('Low', 1, 100, 1, priority=10)
        high = self.tier('High', 100, None, 9, priority=20)
        for total, expected in ((Decimal('1'), low), (Decimal('99.99'), low), (Decimal('100'), high), (Decimal('100.01'), high)):
            order, payment = self.paid_order(total)
            tx = award_purchase_rewards_for_order(order=order, payment=payment)[0]
            self.assertEqual(tx.purchase_tier_id, expected.id)

    def test_inactive_future_and_expired_tiers_do_not_award(self):
        self.tier('Inactive', 0, None, 5, is_active=False)
        order, payment = self.paid_order(50)
        self.assertEqual(award_purchase_rewards_for_order(order=order, payment=payment), [])

        future = self.tier('Future', 0, None, 5, priority=1, starts_at=timezone.now() + timedelta(days=1))
        order, payment = self.paid_order(60)
        self.assertEqual(award_purchase_rewards_for_order(order=order, payment=payment), [])
        future.starts_at = timezone.now() - timedelta(days=2)
        future.ends_at = timezone.now() - timedelta(days=1)
        future.save(update_fields=['starts_at', 'ends_at'])
        order, payment = self.paid_order(70)
        self.assertEqual(award_purchase_rewards_for_order(order=order, payment=payment), [])

    def test_unpaid_failed_and_zero_value_orders_do_not_award(self):
        self.tier('Any', 0, None, 3)
        for payment_status, payment_state in (('unpaid', 'success'), ('paid', 'failed')):
            order = OrderFactory(user=self.user, total=Decimal('50'), subtotal=Decimal('50'), payment_status=payment_status)
            payment = PaymentFactory(order=order, user=self.user, amount=Decimal('50'), status=payment_state)
            self.assertEqual(award_purchase_rewards_for_order(order=order, payment=payment), [])
        order, payment = self.paid_order(0)
        self.assertEqual(award_purchase_rewards_for_order(order=order, payment=payment), [])

    def test_duplicate_and_repeated_successful_transition_are_idempotent(self):
        self.tier('Any', 0, None, 3)
        order, payment = self.paid_order(50)
        first = award_purchase_rewards_for_order(order=order, payment=payment)
        second = award_purchase_rewards_for_order(order=order, payment=payment)
        self.assertEqual(len(first), 1)
        self.assertEqual(second[0].id, first[0].id)
        self.assertEqual(LoyaltyTransaction.objects.filter(order=order, event_type=self.purchase_event).count(), 1)
        self.assertEqual(LoyaltyAccount.objects.get(user=self.user).available_points, 3)

    @patch('payments.views.FRONTEND_URL', 'http://localhost:3000')
    @patch('payments.views.requests.post')
    def test_payment_verification_is_the_reward_trigger(self, mock_post):
        self.tier('Any', 0, None, 4)
        order = OrderFactory(user=self.user, total=Decimal('50'), subtotal=Decimal('50'), status='pending_payment', payment_status='unpaid')
        payment = PaymentFactory(order=order, user=self.user, amount=Decimal('50'), status='processing', authority='PURCHASE-AUTH')
        mock_post.return_value = MagicMock(json=MagicMock(return_value={'data': {'code': 100, 'ref_id': 'PURCHASE-REF'}, 'errors': {}}), status_code=200)

        response = Client().get(f'/api/payments/verify/?payment_id={payment.id}&Authority=PURCHASE-AUTH&Status=OK')

        self.assertEqual(response.status_code, 302)
        self.assertEqual(LoyaltyTransaction.objects.filter(order=order).count(), 1)
        self.assertEqual(LoyaltyTransaction.objects.get(order=order).points_delta, 4)


class ReferralPurchaseRewardTests(TestCase):
    def setUp(self):
        self.referrer = User.objects.create_user(username='purchase-referrer', password='safe-password-123')
        self.buyer = User.objects.create_user(username='purchase-referred', password='safe-password-123')
        self.product = ProductFactory()
        purchase_event, _ = LoyaltyEventType.objects.get_or_create(code=PURCHASE_EVENT_CODE, defaults={'name': 'Purchase'})
        referral_event, _ = LoyaltyEventType.objects.get_or_create(code=REFERRAL_PURCHASE_EVENT_CODE, defaults={'name': 'Referral purchase'})
        purchase_rule = LoyaltyRule.objects.create(code='purchase-rule-ref', event_type=purchase_event, name='Purchase rule', points=1)
        LoyaltyRule.objects.create(code='referral-purchase-rule', event_type=referral_event, name='Referral purchase rule', points=6)
        PurchaseRewardTier.objects.create(rule=purchase_rule, name='Any purchase', minimum_order_total=0, points=4)
        self.attribution, self.token = create_referral_attribution(referrer=self.referrer, product=self.product)
        self.attribution.referred_user = self.buyer
        self.attribution.status = ReferralAttribution.STATUS_VERIFIED
        self.attribution.verified_at = timezone.now()
        self.attribution.save(update_fields=['referred_user', 'status', 'verified_at', 'updated_at'])

    def paid_order(self, user, total=500):
        order = OrderFactory(user=user, total=Decimal(str(total)), subtotal=Decimal(str(total)), status='pending', payment_status='paid')
        payment = PaymentFactory(order=order, user=user, amount=Decimal(str(total)), status='success')
        return order, payment

    def test_referred_purchase_awards_buyer_and_referrer_once(self):
        order, payment = self.paid_order(self.buyer)
        award_purchase_rewards_for_order(order=order, payment=payment)
        award_purchase_rewards_for_order(order=order, payment=payment)

        self.assertEqual(LoyaltyTransaction.objects.filter(order=order).count(), 2)
        self.assertEqual(LoyaltyTransaction.objects.filter(user=self.buyer, order=order).get().points_delta, 4)
        ref_tx = LoyaltyTransaction.objects.get(user=self.referrer, order=order)
        self.assertEqual(ref_tx.points_delta, 6)
        self.assertEqual(ref_tx.metadata['referral_attribution_id'], str(self.attribution.id))
        self.assertEqual(LoyaltyTransaction.objects.filter(user=self.referrer, event_type__code=REFERRAL_PURCHASE_EVENT_CODE).count(), 1)

    def test_unrelated_buyer_gets_only_normal_purchase_reward(self):
        other = User.objects.create_user(username='unrelated-buyer', password='safe-password-123')
        order, payment = self.paid_order(other)
        award_purchase_rewards_for_order(order=order, payment=payment)
        self.assertEqual(LoyaltyTransaction.objects.filter(order=order).count(), 1)
        self.assertFalse(LoyaltyTransaction.objects.filter(user=self.referrer, order=order).exists())

    def test_unverified_attribution_does_not_earn_referral_reward(self):
        self.attribution.status = ReferralAttribution.STATUS_CLAIMED
        self.attribution.save(update_fields=['status', 'updated_at'])
        order, payment = self.paid_order(self.buyer)
        award_purchase_rewards_for_order(order=order, payment=payment)
        self.assertEqual(LoyaltyTransaction.objects.filter(order=order).count(), 1)
        self.assertFalse(LoyaltyTransaction.objects.filter(user=self.referrer, order=order).exists())

    def test_multiple_orders_each_get_one_referral_reward(self):
        first, first_payment = self.paid_order(self.buyer, 500)
        second, second_payment = self.paid_order(self.buyer, 600)
        award_purchase_rewards_for_order(order=first, payment=first_payment)
        award_purchase_rewards_for_order(order=second, payment=second_payment)
        self.assertEqual(LoyaltyTransaction.objects.filter(user=self.referrer, event_type__code=REFERRAL_PURCHASE_EVENT_CODE).count(), 2)
        self.assertNotEqual(
            *LoyaltyTransaction.objects.filter(user=self.referrer, event_type__code=REFERRAL_PURCHASE_EVENT_CODE).values_list('idempotency_key', flat=True)
        )
