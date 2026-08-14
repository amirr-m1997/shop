from datetime import timedelta
import threading

from django.db import close_old_connections
from django.contrib.auth import get_user_model
from django.test import TransactionTestCase, skipUnlessDBFeature
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from products.models import Review
from shop.tests import ProductFactory, create_user_with_token

from .models import LoyaltyAccount, LoyaltyEventType, LoyaltyRule, LoyaltyTransaction
from .services import REVIEW_SUBMISSION_EVENT_CODE


User = get_user_model()


class ReviewRewardTests(APITestCase):
    def setUp(self):
        self.user, self.token = create_user_with_token(username='review-reward-user')
        self.product = ProductFactory(is_active=True)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.event_type, _ = LoyaltyEventType.objects.get_or_create(
            code=REVIEW_SUBMISSION_EVENT_CODE,
            defaults={'name': 'Review submission'},
        )

    def create_rule(self, code='review-reward-rule', points=11, **kwargs):
        return LoyaltyRule.objects.create(
            code=code, event_type=self.event_type, name=code, points=points, **kwargs,
        )

    def submit(self, **payload):
        data = {
            'product': self.product.id,
            'rating': 5,
            'title': 'Useful review',
            'comment': 'The product matched the description.',
        }
        data.update(payload)
        return self.client.post('/api/products/reviews/', data)

    def test_valid_review_awards_configured_reward_and_ledger_reference(self):
        self.create_rule(points=11)
        response = self.submit()

        self.assertEqual(response.status_code, 201)
        review = Review.objects.get()
        transaction = LoyaltyTransaction.objects.get(user=self.user)
        self.assertEqual(transaction.event_type.code, REVIEW_SUBMISSION_EVENT_CODE)
        self.assertEqual(transaction.points_delta, 11)
        self.assertEqual(transaction.product_id, self.product.id)
        self.assertEqual(transaction.metadata['review_id'], review.id)
        self.assertEqual(LoyaltyAccount.objects.get(user=self.user).available_points, 11)

    def test_duplicate_reward_attempt_and_review_edit_do_not_duplicate(self):
        rule = self.create_rule(points=7)
        self.assertEqual(self.submit().status_code, 201)
        review = Review.objects.get()

        from loyalty.services import award_points_for_event
        duplicate = award_points_for_event(
            user=self.user,
            event_type_code=REVIEW_SUBMISSION_EVENT_CODE,
            idempotency_key=f'review-submission:user:{self.user.pk}:product:{self.product.id}',
            product=self.product,
        )
        self.client.patch(f'/api/products/reviews/{review.pk}/', {'rating': 3, 'title': 'Edited'})

        self.assertFalse(duplicate.created)
        self.assertEqual(LoyaltyTransaction.objects.filter(user=self.user).count(), 1)
        self.assertEqual(LoyaltyTransaction.objects.get().rule_id, rule.id)

    def test_delete_and_recreate_same_product_does_not_earn_second_reward(self):
        self.create_rule(points=9)
        self.assertEqual(self.submit().status_code, 201)
        first_review = Review.objects.get()
        self.assertEqual(self.client.delete(f'/api/products/reviews/{first_review.pk}/').status_code, 204)

        self.assertEqual(self.submit(rating=4, title='Recreated review').status_code, 201)
        self.assertEqual(LoyaltyTransaction.objects.filter(user=self.user).count(), 1)
        transaction = LoyaltyTransaction.objects.get(user=self.user)
        self.assertEqual(transaction.metadata['review_id'], first_review.id)
        self.assertEqual(
            transaction.idempotency_key,
            f'review-submission:user:{self.user.pk}:product:{self.product.id}',
        )

    def test_different_product_can_earn_its_own_review_reward(self):
        self.create_rule(points=4)
        other_product = ProductFactory(is_active=True)
        self.assertEqual(self.submit().status_code, 201)
        response = self.client.post('/api/products/reviews/', {'product': other_product.id, 'rating': 5})

        self.assertEqual(response.status_code, 201)
        self.assertEqual(LoyaltyTransaction.objects.filter(user=self.user).count(), 2)
        self.assertEqual(LoyaltyAccount.objects.get(user=self.user).available_points, 8)

    def test_invalid_and_duplicate_reviews_do_not_award(self):
        self.create_rule(points=5)
        self.assertEqual(self.submit(rating=6).status_code, 400)
        self.assertFalse(LoyaltyTransaction.objects.filter(user=self.user).exists())
        self.assertEqual(self.submit(rating=4).status_code, 201)
        self.assertEqual(self.submit(rating=3).status_code, 400)
        self.assertEqual(LoyaltyTransaction.objects.filter(user=self.user).count(), 1)

    def test_disabled_and_out_of_date_rules_do_not_award(self):
        self.create_rule(points=5, is_active=False)
        self.assertEqual(self.submit().status_code, 201)
        self.assertFalse(LoyaltyTransaction.objects.filter(user=self.user).exists())

        user2, token2 = create_user_with_token(username='review-reward-user-2')
        client2 = APIClient()
        client2.credentials(HTTP_AUTHORIZATION=f'Token {token2}')
        rule = self.create_rule(code='review-future-rule', points=8, starts_at=timezone.now() + timedelta(days=1))
        response = client2.post('/api/products/reviews/', {'product': self.product.id, 'rating': 5})
        self.assertEqual(response.status_code, 201)
        self.assertFalse(LoyaltyTransaction.objects.filter(user=user2).exists())
        rule.starts_at = timezone.now() - timedelta(days=2)
        rule.ends_at = timezone.now() - timedelta(days=1)
        rule.save(update_fields=['starts_at', 'ends_at'])

    def test_rule_priority_selects_highest_active_rule(self):
        low = self.create_rule(code='review-low', points=2, priority=1)
        high = self.create_rule(code='review-high', points=13, priority=20)
        self.assertEqual(self.submit().status_code, 201)
        transaction = LoyaltyTransaction.objects.get(user=self.user)
        self.assertEqual(transaction.rule_id, high.id)
        self.assertNotEqual(transaction.rule_id, low.id)


class ReviewRewardConcurrencyTests(TransactionTestCase):
    @skipUnlessDBFeature('has_select_for_update')
    def test_concurrent_attempts_keep_one_lifetime_reward(self):
        user = User.objects.create_user(username='review-concurrent-user', password='safe-password-123')
        product = ProductFactory(is_active=True)
        event_type, _ = LoyaltyEventType.objects.get_or_create(
            code=REVIEW_SUBMISSION_EVENT_CODE,
            defaults={'name': 'Review submission'},
        )
        LoyaltyRule.objects.create(
            code='review-concurrent-rule', event_type=event_type, name='Review concurrent rule', points=6,
        )
        barrier = threading.Barrier(2)
        errors = []

        def worker():
            close_old_connections()
            try:
                barrier.wait(timeout=5)
                from loyalty.services import award_points_for_event
                award_points_for_event(
                    user=User.objects.get(pk=user.pk),
                    event_type_code=REVIEW_SUBMISSION_EVENT_CODE,
                    idempotency_key=f'review-submission:user:{user.pk}:product:{product.pk}',
                    product=product,
                )
            except Exception as exc:  # pragma: no cover - surfaced by assertions
                errors.append(exc)
            finally:
                close_old_connections()

        threads = [threading.Thread(target=worker), threading.Thread(target=worker)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=10)

        self.assertFalse(errors, errors)
        self.assertEqual(
            LoyaltyTransaction.objects.filter(user=user, event_type=event_type).count(),
            1,
        )
