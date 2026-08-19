"""Web Push failure handling. Message commit must not depend on the provider."""

import sys
import types
from unittest import mock

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TransactionTestCase, override_settings

from .models import Conversation, Message, PushSubscription
from .realtime import presence_mark, presence_status
from .services import _maybe_push, _safe_push, send_private_message


class WebPushException(Exception):
    def __init__(self, message='', response=None):
        super().__init__(message)
        self.response = response


class _Response:
    def __init__(self, status_code):
        self.status_code = status_code


def _install_webpush(impl):
    module = types.ModuleType('pywebpush')
    module.WebPushException = WebPushException
    module.webpush = impl
    sys.modules['pywebpush'] = module
    return module


VAPID = {
    'VAPID_PUBLIC_KEY': 'test-public',
    'VAPID_PRIVATE_KEY': 'test-private-secret',
    'VAPID_CLAIM_EMAIL': 'mailto:test@localhost',
}

SECRET_FRAGMENTS = (
    'private-body-must-not-log',
    'test-private-secret',
    'p256dh-secret',
    'auth-secret',
)


class PushFailureTests(TransactionTestCase):
    def setUp(self):
        cache.clear()
        self.alice = User.objects.create_user(username='push-alice', password='x')
        self.bob = User.objects.create_user(username='push-bob', password='x')
        self.conversation = Conversation.objects.create(
            user1=self.alice, user2=self.bob, status=Conversation.STATUS_ACCEPTED,
        )
        self.subscription = PushSubscription.objects.create(
            user=self.bob,
            endpoint='https://push.example/sub-audit',
            p256dh='p256dh-secret',
            auth='auth-secret',
        )
        self.message = Message.objects.create(
            conversation=self.conversation, sender=self.alice, text='private-body-must-not-log',
        )

    def tearDown(self):
        sys.modules.pop('pywebpush', None)
        cache.clear()

    def _push(self):
        with mock.patch('chat.services.presence_status', return_value='offline'):
            _maybe_push(self.bob, self.conversation, self.message, actor=self.alice)

    def _assert_logs_have_no_secrets(self, output):
        for fragment in SECRET_FRAGMENTS:
            self.assertNotIn(fragment, output)

    @override_settings(WEB_PUSH=VAPID)
    def test_success_keeps_subscription_and_logs_ids_only(self):
        calls = []

        def webpush(**kwargs):
            calls.append(kwargs)
            return True

        _install_webpush(webpush)
        with self.assertNoLogs('chat', level='WARNING'):
            self._push()
        self.assertEqual(len(calls), 1)
        self.assertTrue(PushSubscription.objects.filter(pk=self.subscription.pk).exists())
        self.assertIn('private-body-must-not-log', calls[0]['data'])

    @override_settings(WEB_PUSH=VAPID)
    def test_stale_404_and_410_delete_subscription(self):
        for status_code in (404, 410):
            sub = PushSubscription.objects.create(
                user=self.bob,
                endpoint=f'https://push.example/stale-{status_code}',
                p256dh='p256dh-secret',
                auth='auth-secret',
            )
            self.subscription = sub

            def webpush(**kwargs):
                raise WebPushException('gone', response=_Response(status_code))

            _install_webpush(webpush)
            with self.assertLogs('chat', level='WARNING') as captured:
                self._push()
            output = '\n'.join(captured.output)
            self.assertFalse(PushSubscription.objects.filter(pk=sub.pk).exists())
            self.assertIn('chat_push_stale', output)
            self.assertNotIn('chat_push_error', output)
            self._assert_logs_have_no_secrets(output)

    @override_settings(WEB_PUSH=VAPID)
    def test_401_and_403_keep_subscription(self):
        for status_code in (401, 403):
            sub = PushSubscription.objects.create(
                user=self.bob,
                endpoint=f'https://push.example/auth-{status_code}',
                p256dh='p256dh-secret',
                auth='auth-secret',
            )
            self.subscription = sub

            def webpush(**kwargs):
                raise WebPushException('unauthorized', response=_Response(status_code))

            _install_webpush(webpush)
            with self.assertLogs('chat', level='WARNING') as captured:
                self._push()
            output = '\n'.join(captured.output)
            self.assertTrue(PushSubscription.objects.filter(pk=sub.pk).exists())
            self.assertIn('chat_push_error', output)
            self.assertNotIn('chat_push_stale', output)
            self._assert_logs_have_no_secrets(output)

    @override_settings(WEB_PUSH=VAPID)
    def test_5xx_and_timeout_keep_subscription(self):
        def boom(**kwargs):
            raise WebPushException('bad gateway', response=_Response(503))

        _install_webpush(boom)
        with self.assertLogs('chat', level='WARNING'):
            self._push()
        self.assertTrue(PushSubscription.objects.filter(pk=self.subscription.pk).exists())

        def timeout(**kwargs):
            raise TimeoutError('push timeout')

        _install_webpush(timeout)
        with self.assertLogs('chat', level='WARNING') as captured:
            self._push()
        output = '\n'.join(captured.output)
        self.assertTrue(PushSubscription.objects.filter(pk=self.subscription.pk).exists())
        self.assertIn('TimeoutError', output)
        self.assertIn('chat_push_error', output)
        self._assert_logs_have_no_secrets(output)

    @override_settings(WEB_PUSH=VAPID)
    def test_safe_push_swallows_exception(self):
        with mock.patch('chat.services._maybe_push', side_effect=RuntimeError('provider down')):
            with self.assertLogs('chat', level='WARNING') as captured:
                _safe_push(self.bob, self.conversation, self.message, actor=self.alice)
        self.assertIn('chat_push_unhandled', '\n'.join(captured.output))
        self.assertTrue(Message.objects.filter(pk=self.message.pk).exists())

    @override_settings(WEB_PUSH=VAPID)
    def test_send_commits_message_when_push_raises(self):
        def webpush(**kwargs):
            raise RuntimeError('transport')

        _install_webpush(webpush)
        created = send_private_message(self.alice, self.conversation, text='must-persist')
        self.assertTrue(Message.objects.filter(pk=created.pk).exists())
        self.assertEqual(created.text, 'must-persist')
        self.assertTrue(
            created.receipts.filter(user=self.bob).exists()
        )

    @override_settings(WEB_PUSH=VAPID)
    def test_online_presence_skips_push(self):
        calls = []

        def webpush(**kwargs):
            calls.append(kwargs)
            return True

        _install_webpush(webpush)
        presence_mark(self.bob.id, 'conn-online', status='online')
        self.assertEqual(presence_status(self.bob.id), 'online')
        _maybe_push(self.bob, self.conversation, self.message, actor=self.alice)
        self.assertEqual(calls, [])
        self.assertTrue(PushSubscription.objects.filter(pk=self.subscription.pk).exists())

    @override_settings(WEB_PUSH=VAPID)
    def test_offline_and_away_presence_are_eligible(self):
        calls = []

        def webpush(**kwargs):
            calls.append(kwargs)
            return True

        _install_webpush(webpush)
        self.assertEqual(presence_status(self.bob.id), 'offline')
        _maybe_push(self.bob, self.conversation, self.message, actor=self.alice)
        self.assertEqual(len(calls), 1)

        calls.clear()
        presence_mark(self.bob.id, 'conn-away', status='away')
        self.assertEqual(presence_status(self.bob.id), 'away')
        _maybe_push(self.bob, self.conversation, self.message, actor=self.alice)
        self.assertEqual(len(calls), 1)
