"""Send-budget tests against a real Redis cache.

These cases skip unless ``CACHES['default']`` is Django's Redis backend.
They must not be treated as green on LocMem — that backend cannot prove
cross-process atomicity.
"""

from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from unittest import mock

from django.conf import settings
from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone

from .services import (
    SEND_BUDGET_WINDOW,
    SendMessageError,
    consume_send_budget,
    is_new_account,
    send_rate_limit,
)


def _redis_required():
    backend = (settings.CACHES.get('default') or {}).get('BACKEND', '')
    return 'redis' in backend.lower()


class RedisSendBudgetMixin:
    def _require_redis(self):
        if not _redis_required():
            self.skipTest(
                'REDIS_URL is not set; send-budget concurrency must run on real Redis.'
            )
        cache.clear()

    def _user(self, username, *, days_old=0):
        user = User.objects.create_user(username=username, password='x')
        if days_old:
            user.date_joined = timezone.now() - timedelta(days=days_old)
            user.save(update_fields=['date_joined'])
        return user

    def _consume_many(self, user, count):
        def attempt(_index):
            try:
                consume_send_budget(user)
                return True
            except SendMessageError:
                return False

        with ThreadPoolExecutor(max_workers=min(count, 16)) as pool:
            return list(pool.map(attempt, range(count)))


class SendBudgetRedisTests(RedisSendBudgetMixin, TestCase):
    def test_concurrent_consumes_never_exceed_limit(self):
        self._require_redis()
        user = self._user('budget-old', days_old=30)
        with override_settings(REALTIME={**settings.REALTIME, 'MESSAGE_RATE': 8}):
            results = self._consume_many(user, 24)
        self.assertEqual(sum(results), 8)
        self.assertEqual(len(results) - sum(results), 16)

    def test_new_account_gets_half_budget(self):
        self._require_redis()
        user = self._user('budget-new')
        self.assertTrue(is_new_account(user))
        self.assertEqual(send_rate_limit(user, 60), 30)
        with override_settings(REALTIME={**settings.REALTIME, 'MESSAGE_RATE': 10}):
            results = self._consume_many(user, 16)
        self.assertEqual(sum(results), 5)

    def test_established_account_keeps_full_budget(self):
        self._require_redis()
        user = self._user('budget-full', days_old=30)
        self.assertFalse(is_new_account(user))
        with override_settings(REALTIME={**settings.REALTIME, 'MESSAGE_RATE': 10}):
            results = self._consume_many(user, 16)
        self.assertEqual(sum(results), 10)

    def test_two_users_do_not_share_a_key(self):
        self._require_redis()
        first = self._user('budget-a', days_old=30)
        second = self._user('budget-b', days_old=30)
        with override_settings(REALTIME={**settings.REALTIME, 'MESSAGE_RATE': 3}):
            first_ok = sum(self._consume_many(first, 6))
            second_ok = sum(self._consume_many(second, 6))
        self.assertEqual(first_ok, 3)
        self.assertEqual(second_ok, 3)

    def test_incr_does_not_reset_ttl(self):
        self._require_redis()
        user = self._user('budget-ttl', days_old=30)
        with override_settings(REALTIME={**settings.REALTIME, 'MESSAGE_RATE': 10}):
            consume_send_budget(user)
            client = cache._cache.get_client(write=True)
            key = cache.make_and_validate_key(
                f'chat:send-budget:{user.pk}:{int(timezone.now().timestamp() // SEND_BUDGET_WINDOW)}'
            )
            ttl_before = client.ttl(key)
            consume_send_budget(user)
            ttl_after = client.ttl(key)
        self.assertGreater(ttl_before, 0)
        self.assertLessEqual(ttl_after, ttl_before)
        self.assertGreater(ttl_after, 0)

    def test_new_window_initializes_once_under_concurrency(self):
        self._require_redis()
        user = self._user('budget-window', days_old=30)
        start = timezone.datetime(2026, 8, 19, 12, 0, 5, tzinfo=timezone.utc)
        next_window = start + timedelta(seconds=SEND_BUDGET_WINDOW)
        with override_settings(REALTIME={**settings.REALTIME, 'MESSAGE_RATE': 4}):
            with mock.patch('chat.services.timezone.now', return_value=start):
                self.assertEqual(sum(self._consume_many(user, 4)), 4)
            with mock.patch('chat.services.timezone.now', return_value=next_window):
                results = self._consume_many(user, 12)
        self.assertEqual(sum(results), 4)

    def test_rest_and_ws_share_consume_send_budget(self):
        """Both transports call the same function; a mixed burst still caps."""
        self._require_redis()
        user = self._user('budget-shared', days_old=30)
        with override_settings(REALTIME={**settings.REALTIME, 'MESSAGE_RATE': 6}):
            rest = self._consume_many(user, 5)
            ws = self._consume_many(user, 5)
        self.assertEqual(sum(rest) + sum(ws), 6)
