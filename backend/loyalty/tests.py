import threading
from datetime import timedelta
from decimal import Decimal

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.db import close_old_connections
from django.test import TestCase, TransactionTestCase, skipUnlessDBFeature
from django.utils import timezone
from rest_framework.test import APIClient

from .admin import LoyaltyAccountAdmin
from .models import ReferralAttribution, LoyaltyAccount, LoyaltyEventType, LoyaltyRule, LoyaltyTransaction, PurchaseRewardTier
from .services import (
    REFERRAL_REGISTRATION_EVENT_CODE, REFERRED_USER_REGISTRATION_EVENT_CODE,
    award_referral_registration_rewards, claim_referral_attribution_from_request,
    create_referral_attribution,
    get_or_create_loyalty_account,
    get_purchase_reward_tier,
    record_loyalty_transaction,
    award_points_for_event,
    reverse_loyalty_transaction,
)
from shop.tests import OrderFactory, ProductFactory


User = get_user_model()


class ReferralAttributionTests(TestCase):
    def setUp(self):
        self.referrer = User.objects.create_user(username='referrer', password='safe-password-123')
        self.product = ProductFactory()
        self.client = APIClient()

    def _rule(self, code, points):
        event_type, _ = LoyaltyEventType.objects.get_or_create(code=code, defaults={'name': code})
        return LoyaltyRule.objects.create(
            code=f'{code}-rule-{LoyaltyRule.objects.count()}', event_type=event_type, name=code, points=points,
        )

    def _open(self, token):
        return self.client.get(f'/api/loyalty/referrals/{token}/open/')

    def test_authenticated_referral_creation_returns_public_url_without_hash(self):
        self.client.force_authenticate(self.referrer)
        response = self.client.post('/api/loyalty/referrals/', {'product_id': self.product.id}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertIn('/api/loyalty/referrals/', response.data['referral_url'])
        self.assertNotIn('token_hash', response.data)
        self.assertNotIn(ReferralAttribution.objects.get().token_hash, response.data['referral_url'])

    def test_referral_creation_requires_authentication_and_valid_product(self):
        unauthenticated = self.client.post('/api/loyalty/referrals/', {'product_id': self.product.id}, format='json')
        self.assertEqual(unauthenticated.status_code, 401)
        self.client.force_authenticate(self.referrer)
        invalid = self.client.post('/api/loyalty/referrals/', {'product_id': 999999}, format='json')
        self.assertEqual(invalid.status_code, 404)

    def test_referral_creation_rejects_invalid_source_message(self):
        self.client.force_authenticate(self.referrer)
        response = self.client.post(
            '/api/loyalty/referrals/',
            {'product_id': self.product.id, 'message_id': 999999},
            format='json',
        )
        self.assertEqual(response.status_code, 404)

    def test_opened_link_is_claimed_at_registration_and_rewards_both_users_once(self):
        self._rule(REFERRAL_REGISTRATION_EVENT_CODE, 17)
        self._rule(REFERRED_USER_REGISTRATION_EVENT_CODE, 11)
        attribution, token = create_referral_attribution(referrer=self.referrer, product=self.product)
        response = self._open(token)
        self.assertEqual(response.status_code, 302)
        registration = self.client.post('/api/auth/register/', {
            'username': 'referreduser', 'password': 'safe-password-123', 'email': 'referred@example.com',
        }, format='json')
        self.assertEqual(registration.status_code, 201)
        referred = User.objects.get(username='referreduser')
        attribution.refresh_from_db()
        self.assertEqual(attribution.referred_user_id, referred.id)
        profile = referred.profile
        profile.verification_code = '123456'
        profile.verification_type = 'email'
        profile.code_generated_at = timezone.now()
        profile.save()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {registration.data['token']}")
        self.assertEqual(self.client.post('/api/auth/verify-code/', {'code': '123456', 'type': 'email'}, format='json').status_code, 200)
        self.assertEqual(LoyaltyTransaction.objects.filter(event_type__code=REFERRAL_REGISTRATION_EVENT_CODE).count(), 1)
        self.assertEqual(LoyaltyTransaction.objects.filter(event_type__code=REFERRED_USER_REGISTRATION_EVENT_CODE).count(), 1)
        self.assertEqual(LoyaltyAccount.objects.get(user=self.referrer).available_points, 17)
        self.assertEqual(LoyaltyAccount.objects.get(user=referred).available_points, 11)
        attribution.refresh_from_db()
        self.assertEqual(attribution.status, ReferralAttribution.STATUS_VERIFIED)

    def test_first_valid_link_wins_and_forged_cookie_does_not_claim(self):
        first, first_token = create_referral_attribution(referrer=self.referrer, product=self.product)
        second, second_token = create_referral_attribution(referrer=self.referrer, product=self.product)
        self._open(first_token)
        self._open(second_token)
        self.client.post('/api/auth/register/', {'username': 'firstwins', 'password': 'safe-password-123'}, format='json')
        first.refresh_from_db()
        second.refresh_from_db()
        self.assertIsNotNone(first.referred_user_id)
        self.assertIsNone(second.referred_user_id)

        attacker = APIClient()
        attacker.cookies['product_referral'] = 'forged-value'
        attacker.post('/api/auth/register/', {'username': 'forgedcookie', 'password': 'safe-password-123'}, format='json')
        self.assertEqual(ReferralAttribution.objects.filter(referred_user__username='forgedcookie').count(), 0)

    def test_expired_or_inactive_product_link_cannot_be_opened_or_claimed(self):
        attribution, token = create_referral_attribution(referrer=self.referrer, product=self.product)
        attribution.expires_at = timezone.now() - timedelta(seconds=1)
        attribution.save()
        self.assertEqual(self._open(token).status_code, 404)
        self.product.is_active = False
        self.product.save(update_fields=['is_active'])
        fresh, fresh_token = create_referral_attribution(referrer=self.referrer, product=ProductFactory())
        fresh.product.is_active = False
        fresh.product.save(update_fields=['is_active'])
        self.assertEqual(self._open(fresh_token).status_code, 404)

    def test_claimed_attribution_survives_later_product_deactivation_and_is_idempotent(self):
        self._rule(REFERRAL_REGISTRATION_EVENT_CODE, 9)
        self._rule(REFERRED_USER_REGISTRATION_EVENT_CODE, 6)
        referred = User.objects.create_user(username='claimeduser', password='safe-password-123')
        attribution, _ = create_referral_attribution(referrer=self.referrer, product=self.product)
        attribution.referred_user = referred
        attribution.claimed_at = timezone.now()
        attribution.status = ReferralAttribution.STATUS_CLAIMED
        attribution.save()
        self.product.is_active = False
        self.product.save(update_fields=['is_active'])
        award_referral_registration_rewards(user=referred, verification_type='email')
        award_referral_registration_rewards(user=referred, verification_type='phone')
        self.assertEqual(LoyaltyTransaction.objects.filter(related_user=referred).count(), 1)
        self.assertEqual(LoyaltyTransaction.objects.filter(user=referred).count(), 1)


class CustomerClubReadApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='club-user', password='safe-password-123')
        self.other_user = User.objects.create_user(username='other-club-user', password='safe-password-123')
        self.event_type = LoyaltyEventType.objects.create(code='club-event', name='Club event')
        self.client = APIClient()

    def _transaction(self, user=None, **kwargs):
        return record_loyalty_transaction(
            user=user or self.user,
            event_type=self.event_type,
            points_delta=kwargs.pop('points_delta', 10),
            idempotency_key=kwargs.pop('idempotency_key', f'club-{LoyaltyTransaction.objects.count()}'),
            **kwargs,
        ).transaction

    def test_transactions_are_authenticated_paginated_private_and_safe(self):
        product = ProductFactory(name='Safe Product')
        order = OrderFactory(user=self.user)
        for index in range(20):
            self._transaction(idempotency_key=f'club-page-{index}')
        first = self._transaction(order=order, product=product, description='Purchase reward')
        self._transaction(user=self.other_user, idempotency_key='other-user-transaction')

        unauthenticated = self.client.get('/api/loyalty/transactions/')
        self.assertEqual(unauthenticated.status_code, 401)
        self.client.force_authenticate(self.user)
        response = self.client.get('/api/loyalty/transactions/?page=1')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 21)
        self.assertEqual(len(response.data['results']), 20)
        self.assertGreater(response.data['results'][0]['id'], response.data['results'][-1]['id'])
        first_data = next(item for item in response.data['results'] if item['id'] == first.id)
        self.assertEqual(first_data['order_reference']['order_number'], order.order_number)
        self.assertEqual(first_data['product_reference']['slug'], product.slug)
        self.assertEqual(first_data['points_delta'], 10)
        self.assertNotIn('idempotency_key', first_data)
        self.assertNotIn('metadata', first_data)
        self.assertNotIn('user', first_data)
        page_two = self.client.get('/api/loyalty/transactions/?page=2')
        self.assertEqual(page_two.status_code, 200)
        self.assertEqual(len(page_two.data['results']), 1)
        self.assertEqual(self.client.get('/api/loyalty/transactions/?page=999').status_code, 404)

    def test_transactions_empty_history(self):
        self.client.force_authenticate(self.user)
        response = self.client.get('/api/loyalty/transactions/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 0)
        self.assertEqual(response.data['results'], [])

    def _referral(self, status, suffix):
        return ReferralAttribution.objects.create(
            referrer=self.user,
            product=ProductFactory(),
            token_hash=f'safe-hash-{suffix}',
            expires_at=timezone.now() + timedelta(days=1),
            status=status,
        )

    def test_referral_summary_is_authenticated_private_aggregated_and_safe(self):
        self._referral(ReferralAttribution.STATUS_CREATED, 'created')
        verified = self._referral(ReferralAttribution.STATUS_VERIFIED, 'verified')
        verified.referred_user = self.other_user
        verified.save(update_fields=['referred_user'])
        self._referral(ReferralAttribution.STATUS_EXPIRED, 'expired')
        referral_event, _ = LoyaltyEventType.objects.get_or_create(
            code='referral-registration', defaults={'name': 'Referral registration'},
        )
        record_loyalty_transaction(
            user=self.user,
            event_type=referral_event,
            points_delta=25,
            idempotency_key='referral-summary-reward',
            description='Referral registration reward',
        )

        self.assertEqual(self.client.get('/api/loyalty/referrals/summary/').status_code, 401)
        self.client.force_authenticate(self.user)
        response = self.client.get('/api/loyalty/referrals/summary/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total_activity'], 3)
        self.assertEqual(response.data['status_counts']['created'], 1)
        self.assertEqual(response.data['status_counts']['verified'], 1)
        self.assertEqual(response.data['status_counts']['expired'], 1)
        self.assertEqual(response.data['successful_referrals'], 1)
        self.assertEqual(response.data['referred_users'], 1)
        self.assertEqual(response.data['referral_rewards_earned'], 25)
        self.assertNotIn('token_hash', response.data)
        self.assertNotIn('referral_url', response.data)

    def test_referral_summary_empty_and_does_not_leak_other_referrers(self):
        other_referral = ReferralAttribution.objects.create(
            referrer=self.other_user,
            product=ProductFactory(),
            token_hash='other-private-hash',
            expires_at=timezone.now() + timedelta(days=1),
            status=ReferralAttribution.STATUS_VERIFIED,
        )
        self.client.force_authenticate(self.user)
        response = self.client.get('/api/loyalty/referrals/summary/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total_activity'], 0)
        self.assertEqual(response.data['successful_referrals'], 0)
        self.assertEqual(response.data['referral_rewards_earned'], 0)
        self.assertNotIn(str(other_referral.id), response.data)


class LoyaltyFoundationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='loyalty-user', password='safe-password-123')
        self.event_type = LoyaltyEventType.objects.create(code='registration', name='Registration')

    def create_rule(self, **overrides):
        values = {
            'code': 'registration-reward',
            'event_type': self.event_type,
            'name': 'Registration reward',
            'points': 17,
        }
        values.update(overrides)
        return LoyaltyRule.objects.create(**values)

    def test_account_is_created_lazily_and_only_once_per_user(self):
        self.assertFalse(LoyaltyAccount.objects.filter(user=self.user).exists())
        first = get_or_create_loyalty_account(self.user)
        second = get_or_create_loyalty_account(self.user)
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(LoyaltyAccount.objects.filter(user=self.user).count(), 1)
        self.assertEqual(first.available_points, 0)

    def test_awarding_points_creates_immutable_ledger_and_updates_balance(self):
        rule = self.create_rule(points=37)
        result = award_points_for_event(
            user=self.user,
            event_type_code=self.event_type.code,
            idempotency_key='registration:user:1',
        )
        self.assertTrue(result.created)
        self.assertEqual(result.transaction.rule_id, rule.id)
        self.assertEqual(result.transaction.points_delta, 37)
        account = LoyaltyAccount.objects.get(user=self.user)
        self.assertEqual(account.available_points, 37)
        self.assertEqual(account.total_earned, 37)
        self.assertEqual(account.total_redeemed, 0)

    def test_duplicate_reward_request_is_idempotent(self):
        self.create_rule(points=29)
        first = award_points_for_event(
            user=self.user, event_type_code='registration', idempotency_key='registration:user:1',
        )
        duplicate = award_points_for_event(
            user=self.user, event_type_code='registration', idempotency_key='registration:user:1',
        )
        self.assertTrue(first.created)
        self.assertFalse(duplicate.created)
        self.assertEqual(first.transaction.pk, duplicate.transaction.pk)
        self.assertEqual(LoyaltyTransaction.objects.count(), 1)
        self.assertEqual(LoyaltyAccount.objects.get(user=self.user).available_points, 29)

    def test_negative_redemption_and_compensating_reversal_update_balances(self):
        credited = record_loyalty_transaction(
            user=self.user,
            event_type=self.event_type,
            points_delta=25,
            idempotency_key='credit:1',
        ).transaction
        debit = record_loyalty_transaction(
            user=self.user,
            event_type=self.event_type,
            points_delta=-8,
            idempotency_key='redeem:1',
            entry_type=LoyaltyTransaction.ENTRY_REDEMPTION,
        ).transaction
        redemption_reversal = reverse_loyalty_transaction(
            original_transaction=debit,
            idempotency_key='reverse:redeem:1',
        ).transaction
        reversal = reverse_loyalty_transaction(
            original_transaction=credited,
            idempotency_key='reverse:credit:1',
        ).transaction
        account = LoyaltyAccount.objects.get(user=self.user)
        self.assertEqual(debit.points_delta, -8)
        self.assertEqual(redemption_reversal.points_delta, 8)
        self.assertEqual(reversal.points_delta, -25)
        self.assertEqual(reversal.reversal_of_id, credited.id)
        self.assertEqual(account.available_points, 0)
        self.assertEqual(account.total_earned, 0)
        self.assertEqual(account.total_redeemed, 0)

    def test_account_balance_is_updated_with_the_ledger_record(self):
        result = record_loyalty_transaction(
            user=self.user,
            event_type=self.event_type,
            points_delta=11,
            idempotency_key='atomic:1',
        )
        self.assertTrue(LoyaltyTransaction.objects.filter(pk=result.transaction.pk, account__user=self.user).exists())
        account = LoyaltyAccount.objects.get(user=self.user)
        self.assertEqual(account.available_points, 11)
        self.assertEqual(account.total_earned, 11)

    def test_inactive_and_out_of_date_rules_do_not_award_points(self):
        inactive = self.create_rule(is_active=False)
        self.assertIsNone(award_points_for_event(
            user=self.user, event_type_code='registration', idempotency_key='inactive:1',
        ).transaction)
        inactive.is_active = True
        inactive.starts_at = timezone.now() + timedelta(days=1)
        inactive.save(update_fields=['is_active', 'starts_at'])
        self.assertIsNone(award_points_for_event(
            user=self.user, event_type_code='registration', idempotency_key='future:1',
        ).transaction)
        inactive.starts_at = timezone.now() - timedelta(days=2)
        inactive.ends_at = timezone.now() - timedelta(days=1)
        inactive.save(update_fields=['starts_at', 'ends_at'])
        self.assertIsNone(award_points_for_event(
            user=self.user, event_type_code='registration', idempotency_key='expired:1',
        ).transaction)
        self.assertFalse(LoyaltyAccount.objects.filter(user=self.user).exists())

    def test_rule_priority_and_configured_points_determine_award(self):
        self.create_rule(code='low', points=3, priority=1)
        high = self.create_rule(code='high', points=47, priority=20)
        result = award_points_for_event(
            user=self.user, event_type_code='registration', idempotency_key='priority:1',
        )
        self.assertEqual(result.transaction.rule_id, high.id)
        self.assertEqual(result.transaction.points_delta, 47)

    def test_purchase_tier_boundaries_are_configured_and_deterministic(self):
        rule = self.create_rule(code='purchase', points=1)
        low = PurchaseRewardTier.objects.create(
            rule=rule, name='Low', minimum_order_total=Decimal('0'), maximum_order_total=Decimal('100'), points=2, priority=10,
        )
        middle = PurchaseRewardTier.objects.create(
            rule=rule, name='Middle', minimum_order_total=Decimal('100'), maximum_order_total=Decimal('200'), points=7, priority=20,
        )
        high = PurchaseRewardTier.objects.create(
            rule=rule, name='High', minimum_order_total=Decimal('200'), maximum_order_total=None, points=15, priority=30,
        )
        self.assertEqual(get_purchase_reward_tier(rule, Decimal('99.99')).pk, low.pk)
        self.assertEqual(get_purchase_reward_tier(rule, Decimal('100')).pk, middle.pk)
        self.assertEqual(get_purchase_reward_tier(rule, Decimal('199.99')).pk, middle.pk)
        self.assertEqual(get_purchase_reward_tier(rule, Decimal('200')).pk, high.pk)
        self.assertEqual(get_purchase_reward_tier(rule, Decimal('200.01')).pk, high.pk)
        middle.is_active = False
        middle.save(update_fields=['is_active'])
        self.assertEqual(get_purchase_reward_tier(rule, Decimal('100')).pk, low.pk)

    def test_purchase_tier_respects_rule_validity(self):
        rule = self.create_rule(starts_at=timezone.now() + timedelta(days=1))
        PurchaseRewardTier.objects.create(
            rule=rule, name='Future rule tier', minimum_order_total=Decimal('0'), points=4, priority=1,
        )
        self.assertIsNone(get_purchase_reward_tier(rule, Decimal('50')))


class LoyaltySummaryApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='summary-user', password='safe-password-123')
        self.client = APIClient()

    def test_summary_requires_authentication(self):
        response = self.client.get('/api/loyalty/summary/')
        self.assertEqual(response.status_code, 401)

    def test_existing_user_without_account_gets_zero_non_mutating_summary(self):
        self.client.force_authenticate(self.user)
        response = self.client.get('/api/loyalty/summary/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['account_exists'], False)
        self.assertEqual(response.data['available_points'], 0)
        self.assertFalse(LoyaltyAccount.objects.filter(user=self.user).exists())

    def test_summary_returns_existing_account_totals(self):
        event_type = LoyaltyEventType.objects.create(code='summary-event', name='Summary event')
        record_loyalty_transaction(
            user=self.user, event_type=event_type, points_delta=19, idempotency_key='summary:1',
        )
        self.client.force_authenticate(self.user)
        response = self.client.get('/api/loyalty/summary/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['account_exists'], True)
        self.assertEqual(response.data['available_points'], 19)
        self.assertEqual(response.data['total_earned'], 19)


class LoyaltyAdminTests(TestCase):
    def test_loyalty_models_are_registered_and_accounts_are_not_directly_editable(self):
        for model in (LoyaltyEventType, LoyaltyRule, PurchaseRewardTier, LoyaltyAccount, LoyaltyTransaction):
            self.assertIn(model, admin.site._registry)
        account_admin = admin.site._registry[LoyaltyAccount]
        self.assertIsInstance(account_admin, LoyaltyAccountAdmin)
        self.assertFalse(account_admin.has_add_permission(None))
        self.assertFalse(account_admin.has_delete_permission(None))


class LoyaltyConcurrencyTests(TransactionTestCase):
    @skipUnlessDBFeature('has_select_for_update')
    def test_concurrent_duplicate_reward_requests_create_one_ledger_entry(self):
        user = User.objects.create_user(username='concurrent-loyalty-user', password='safe-password-123')
        event_type = LoyaltyEventType.objects.create(code='concurrent-event', name='Concurrent event')
        LoyaltyRule.objects.create(
            code='concurrent-rule', event_type=event_type, name='Concurrent rule', points=23,
        )
        barrier = threading.Barrier(2)
        results = []
        errors = []

        def worker():
            close_old_connections()
            try:
                barrier.wait(timeout=5)
                result = award_points_for_event(
                    user=User.objects.get(pk=user.pk),
                    event_type_code='concurrent-event',
                    idempotency_key='concurrent:event:user',
                )
                results.append(result.created)
            except Exception as exc:  # pragma: no cover - reported by assertion below
                errors.append(exc)
            finally:
                close_old_connections()

        threads = [threading.Thread(target=worker), threading.Thread(target=worker)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=10)

        self.assertFalse(errors, errors)
        self.assertEqual(results.count(True), 1)
        self.assertEqual(LoyaltyTransaction.objects.filter(idempotency_key='concurrent:event:user').count(), 1)
        self.assertEqual(LoyaltyAccount.objects.get(user=user).available_points, 23)
