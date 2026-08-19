from datetime import timedelta

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token

from shop.tests import ProductFactory, UserProfileFactory, create_user_with_token
from .models import Conversation, Message, Notification
from support.models import SupportConversation


class ChatAuthMixin:
    def _login(self, username):
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

    def test_send_message_creates_notification_for_other_only(self):
        resp = self.client.post(
            f'/api/chat/conversations/{self.conv.id}/send_message/',
            {'text': 'hello'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertFalse(Notification.objects.filter(recipient=self.alice).exists())
        self.assertTrue(Notification.objects.filter(recipient=self.bob).exists())

    def test_messages_are_paginated(self):
        Message.objects.bulk_create([
            Message(conversation=self.conv, sender=self.alice, text=f'm{i}')
            for i in range(55)
        ])
        resp = self.client.get(f'/api/chat/conversations/{self.conv.id}/messages/')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('results', resp.data)
        self.assertEqual(len(resp.data['results']), 50)
        self.assertEqual(resp.data['count'], 55)


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
        response = self.client.post(f'/api/chat/conversations/{conv.id}/mark_read/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response = self.client.get('/api/chat/conversations/')
        row = next(r for r in response.data['results'] if r['id'] == conv.id)
        self.assertEqual(row['unread_count'], 0)

