"""Tests for Style Room chat features: deletion, forwarding, idempotency, and blocking."""
from datetime import timedelta

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from shop.tests import UserProfileFactory, create_user_with_token
from chat.models import Block, Message
from style_rooms.models import StyleRoom, StyleRoomMember
from style_rooms.services import create_room, add_member, create_room_message


class StyleRoomChatTestMixin:
    def setUp(self):
        cache.clear()
        self.owner, self.owner_token = create_user_with_token(username='room-owner')
        UserProfileFactory(user=self.owner)
        self.member, self.member_token = create_user_with_token(username='room-member')
        UserProfileFactory(user=self.member)
        self.outsider, self.outsider_token = create_user_with_token(username='room-outsider')
        UserProfileFactory(user=self.outsider)
        self.room = create_room(self.owner, title='Test Room')
        add_member(self.room, self.member, self.owner)

    def _auth(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')


class StyleRoomDeletionTests(StyleRoomChatTestMixin, APITestCase):
    def test_delete_for_me_hides_only_for_actor(self):
        msg = create_room_message(self.room, self.member, text='hide me')
        self._auth(self.owner_token)
        resp = self.client.post(
            f'/api/style-rooms/{self.room.pk}/messages/{msg.pk}/delete/',
            {'mode': 'me'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # Owner no longer sees it
        messages = self.client.get(f'/api/style-rooms/{self.room.pk}/messages/')
        self.assertFalse(any(r['id'] == msg.pk for r in messages.data['results']))
        # Member still sees it
        self._auth(self.member_token)
        messages = self.client.get(f'/api/style-rooms/{self.room.pk}/messages/')
        self.assertTrue(any(r['id'] == msg.pk for r in messages.data['results']))

    def test_delete_for_everyone_by_sender(self):
        msg = create_room_message(self.room, self.owner, text='gone')
        self._auth(self.owner_token)
        resp = self.client.post(
            f'/api/style-rooms/{self.room.pk}/messages/{msg.pk}/delete/',
            {'mode': 'everyone'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        messages = self.client.get(f'/api/style-rooms/{self.room.pk}/messages/')
        row = next(r for r in messages.data['results'] if r['id'] == msg.pk)
        self.assertTrue(row['deleted_for_everyone'])
        self.assertEqual(row['text'], '')

    def test_delete_for_everyone_by_room_owner(self):
        msg = create_room_message(self.room, self.member, text='owner can delete')
        self._auth(self.owner_token)
        resp = self.client.post(
            f'/api/style-rooms/{self.room.pk}/messages/{msg.pk}/delete/',
            {'mode': 'everyone'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_delete_for_everyone_rejected_for_non_sender_non_owner(self):
        msg = create_room_message(self.room, self.owner, text='protected')
        self._auth(self.member_token)
        resp = self.client.post(
            f'/api/style-rooms/{self.room.pk}/messages/{msg.pk}/delete/',
            {'mode': 'everyone'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_for_everyone_expires_after_15_minutes(self):
        msg = create_room_message(self.room, self.owner, text='old')
        Message.objects.filter(pk=msg.pk).update(created_at=timezone.now() - timedelta(minutes=16))
        self._auth(self.owner_token)
        resp = self.client.post(
            f'/api/style-rooms/{self.room.pk}/messages/{msg.pk}/delete/',
            {'mode': 'everyone'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_member_cannot_delete(self):
        msg = create_room_message(self.room, self.owner, text='protected')
        self._auth(self.outsider_token)
        resp = self.client.post(
            f'/api/style-rooms/{self.room.pk}/messages/{msg.pk}/delete/',
            {'mode': 'me'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_is_idempotent(self):
        msg = create_room_message(self.room, self.owner, text='once')
        self._auth(self.owner_token)
        resp1 = self.client.post(
            f'/api/style-rooms/{self.room.pk}/messages/{msg.pk}/delete/',
            {'mode': 'everyone'}, format='json',
        )
        resp2 = self.client.post(
            f'/api/style-rooms/{self.room.pk}/messages/{msg.pk}/delete/',
            {'mode': 'everyone'}, format='json',
        )
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)


class StyleRoomIdempotencyTests(StyleRoomChatTestMixin, APITestCase):
    def test_duplicate_idempotency_key_returns_same_message(self):
        self._auth(self.owner_token)
        resp1 = self.client.post(
            f'/api/style-rooms/{self.room.pk}/messages/',
            {'text': 'once only', 'idempotency_key': 'test-key-123'}, format='json',
        )
        resp2 = self.client.post(
            f'/api/style-rooms/{self.room.pk}/messages/',
            {'text': 'different text', 'idempotency_key': 'test-key-123'}, format='json',
        )
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp1.data['id'], resp2.data['id'])

    def test_empty_idempotency_keys_do_not_collide(self):
        self._auth(self.owner_token)
        resp1 = self.client.post(
            f'/api/style-rooms/{self.room.pk}/messages/',
            {'text': 'first'}, format='json',
        )
        resp2 = self.client.post(
            f'/api/style-rooms/{self.room.pk}/messages/',
            {'text': 'second'}, format='json',
        )
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(resp1.data['id'], resp2.data['id'])


class StyleRoomBlockingTests(StyleRoomChatTestMixin, APITestCase):
    def test_blocked_users_can_still_communicate_in_shared_room(self):
        # Block the member
        Block.objects.create(blocker=self.owner, blocked=self.member)
        # Both are still members of the room
        self.assertTrue(self.room.is_member(self.owner))
        self.assertTrue(self.room.is_member(self.member))
        # Member can still send messages
        msg = create_room_message(self.room, self.member, text='still here')
        self.assertIsNotNone(msg)
        self.assertEqual(msg.text, 'still here')
        # Owner can still see messages
        self._auth(self.owner_token)
        messages = self.client.get(f'/api/style-rooms/{self.room.pk}/messages/')
        self.assertTrue(any(r['id'] == msg.pk for r in messages.data['results']))

    def test_blocked_user_cannot_be_invited_to_room(self):
        Block.objects.create(blocker=self.owner, blocked=self.outsider)
        self._auth(self.owner_token)
        resp = self.client.post(
            f'/api/style-rooms/{self.room.pk}/members/',
            {'user_id': self.outsider.id}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class StyleRoomForwardTests(StyleRoomChatTestMixin, APITestCase):
    def test_forward_room_message_to_private_chat(self):
        from chat.models import Conversation
        conv, _ = Conversation.get_or_create_pair(self.owner, self.member, requester=self.owner)
        conv.status = Conversation.STATUS_ACCEPTED
        conv.save(update_fields=['status'])
        msg = create_room_message(self.room, self.owner, text='room-to-private')
        self._auth(self.owner_token)
        resp = self.client.post(
            f'/api/style-rooms/{self.room.pk}/messages/{msg.pk}/forward/',
            {'conversation_ids': [conv.id]}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Message.objects.filter(conversation=conv, text='room-to-private').exists())

    def test_forward_room_to_another_room_requires_membership(self):
        other = create_room(self.member, title='other-room')
        msg = create_room_message(self.room, self.owner, text='room-to-room')
        self._auth(self.owner_token)
        denied = self.client.post(
            f'/api/style-rooms/{self.room.pk}/messages/{msg.pk}/forward/',
            {'room_ids': [str(other.pk)]}, format='json',
        )
        self.assertEqual(denied.status_code, status.HTTP_400_BAD_REQUEST)
        add_member(other, self.owner, self.member)
        ok = self.client.post(
            f'/api/style-rooms/{self.room.pk}/messages/{msg.pk}/forward/',
            {'room_ids': [str(other.pk)]}, format='json',
        )
        self.assertEqual(ok.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Message.objects.filter(style_room=other, text='room-to-room').exists())

    def test_deleted_room_message_cannot_be_forwarded(self):
        msg = create_room_message(self.room, self.owner, text='gone')
        msg.deleted_at = timezone.now()
        msg.save(update_fields=['deleted_at'])
        self._auth(self.owner_token)
        resp = self.client.post(
            f'/api/style-rooms/{self.room.pk}/messages/{msg.pk}/forward/',
            {'room_ids': [str(self.room.pk)]}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
