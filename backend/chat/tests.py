from datetime import timedelta

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token

from shop.tests import ProductFactory, UserProfileFactory, create_user_with_token
from .models import Conversation, Message, Notification


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
