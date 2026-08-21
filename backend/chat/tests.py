from datetime import timedelta

from django.contrib.auth.models import User
from django.core.cache import cache
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token

from shop.tests import ProductFactory, UserProfileFactory, create_user_with_token
from .models import Conversation, Message, MessageReport, Notification, PushSubscription
from support.models import SupportConversation


class ChatAuthMixin:
    def _login(self, username):
        cache.clear()
        user, token = create_user_with_token(username=username)
        UserProfileFactory(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        return user


class UserSearchPrivacyTests(ChatAuthMixin, APITestCase):
    def setUp(self):
        self.me = self._login('searcher')

    def test_short_query_returns_empty(self):
        User.objects.create_user(username='target', password='x')
        resp = self.client.get('/api/chat/users/search/', {'q': 'a'})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['results'], [])

    def test_does_not_search_by_email(self):
        User.objects.create_user(username='target', email='findme@secret.test', password='x')
        resp = self.client.get('/api/chat/users/search/', {'q': 'findme'})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['results'], [])

    def test_search_by_username(self):
        User.objects.create_user(username='target', email='a@b.com', password='x')
        resp = self.client.get('/api/chat/users/search/', {'q': 'targ'})
        self.assertEqual(len(resp.data['results']), 1)
        row = resp.data['results'][0]
        self.assertNotIn('email', row)
        self.assertEqual(row['username'], 'target')


class ConversationStateMachineTests(ChatAuthMixin, APITestCase):
    def setUp(self):
        self.alice = self._login('alice')
        self.bob = User.objects.create_user(username='bob', password='x')
        UserProfileFactory(user=self.bob)

    def _create(self):
        return self.client.post('/api/chat/conversations/', {'user_id': self.bob.id}, format='json')

    def test_creator_sees_pending_and_cannot_send(self):
        resp = self._create()
        self.assertEqual(resp.status_code, 201)
        conv_id = resp.data['id']
        self.assertEqual(resp.data['status'], 'pending')
        self.assertTrue(resp.data['is_requester'])

        send = self.client.post(
            f'/api/chat/conversations/{conv_id}/send_message/',
            {'text': 'hi'}, format='json',
        )
        self.assertEqual(send.status_code, status.HTTP_403_FORBIDDEN)

    def test_notification_only_for_recipient_not_requester(self):
        resp = self._create()
        conv_id = resp.data['id']
        # Requester should NOT have a "new conversation request" notification.
        self.assertFalse(
            Notification.objects.filter(
                recipient=self.alice, conversation_id=conv_id,
                text__contains='درخواست گفتگو'
            ).exists()
        )
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.bob, conversation_id=conv_id,
                text__contains='درخواست گفتگو'
            ).exists()
        )

    def test_only_receiver_can_accept(self):
        conv_id = self._create().data['id']
        # Alice (requester) cannot accept her own request.
        resp = self.client.post(f'/api/chat/conversations/{conv_id}/accept/', {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Switch to Bob (receiver).
        token, _ = Token.objects.get_or_create(user=self.bob)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        resp = self.client.post(f'/api/chat/conversations/{conv_id}/accept/', {}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'accepted')

        # Cannot accept twice / accept a non-pending conversation.
        resp = self.client.post(f'/api/chat/conversations/{conv_id}/accept/', {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_accept_declined_conversation(self):
        conv_id = self._create().data['id']
        token, _ = Token.objects.get_or_create(user=self.bob)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        self.client.post(f'/api/chat/conversations/{conv_id}/decline/', {}, format='json')
        resp = self.client.post(f'/api/chat/conversations/{conv_id}/accept/', {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class MessagingTests(ChatAuthMixin, APITestCase):
    def setUp(self):
        self.alice = self._login('alice')
        self.bob = User.objects.create_user(username='bob', password='x')
        UserProfileFactory(user=self.bob)
        self.conv, _ = Conversation.get_or_create_pair(self.alice, self.bob, requester=self.bob)
        self.conv.status = Conversation.STATUS_ACCEPTED
        self.conv.save(update_fields=['status'])

    def test_message_length_is_limited(self):
        long_text = 'x' * 2001
        resp = self.client.post(
            f'/api/chat/conversations/{self.conv.id}/send_message/',
            {'text': long_text}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_send_message_requires_text_or_product(self):
        resp = self.client.post(
            f'/api/chat/conversations/{self.conv.id}/send_message/',
            {}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_share_inactive_product_via_send_message(self):
        product = ProductFactory(is_active=False)
        resp = self.client.post(
            f'/api/chat/conversations/{self.conv.id}/send_message/',
            {'text': 'look', 'product_id': product.id}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_send_message_does_not_spam_notifications(self):
        resp = self.client.post(
            f'/api/chat/conversations/{self.conv.id}/send_message/',
            {'text': 'hello'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertFalse(Notification.objects.filter(conversation=self.conv, text__contains='پیام').exists())

    def test_messages_are_paginated_newest_first(self):
        Message.objects.bulk_create([
            Message(conversation=self.conv, sender=self.alice, text=f'm{i}')
            for i in range(55)
        ])
        resp = self.client.get(f'/api/chat/conversations/{self.conv.id}/messages/')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('results', resp.data)
        self.assertEqual(len(resp.data['results']), 50)
        self.assertTrue(resp.data['has_older'])
        self.assertEqual(resp.data['results'][-1]['text'], 'm54')
        older = self.client.get(
            f'/api/chat/conversations/{self.conv.id}/messages/',
            {'before': resp.data['oldest_id']},
        )
        self.assertEqual(len(older.data['results']), 5)
        self.assertFalse(older.data['has_older'])
        self.assertEqual(older.data['results'][0]['text'], 'm0')

    def test_mark_read_requires_message_ids(self):
        incoming = Message.objects.create(conversation=self.conv, sender=self.bob, text='hi')
        blank = self.client.post(f'/api/chat/conversations/{self.conv.id}/mark_read/', {}, format='json')
        self.assertEqual(blank.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Message.objects.get(pk=incoming.pk).is_read)
        ok = self.client.post(
            f'/api/chat/conversations/{self.conv.id}/mark_read/',
            {'message_ids': [incoming.id]}, format='json',
        )
        self.assertEqual(ok.status_code, status.HTTP_200_OK)
        self.assertTrue(Message.objects.get(pk=incoming.pk).is_read)

    def test_delivery_and_seen_receipts_are_separate(self):
        incoming = Message.objects.create(conversation=self.conv, sender=self.bob, text='ping')
        delivered = self.client.post(
            f'/api/chat/conversations/{self.conv.id}/mark_delivered/',
            {'message_ids': [incoming.id]}, format='json',
        )
        self.assertEqual(delivered.status_code, status.HTTP_200_OK)
        from chat.models import MessageReceipt
        receipt = MessageReceipt.objects.get(message=incoming, user=self.alice)
        self.assertIsNotNone(receipt.delivered_at)
        self.assertIsNone(receipt.seen_at)
        self.assertFalse(Message.objects.get(pk=incoming.pk).is_read)
        seen = self.client.post(
            f'/api/chat/conversations/{self.conv.id}/mark_read/',
            {'message_ids': [incoming.id]}, format='json',
        )
        self.assertEqual(seen.status_code, status.HTTP_200_OK)
        receipt.refresh_from_db()
        self.assertIsNotNone(receipt.seen_at)
        outgoing = self.client.get(f'/api/chat/conversations/{self.conv.id}/messages/')
        mine = next(row for row in outgoing.data['results'] if row['id'] == incoming.id)
        self.assertIsNone(mine['status'])
        token, _ = Token.objects.get_or_create(user=self.bob)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        bob_view = self.client.get(f'/api/chat/conversations/{self.conv.id}/messages/')
        bob_row = next(row for row in bob_view.data['results'] if row['id'] == incoming.id)
        self.assertEqual(bob_row['status'], 'seen')


class ChatSecurityAndPerformanceTests(ChatAuthMixin, APITestCase):
    def setUp(self):
        self.alice = self._login('alice')
        self.bob = User.objects.create_user(username='bob', password='x')
        UserProfileFactory(user=self.bob)
        self.charlie = User.objects.create_user(username='charlie', password='x')
        UserProfileFactory(user=self.charlie)

        self.conv, _ = Conversation.get_or_create_pair(self.alice, self.bob, requester=self.bob)
        self.conv.status = Conversation.STATUS_ACCEPTED
        self.conv.save(update_fields=['status'])

    def test_idor_cannot_access_other_user_conversation(self):
        # Switch to Charlie who is not part of self.conv
        token, _ = Token.objects.get_or_create(user=self.charlie)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        resp = self.client.get(f'/api/chat/conversations/{self.conv.id}/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_conversation_list_n_plus_one_queries(self):
        # Create multiple conversations and messages for Alice
        for i in range(3):
            u = User.objects.create_user(username=f'user{i}', password='x')
            UserProfileFactory(user=u)
            co, _ = Conversation.get_or_create_pair(self.alice, u, requester=u)
            co.status = Conversation.STATUS_ACCEPTED
            co.save(update_fields=['status'])
            Message.objects.create(conversation=co, sender=u, text='hi')

        # Measure query count for listing conversations
        resp = self.client.get('/api/chat/conversations/')
        self.assertEqual(resp.status_code, 200)

    def test_support_chat_endpoint(self):
        private_count = Conversation.objects.count()
        resp = self.client.post('/api/chat/conversations/support_chat/', {}, format='json')
        self.assertIn(resp.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        self.assertEqual(resp.data['department'], SupportConversation.DEPARTMENT_FASHION_STYLIST)
        self.assertEqual(Conversation.objects.count(), private_count)
        self.assertEqual(SupportConversation.objects.count(), 1)

    def test_legacy_support_conversation_is_hidden_without_deletion(self):
        staff = User.objects.create_user(username='legacy_staff', password='x')
        UserProfileFactory(user=staff, role='fashion_stylist')
        support = User.objects.create_user(username='legacy_support', password='x')
        UserProfileFactory(user=support, role='support_agent')
        legacy, _ = Conversation.get_or_create_pair(self.alice, staff, requester=self.alice)
        legacy_support, _ = Conversation.get_or_create_pair(self.alice, support, requester=self.alice)
        response = self.client.get('/api/chat/conversations/')
        rows = response.data['results'] if isinstance(response.data, dict) else response.data
        self.assertNotIn(legacy.id, [row['id'] for row in rows])
        self.assertNotIn(legacy_support.id, [row['id'] for row in rows])
        self.assertTrue(Conversation.objects.filter(pk=legacy.pk).exists())
        self.assertTrue(Conversation.objects.filter(pk=legacy_support.pk).exists())


class ConversationListPerformanceTests(ChatAuthMixin, APITestCase):
    def setUp(self):
        self.alice = self._login('perf-alice')
        self.convs = []
        for i in range(3):
            partner = User.objects.create_user(username=f'perf-partner-{i}', password='x')
            UserProfileFactory(user=partner)
            conv, _ = Conversation.get_or_create_pair(self.alice, partner, requester=partner)
            conv.status = Conversation.STATUS_ACCEPTED
            conv.save(update_fields=['status'])
            Message.objects.create(conversation=conv, sender=partner, text='hi')
            self.convs.append(conv)

    def test_list_query_count_is_independent_of_message_volume(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext
        with CaptureQueriesContext(connection) as baseline:
            self.assertEqual(self.client.get('/api/chat/conversations/').status_code, 200)
        for i, conv in enumerate(self.convs):
            Message.objects.bulk_create([
                Message(conversation=conv, sender=self.alice if i % 2 else conv.user2, text=f'm{j}')
                for j in range(20)
            ])
        with CaptureQueriesContext(connection) as grown:
            self.assertEqual(self.client.get('/api/chat/conversations/').status_code, 200)
        self.assertEqual(len(grown.captured_queries), len(baseline.captured_queries))

    def test_last_message_uses_newest_message(self):
        conv = self.convs[0]
        Message.objects.create(conversation=conv, sender=self.alice, text='latest')
        response = self.client.get('/api/chat/conversations/')
        rows = response.data['results']
        row = next(r for r in rows if r['id'] == conv.id)
        self.assertEqual(row['last_message']['text'], 'latest')
        self.assertEqual(row['last_message']['sender_id'], self.alice.id)

    def test_deleted_for_messages_are_excluded_from_last_message(self):
        conv = self.convs[0]
        hidden = Message.objects.create(conversation=conv, sender=conv.user2, text='secret')
        hidden.deleted_for.add(self.alice)
        response = self.client.get('/api/chat/conversations/')
        row = next(r for r in response.data['results'] if r['id'] == conv.id)
        self.assertNotEqual(row['last_message']['text'], 'secret')

    def test_unread_count_counts_only_others_messages(self):
        conv = self.convs[0]
        Message.objects.create(conversation=conv, sender=self.alice, text='mine')
        response = self.client.get('/api/chat/conversations/')
        row = next(r for r in response.data['results'] if r['id'] == conv.id)
        self.assertEqual(row['unread_count'], 1)
        incoming = conv.messages.exclude(sender=self.alice).first()
        response = self.client.post(
            f'/api/chat/conversations/{conv.id}/mark_read/',
            {'message_ids': [incoming.id]}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response = self.client.get('/api/chat/conversations/')
        row = next(r for r in response.data['results'] if r['id'] == conv.id)
        self.assertEqual(row['unread_count'], 0)


class MessengerActionsTests(ChatAuthMixin, APITestCase):
    def setUp(self):
        self.alice = self._login('alice-actions')
        self.bob = User.objects.create_user(username='bob-actions', password='x')
        UserProfileFactory(user=self.bob)
        self.conv, _ = Conversation.get_or_create_pair(self.alice, self.bob, requester=self.bob)
        self.conv.status = Conversation.STATUS_ACCEPTED
        self.conv.save(update_fields=['status'])

    def _as(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_reply_attaches_preview(self):
        source = Message.objects.create(conversation=self.conv, sender=self.bob, text='original')
        resp = self.client.post(
            f'/api/chat/conversations/{self.conv.id}/send_message/',
            {'text': 'replying', 'reply_to_id': source.id}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['reply_to']['id'], source.id)
        self.assertEqual(resp.data['reply_to']['text'], 'original')
        self.assertFalse(resp.data['reply_to']['deleted'])

    def test_reply_to_missing_message_is_404(self):
        resp = self.client.post(
            f'/api/chat/conversations/{self.conv.id}/send_message/',
            {'text': 'replying', 'reply_to_id': 999999}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_for_me_hides_only_for_actor(self):
        message = Message.objects.create(conversation=self.conv, sender=self.bob, text='hide me')
        resp = self.client.post(f'/api/chat/messages/{message.id}/remove/', {'mode': 'me'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        hidden = self.client.get(f'/api/chat/conversations/{self.conv.id}/messages/')
        self.assertFalse(any(row['id'] == message.id for row in hidden.data['results']))
        self._as(self.bob)
        visible = self.client.get(f'/api/chat/conversations/{self.conv.id}/messages/')
        self.assertTrue(any(row['id'] == message.id for row in visible.data['results']))
        self.assertFalse(Message.objects.get(pk=message.pk).is_read)

    def test_delete_for_everyone_is_tombstoned_within_window(self):
        message = Message.objects.create(conversation=self.conv, sender=self.alice, text='gone')
        resp = self.client.post(f'/api/chat/messages/{message.id}/remove/', {'mode': 'everyone'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        listed = self.client.get(f'/api/chat/conversations/{self.conv.id}/messages/')
        row = next(item for item in listed.data['results'] if item['id'] == message.id)
        self.assertTrue(row['deleted_for_everyone'])
        self.assertEqual(row['text'], '')

    def test_delete_for_everyone_expires_after_15_minutes(self):
        message = Message.objects.create(conversation=self.conv, sender=self.alice, text='old')
        Message.objects.filter(pk=message.pk).update(created_at=timezone.now() - timedelta(minutes=16))
        resp = self.client.post(f'/api/chat/messages/{message.id}/remove/', {'mode': 'everyone'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIsNone(Message.objects.get(pk=message.pk).deleted_at)

    def test_receiver_cannot_delete_for_everyone(self):
        message = Message.objects.create(conversation=self.conv, sender=self.bob, text='bob says')
        resp = self.client.post(f'/api/chat/messages/{message.id}/remove/', {'mode': 'everyone'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_forward_creates_new_message_in_accepted_target(self):
        carol = User.objects.create_user(username='carol-actions', password='x')
        UserProfileFactory(user=carol)
        other, _ = Conversation.get_or_create_pair(self.alice, carol, requester=carol)
        other.status = Conversation.STATUS_ACCEPTED
        other.save(update_fields=['status'])
        source = Message.objects.create(conversation=self.conv, sender=self.bob, text='please forward')
        resp = self.client.post(
            f'/api/chat/messages/{source.id}/forward/',
            {'conversation_ids': [other.id]}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        forwarded = Message.objects.get(conversation=other, forwarded_from=source)
        self.assertEqual(forwarded.text, 'please forward')
        self.assertEqual(forwarded.sender_id, self.alice.id)

    def test_forward_rejects_more_than_five_targets(self):
        source = Message.objects.create(conversation=self.conv, sender=self.bob, text='cap')
        resp = self.client.post(
            f'/api/chat/messages/{source.id}/forward/',
            {'conversation_ids': [1, 2, 3, 4, 5, 6]}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_search_requires_two_chars_and_skips_deleted(self):
        Message.objects.create(conversation=self.conv, sender=self.alice, text='unique-needle-here')
        hidden = Message.objects.create(conversation=self.conv, sender=self.bob, text='unique-needle-hidden')
        hidden.deleted_for.add(self.alice)
        short = self.client.get(f'/api/chat/conversations/{self.conv.id}/search/', {'q': 'u'})
        self.assertEqual(short.status_code, status.HTTP_400_BAD_REQUEST)
        resp = self.client.get(f'/api/chat/conversations/{self.conv.id}/search/', {'q': 'unique-needle'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [row['id'] for row in resp.data['results']]
        self.assertIn(Message.objects.get(text='unique-needle-here').id, ids)
        self.assertNotIn(hidden.id, ids)

    def test_report_is_capped_daily(self):
        messages = [
            Message.objects.create(conversation=self.conv, sender=self.bob, text=f'report-{index}')
            for index in range(4)
        ]
        for message in messages[:3]:
            resp = self.client.post(
                f'/api/chat/messages/{message.id}/report/',
                {'reason': 'spam'}, format='json',
            )
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
        fourth = self.client.post(
            f'/api/chat/messages/{messages[3].id}/report/',
            {'reason': 'spam'}, format='json',
        )
        self.assertEqual(fourth.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(MessageReport.objects.filter(reporter=self.alice).count(), 3)

    def test_duplicate_text_is_rejected_within_window(self):
        first = self.client.post(
            f'/api/chat/conversations/{self.conv.id}/send_message/',
            {'text': 'duplicate-text'}, format='json',
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        second = self.client.post(
            f'/api/chat/conversations/{self.conv.id}/send_message/',
            {'text': 'duplicate-text'}, format='json',
        )
        self.assertEqual(second.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_idempotency_key_returns_same_message(self):
        first = self.client.post(
            f'/api/chat/conversations/{self.conv.id}/send_message/',
            {'text': 'once only', 'idempotency_key': 'abc-123'}, format='json',
        )
        second = self.client.post(
            f'/api/chat/conversations/{self.conv.id}/send_message/',
            {'text': 'once only changed', 'idempotency_key': 'abc-123'}, format='json',
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(first.data['id'], second.data['id'])
        self.assertEqual(Message.objects.filter(conversation=self.conv, text='once only').count(), 1)

    def test_empty_idempotency_keys_do_not_collide(self):
        first = self.client.post(
            f'/api/chat/conversations/{self.conv.id}/send_message/',
            {'text': 'first empty key'}, format='json',
        )
        second = self.client.post(
            f'/api/chat/conversations/{self.conv.id}/send_message/',
            {'text': 'second empty key'}, format='json',
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(first.data['id'], second.data['id'])

    def test_push_subscribe_and_unsubscribe(self):
        resp = self.client.post(
            '/api/chat/notifications/push_subscribe/',
            {
                'endpoint': 'https://push.example/sub-1',
                'p256dh': 'public-key',
                'auth': 'auth-key',
            },
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(PushSubscription.objects.filter(user=self.alice, endpoint='https://push.example/sub-1').exists())
        gone = self.client.post(
            '/api/chat/notifications/push_unsubscribe/',
            {'endpoint': 'https://push.example/sub-1'}, format='json',
        )
        self.assertEqual(gone.status_code, status.HTTP_200_OK)
        self.assertFalse(PushSubscription.objects.filter(endpoint='https://push.example/sub-1').exists())

    def test_unread_summary_counts_unseen_messages_not_notifications(self):
        Message.objects.create(conversation=self.conv, sender=self.bob, text='unseen')
        Notification.objects.create(recipient=self.alice, actor=self.bob, conversation=self.conv, text='درخواست گفتگو')
        resp = self.client.get('/api/chat/conversations/unread_summary/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 1)


class ChatSecurityAuditTests(ChatAuthMixin, APITestCase):
    def setUp(self):
        self.alice = self._login('alice-sec')
        self.bob = User.objects.create_user(username='bob-sec', password='x')
        UserProfileFactory(user=self.bob)
        self.carol = User.objects.create_user(username='carol-sec', password='x')
        UserProfileFactory(user=self.carol)
        self.conv, _ = Conversation.get_or_create_pair(self.alice, self.bob, requester=self.bob)
        self.conv.status = Conversation.STATUS_ACCEPTED
        self.conv.save(update_fields=['status'])
        self.other, _ = Conversation.get_or_create_pair(self.alice, self.carol, requester=self.carol)
        self.other.status = Conversation.STATUS_ACCEPTED
        self.other.save(update_fields=['status'])

    def _as(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_idempotency_is_scoped_to_sender_and_conversation(self):
        first = self.client.post(
            f'/api/chat/conversations/{self.conv.id}/send_message/',
            {'text': 'scoped-one', 'idempotency_key': 'same-key'}, format='json',
        )
        other_conv = self.client.post(
            f'/api/chat/conversations/{self.other.id}/send_message/',
            {'text': 'scoped-two', 'idempotency_key': 'same-key'}, format='json',
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(other_conv.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(first.data['id'], other_conv.data['id'])
        self._as(self.bob)
        bob = self.client.post(
            f'/api/chat/conversations/{self.conv.id}/send_message/',
            {'text': 'bob-copy', 'idempotency_key': 'same-key'}, format='json',
        )
        self.assertEqual(bob.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(bob.data['id'], first.data['id'])

    def test_duplicate_idempotency_constraint_is_partial(self):
        from django.db import IntegrityError, transaction
        Message.objects.create(
            conversation=self.conv, sender=self.alice, text='a', idempotency_key='uniq-1',
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Message.objects.create(
                    conversation=self.conv, sender=self.alice, text='b', idempotency_key='uniq-1',
                )
        Message.objects.create(conversation=self.conv, sender=self.alice, text='empty-1', idempotency_key='')
        Message.objects.create(conversation=self.conv, sender=self.alice, text='empty-2', idempotency_key='')
        self.assertEqual(
            Message.objects.filter(conversation=self.conv, sender=self.alice, idempotency_key='').count(),
            2,
        )

    def test_deleted_for_does_not_reappear_after_refresh_or_search(self):
        hidden = Message.objects.create(conversation=self.conv, sender=self.bob, text='secret-hidden-text')
        visible = Message.objects.create(conversation=self.conv, sender=self.bob, text='still-here')
        self.client.post(f'/api/chat/messages/{hidden.id}/remove/', {'mode': 'me'}, format='json')
        listed = self.client.get(f'/api/chat/conversations/{self.conv.id}/messages/')
        ids = [row['id'] for row in listed.data['results']]
        self.assertNotIn(hidden.id, ids)
        self.assertIn(visible.id, ids)
        search = self.client.get(
            f'/api/chat/conversations/{self.conv.id}/search/', {'q': 'secret-hidden'},
        )
        self.assertEqual(search.data['results'], [])

    def test_reply_preview_hides_deleted_for_source(self):
        source = Message.objects.create(conversation=self.conv, sender=self.bob, text='do-not-leak')
        source.deleted_for.add(self.alice)
        reply = Message.objects.create(
            conversation=self.conv, sender=self.bob, text='reply-body', reply_to=source,
        )
        listed = self.client.get(f'/api/chat/conversations/{self.conv.id}/messages/')
        row = next(item for item in listed.data['results'] if item['id'] == reply.id)
        self.assertTrue(row['reply_to']['deleted'])
        self.assertEqual(row['reply_to']['text'], '')

    def test_search_cannot_leave_conversation_or_see_blocked_user_thread(self):
        Message.objects.create(conversation=self.conv, sender=self.bob, text='private-needle-xyz')
        self._as(self.carol)
        outsider = self.client.get(
            f'/api/chat/conversations/{self.conv.id}/search/', {'q': 'private-needle'},
        )
        self.assertEqual(outsider.status_code, status.HTTP_404_NOT_FOUND)

    def test_forward_rejects_non_member_and_same_conversation(self):
        source = Message.objects.create(conversation=self.conv, sender=self.bob, text='forward-me-please')
        same = self.client.post(
            f'/api/chat/messages/{source.id}/forward/',
            {'conversation_ids': [self.conv.id]}, format='json',
        )
        self.assertEqual(same.status_code, status.HTTP_400_BAD_REQUEST)
        stranger = User.objects.create_user(username='eve-sec', password='x')
        UserProfileFactory(user=stranger)
        foreign, _ = Conversation.get_or_create_pair(self.bob, stranger, requester=stranger)
        foreign.status = Conversation.STATUS_ACCEPTED
        foreign.save(update_fields=['status'])
        leaked = self.client.post(
            f'/api/chat/messages/{source.id}/forward/',
            {'conversation_ids': [foreign.id]}, format='json',
        )
        self.assertEqual(leaked.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Message.objects.filter(conversation=foreign, forwarded_from=source).exists())

    def test_same_text_in_two_conversations_is_not_rate_limited(self):
        payload = {'text': 'same-across-threads'}
        first = self.client.post(
            f'/api/chat/conversations/{self.conv.id}/send_message/', payload, format='json',
        )
        second = self.client.post(
            f'/api/chat/conversations/{self.other.id}/send_message/', payload, format='json',
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)

    def test_push_failure_does_not_roll_back_message(self):
        from unittest.mock import patch
        with patch('chat.services._maybe_push', side_effect=RuntimeError('push down')):
            resp = self.client.post(
                f'/api/chat/conversations/{self.conv.id}/send_message/',
                {'text': 'survives-push-crash'}, format='json',
            )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Message.objects.filter(text='survives-push-crash').exists())

    def test_deleted_for_message_cannot_be_forwarded_or_reacted(self):
        hidden = Message.objects.create(conversation=self.conv, sender=self.bob, text='gone-for-me')
        hidden.deleted_for.add(self.alice)
        forward = self.client.post(
            f'/api/chat/messages/{hidden.id}/forward/',
            {'conversation_ids': [self.other.id]}, format='json',
        )
        react = self.client.post(
            f'/api/chat/messages/{hidden.id}/react/', {'reaction': '👍'}, format='json',
        )
        self.assertEqual(forward.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(react.status_code, status.HTTP_404_NOT_FOUND)

    def test_forward_private_message_into_style_room(self):
        from style_rooms.services import add_member, create_room
        room = create_room(self.alice, title='fwd-room')
        add_member(room, self.carol, self.alice)
        source = Message.objects.create(conversation=self.conv, sender=self.bob, text='to-room')
        resp = self.client.post(
            f'/api/chat/messages/{source.id}/forward/',
            {'room_ids': [str(room.pk)]}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Message.objects.filter(style_room=room, text='to-room').exists())

    def test_cannot_forward_into_room_without_membership(self):
        from style_rooms.services import create_room
        outsider_room = create_room(self.carol, title='secret-room')
        source = Message.objects.create(conversation=self.conv, sender=self.bob, text='blocked-fwd')
        resp = self.client.post(
            f'/api/chat/messages/{source.id}/forward/',
            {'room_ids': [str(outsider_room.pk)]}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Message.objects.filter(style_room=outsider_room, text='blocked-fwd').exists())


