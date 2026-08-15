import uuid
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import User
from django.core.cache import cache
from django.db import connection
from django.test import override_settings
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from chat.models import Block, Message, Notification, StyleRoomMessageRead
from products.models import Wishlist
from shop.tests import AdminProfileFactory, ProductFactory, UserProfileFactory, create_user_with_token

from .models import (
    MAX_ROOM_MEMBERS,
    EVENT_ROOM_CREATED,
    EVENT_ROOM_UPDATED,
    EVENT_ROOM_MEMBER_INVITED,
    EVENT_ROOM_MEMBER_JOINED,
    EVENT_ROOM_MEMBER_LEFT,
    EVENT_ROOM_MEMBER_REMOVED,
    EVENT_ROOM_ITEM_ADDED,
    EVENT_ROOM_ITEM_REMOVED,
    StyleRoom,
    StyleRoomEvent,
    StyleRoomItem,
    StyleRoomMember,
)
from .services import (
    RoomMemberLimitExceeded,
    add_member,
    create_room,
    issue_invite_token,
    join_room,
)
from .throttles import StyleRoomInviteThrottle, StyleRoomWriteThrottle


class StyleRoomAuthMixin:
    def _login(self, username='alice'):
        user, token = create_user_with_token(username=username)
        UserProfileFactory(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        return user

    def _auth_as(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def _create_room(self, user, title='Look Friday'):
        room = StyleRoom.objects.create(owner=user, title=title)
        StyleRoomMember.objects.create(room=room, user=user, role=StyleRoomMember.ROLE_OWNER)
        return room

    def _add_item(self, room, product, user):
        return StyleRoomItem.objects.create(room=room, product=product, added_by=user)

    def _new_member(self, username):
        return User.objects.create_user(username=username, password='x')

    def _event_payloads(self, room, event_type):
        return [
            e.payload for e in StyleRoomEvent.objects.filter(room=room, type=event_type)
        ]


class AuthenticationTests(StyleRoomAuthMixin, APITestCase):
    def test_unauthenticated_cannot_create_room(self):
        resp = self.client.post('/api/style-rooms/', {'title': 'x'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_cannot_list_rooms(self):
        resp = self.client.get('/api/style-rooms/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_cannot_join(self):
        owner = self._login()
        room = self._create_room(owner)
        self.client.credentials()
        resp = self.client.post(f'/api/style-rooms/{room.id}/join/', {'token': 'x'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class RoomCrudTests(StyleRoomAuthMixin, APITestCase):
    def test_create_room(self):
        user = self._login()
        resp = self.client.post(
            '/api/style-rooms/', {'title': 'Friday Party Look', 'description': 'استایل مهمانی'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        room = StyleRoom.objects.get(id=resp.data['id'])
        self.assertEqual(room.owner_id, user.id)
        self.assertEqual(room.visibility, StyleRoom.VISIBILITY_PRIVATE)
        self.assertTrue(room.is_owner(user))
        self.assertTrue(StyleRoomMember.objects.filter(room=room, user=user, role='owner').exists())
        self.assertTrue(
            StyleRoomEvent.objects.filter(room=room, type=EVENT_ROOM_CREATED).exists()
        )

    def test_create_room_enforces_private_default(self):
        self._login()
        resp = self.client.post('/api/style-rooms/', {'title': 'T'}, format='json')
        self.assertEqual(resp.data['visibility'], StyleRoom.VISIBILITY_PRIVATE)

    def test_owner_can_update_room(self):
        user = self._login()
        room = self._create_room(user)
        resp = self.client.patch(
            f'/api/style-rooms/{room.id}/',
            {'title': 'New Title', 'visibility': 'invite_only'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        room.refresh_from_db()
        self.assertEqual(room.title, 'New Title')
        self.assertEqual(room.visibility, StyleRoom.VISIBILITY_INVITE_ONLY)
        self.assertTrue(
            StyleRoomEvent.objects.filter(room=room, type=EVENT_ROOM_UPDATED).exists()
        )

    def test_platform_admin_can_delete_a_style_room(self):
        owner = self._login('room-owner')
        room = self._create_room(owner)
        admin, token = create_user_with_token(username='room-admin')
        AdminProfileFactory(user=admin)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')

        response = self.client.delete(f'/api/style-rooms/{room.id}/')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(StyleRoom.objects.filter(pk=room.pk).exists())

    def test_member_cannot_update_room(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        member = self._new_member('member')
        StyleRoomMember.objects.create(room=room, user=member)
        self._auth_as(member)
        resp = self.client.patch(f'/api/style-rooms/{room.id}/', {'title': 'hack'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_delete_room(self):
        user = self._login()
        room = self._create_room(user)
        self._add_item(room, ProductFactory(), user)
        resp = self.client.delete(f'/api/style-rooms/{room.id}/')
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(resp.content, b'')
        self.assertFalse(StyleRoom.objects.filter(id=room.id).exists())
        self.assertFalse(StyleRoomItem.objects.filter(room=room).exists())
        self.assertFalse(StyleRoomEvent.objects.filter(room=room).exists())

    def test_member_cannot_delete_room(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        member = self._new_member('member')
        StyleRoomMember.objects.create(room=room, user=member)
        self._auth_as(member)
        resp = self.client.delete(f'/api/style-rooms/{room.id}/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(StyleRoom.objects.filter(id=room.id).exists())


class AccessControlTests(StyleRoomAuthMixin, APITestCase):
    def _mk_room(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        member = self._new_member('member2')
        StyleRoomMember.objects.create(room=room, user=member)
        return room

    def _outsider(self, username='outsider'):
        _, token = create_user_with_token(username=username)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')

    def test_non_member_gets_404_on_retrieve(self):
        room = self._mk_room()
        self._outsider()
        resp = self.client.get(f'/api/style-rooms/{room.id}/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_non_member_gets_404_on_items(self):
        room = self._mk_room()
        self._outsider('outsider2')
        resp = self.client.get(f'/api/style-rooms/{room.id}/items/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_non_member_gets_404_on_members(self):
        room = self._mk_room()
        self._outsider('outsider3')
        resp = self.client.get(f'/api/style-rooms/{room.id}/members/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_unknown_room_uuid_returns_404(self):
        self._login()
        resp = self.client.get(f'/api/style-rooms/{uuid.uuid4()}/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_only_returns_my_rooms(self):
        owner = self._login('owner')
        mine = self._create_room(owner, 'Mine')
        other = self._new_member('other')
        other_room = self._create_room(other, 'Their room')
        resp = self.client.get('/api/style-rooms/')
        ids = [r['id'] for r in resp.data['results']]
        self.assertIn(str(mine.id), ids)
        self.assertNotIn(str(other_room.id), ids)

    def test_member_response_flags(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        member = self._new_member('memflags')
        StyleRoomMember.objects.create(room=room, user=member)
        self._auth_as(member)
        resp = self.client.get(f'/api/style-rooms/{room.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(resp.data['is_owner'])
        self.assertEqual(resp.data['my_role'], 'member')

    def test_idor_cannot_add_item_to_other_room(self):
        room = self._mk_room()
        self._outsider('intruder')
        product = ProductFactory()
        resp = self.client.post(
            f'/api/style-rooms/{room.id}/items/', {'product_id': product.id}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


class BlockTests(StyleRoomAuthMixin, APITestCase):
    def test_cannot_invite_blocked_user(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        blocked = self._new_member('blockedpeer')
        Block.objects.create(blocker=owner, blocked=blocked)
        resp = self.client.post(
            f'/api/style-rooms/{room.id}/members/', {'user_id': blocked.id}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(StyleRoomMember.objects.filter(room=room, user=blocked).exists())

    def test_blocked_user_cannot_join(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        token, _ = issue_invite_token(room, owner)
        blocked = self._new_member('blockedpeer2')
        Block.objects.create(blocker=blocked, blocked=owner)
        self._auth_as(blocked)
        resp = self.client.post(
            f'/api/style-rooms/{room.id}/join/', {'token': token}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class InvitationTests(StyleRoomAuthMixin, APITestCase):
    def test_direct_invite_creates_member_event_and_notification(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        guest = self._new_member('guestinv')
        resp = self.client.post(
            f'/api/style-rooms/{room.id}/members/', {'user_id': guest.id}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(StyleRoomMember.objects.filter(room=room, user=guest, role='member').exists())
        payloads = self._event_payloads(room, EVENT_ROOM_MEMBER_INVITED)
        self.assertTrue(any(p.get('user_id') == guest.id for p in payloads))
        self.assertTrue(Notification.objects.filter(recipient=guest, is_read=False).exists())

    def test_invite_self_rejected(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        resp = self.client.post(
            f'/api/style-rooms/{room.id}/members/', {'user_id': owner.id}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_invite_rejected(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        guest = self._new_member('dupguy')
        StyleRoomMember.objects.create(room=room, user=guest)
        resp = self.client.post(
            f'/api/style-rooms/{room.id}/members/', {'user_id': guest.id}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invite_by_username(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        guest = self._new_member('byusername')
        resp = self.client.post(
            f'/api/style-rooms/{room.id}/members/', {'username': guest.username}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_unknown_invitee_returns_404(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        resp = self.client.post(
            f'/api/style-rooms/{room.id}/members/', {'user_id': 999999}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_member_cannot_invite(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        member = self._new_member('noinvite')
        StyleRoomMember.objects.create(room=room, user=member)
        self._auth_as(member)
        guest = self._new_member('someone')
        resp = self.client.post(
            f'/api/style-rooms/{room.id}/members/', {'user_id': guest.id}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_owner_cannot_get_token(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        member = self._new_member('notoken')
        StyleRoomMember.objects.create(room=room, user=member)
        self._auth_as(member)
        resp = self.client.post(f'/api/style-rooms/{room.id}/invite/', {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_join_with_valid_token(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        token, _ = issue_invite_token(room, owner)
        guest, gtoken = create_user_with_token(username='joiner')
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {gtoken}')
        resp = self.client.post(
            f'/api/style-rooms/{room.id}/join/', {'token': token}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(StyleRoomMember.objects.filter(room=room, user=guest).exists())
        self.assertTrue(
            StyleRoomEvent.objects.filter(room=room, type=EVENT_ROOM_MEMBER_JOINED).exists()
        )
        self.assertTrue(Notification.objects.filter(recipient=owner).exists())

    def test_join_with_invalid_token(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        issue_invite_token(room, owner)
        guest, gtoken = create_user_with_token(username='badjoiner')
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {gtoken}')
        resp = self.client.post(
            f'/api/style-rooms/{room.id}/join/', {'token': 'not-a-real-token'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(StyleRoomMember.objects.filter(room=room, user=guest).exists())

    def test_join_with_expired_token(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        token, _ = issue_invite_token(room, owner)
        room.invite_expires_at = timezone.now() - timedelta(minutes=1)
        room.save(update_fields=['invite_expires_at'])
        guest, gtoken = create_user_with_token(username='latejoiner')
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {gtoken}')
        resp = self.client.post(
            f'/api/style-rooms/{room.id}/join/', {'token': token}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('منقضی', resp.data['error'])

    def test_join_with_revoked_token(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        token, _ = issue_invite_token(room, owner)
        room.invite_revoked = True
        room.save(update_fields=['invite_revoked'])
        guest, gtoken = create_user_with_token(username='revokedjoiner')
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {gtoken}')
        resp = self.client.post(
            f'/api/style-rooms/{room.id}/join/', {'token': token}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('باطل', resp.data['error'])

    def test_new_invite_revokes_previous_token(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        old_token, _ = issue_invite_token(room, owner)
        new_token, _ = issue_invite_token(room, owner)
        self.assertNotEqual(old_token, new_token)

        guest, gtoken = create_user_with_token(username='pathtest')
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {gtoken}')
        resp_old = self.client.post(
            f'/api/style-rooms/{room.id}/join/', {'token': old_token}, format='json',
        )
        self.assertEqual(resp_old.status_code, status.HTTP_400_BAD_REQUEST)
        resp_new = self.client.post(
            f'/api/style-rooms/{room.id}/join/', {'token': new_token}, format='json',
        )
        self.assertEqual(resp_new.status_code, status.HTTP_201_CREATED)

    def test_hash_never_exposed(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        issue_invite_token(room, owner)
        payload = self.client.get(f'/api/style-rooms/{room.id}/').json()
        self.assertNotIn(room.invite_token_hash, str(payload))

    def test_max_members_enforced(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        for i in range(MAX_ROOM_MEMBERS - 1):
            guest = self._new_member(f'cap{i}')
            resp = self.client.post(
                f'/api/style-rooms/{room.id}/members/', {'user_id': guest.id}, format='json',
            )
            self.assertEqual(resp.status_code, status.HTTP_201_CREATED, msg=f'guest {i}')
        overflow = self._new_member('overflow')
        resp = self.client.post(
            f'/api/style-rooms/{room.id}/members/', {'user_id': overflow.id}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(StyleRoomMember.objects.filter(room=room, user=overflow).exists())

    def test_owner_removes_member(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        victim = self._new_member('evicted')
        StyleRoomMember.objects.create(room=room, user=victim)
        resp = self.client.delete(f'/api/style-rooms/{room.id}/members/{victim.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(StyleRoomMember.objects.filter(room=room, user=victim).exists())
        self.assertTrue(
            StyleRoomEvent.objects.filter(room=room, type=EVENT_ROOM_MEMBER_REMOVED).exists()
        )

    def test_member_cannot_remove_others(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        a = self._new_member('aa')
        b = self._new_member('bb')
        StyleRoomMember.objects.create(room=room, user=a)
        StyleRoomMember.objects.create(room=room, user=b)
        self._auth_as(a)
        resp = self.client.delete(f'/api/style-rooms/{room.id}/members/{b.id}/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_remove_owner(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        member = self._new_member('notowner')
        StyleRoomMember.objects.create(room=room, user=member)
        self._auth_as(member)
        resp = self.client.delete(f'/api/style-rooms/{room.id}/members/{owner.id}/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class ItemsTests(StyleRoomAuthMixin, APITestCase):
    def test_member_adds_active_product(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        member = self._new_member('addec')
        StyleRoomMember.objects.create(room=room, user=member)
        self._auth_as(member)
        product = ProductFactory(is_active=True)
        resp = self.client.post(
            f'/api/style-rooms/{room.id}/items/', {'product_id': product.id}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['product']['id'], product.id)
        payloads = self._event_payloads(room, EVENT_ROOM_ITEM_ADDED)
        self.assertTrue(any(p.get('product_id') == product.id for p in payloads))

    def test_nonexistent_product_rejected(self):
        user = self._login()
        room = self._create_room(user)
        resp = self.client.post(
            f'/api/style-rooms/{room.id}/items/', {'product_id': 999999}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_inactive_product_rejected(self):
        user = self._login()
        room = self._create_room(user)
        product = ProductFactory(is_active=False)
        resp = self.client.post(
            f'/api/style-rooms/{room.id}/items/', {'product_id': product.id}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(StyleRoomItem.objects.filter(room=room).exists())

    def test_duplicate_product_rejected(self):
        user = self._login()
        room = self._create_room(user)
        product = ProductFactory(is_active=True)
        first = self.client.post(
            f'/api/style-rooms/{room.id}/items/', {'product_id': product.id}, format='json',
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        second = self.client.post(
            f'/api/style-rooms/{room.id}/items/', {'product_id': product.id}, format='json',
        )
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

    def test_member_can_remove_own_item(self):
        user = self._login('owner')
        room = self._create_room(user)
        product = ProductFactory(is_active=True)
        item = self._add_item(room, product, user)
        resp = self.client.delete(f'/api/style-rooms/{room.id}/items/{item.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(StyleRoomItem.objects.filter(id=item.id).exists())
        payloads = self._event_payloads(room, EVENT_ROOM_ITEM_REMOVED)
        self.assertTrue(any(p.get('product_id') == product.id for p in payloads))

    def test_member_cannot_remove_others_item(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        other = self._new_member('otheradder')
        StyleRoomMember.objects.create(room=room, user=other)
        self._auth_as(other)
        product = ProductFactory(is_active=True)
        item = self.client.post(
            f'/api/style-rooms/{room.id}/items/', {'product_id': product.id}, format='json',
        ).json()
        member = self._new_member('rmother')
        StyleRoomMember.objects.create(room=room, user=member)
        self._auth_as(member)
        resp = self.client.delete(f'/api/style-rooms/{room.id}/items/{item["id"]}/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_remove_any_item(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        other = self._new_member('otheradder2')
        StyleRoomMember.objects.create(room=room, user=other)
        self._auth_as(other)
        product = ProductFactory(is_active=True)
        item = self.client.post(
            f'/api/style-rooms/{room.id}/items/', {'product_id': product.id}, format='json',
        ).json()
        self._auth_as(owner)
        resp = self.client.delete(f'/api/style-rooms/{room.id}/items/{item["id"]}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


class LeaveTests(StyleRoomAuthMixin, APITestCase):
    def test_member_leaves_room(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        member = self._new_member('leaver')
        StyleRoomMember.objects.create(room=room, user=member)
        self._auth_as(member)
        resp = self.client.post(f'/api/style-rooms/{room.id}/leave/', {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(StyleRoomMember.objects.filter(room=room, user=member).exists())
        self.assertTrue(
            StyleRoomEvent.objects.filter(room=room, type=EVENT_ROOM_MEMBER_LEFT).exists()
        )

    def test_owner_cannot_leave(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        resp = self.client.post(f'/api/style-rooms/{room.id}/leave/', {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_leaver_loses_access(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        member = self._new_member('goner')
        StyleRoomMember.objects.create(room=room, user=member)
        self._auth_as(member)
        self.client.post(f'/api/style-rooms/{room.id}/leave/', {}, format='json')
        resp = self.client.get(f'/api/style-rooms/{room.id}/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


class RateLimitTests(StyleRoomAuthMixin, APITestCase):
    def _with_rate(self, throttle_cls, scope, rate, fn):
        """Override both the DRF setting and the SimpleRateThrottle class-level
        snapshot (THROTTLE_RATES is captured at import time, so settings alone
        is not enough)."""
        from unittest import mock

        rates = {**settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'], scope: rate}
        with override_settings(
            REST_FRAMEWORK={**settings.REST_FRAMEWORK, 'DEFAULT_THROTTLE_RATES': rates}
        ):
            with mock.patch.object(throttle_cls, 'THROTTLE_RATES', rates):
                # Throttle keys (and pk reuse across rolled-back tests) leak through
                # the shared LocMem cache, so isolate this test's history.
                cache.clear()
                return fn()

    def test_room_write_throttled(self):
        def run():
            first = self.client.post('/api/style-rooms/', {'title': 'First'}, format='json')
            self.assertEqual(first.status_code, status.HTTP_201_CREATED)
            second = self.client.post('/api/style-rooms/', {'title': 'Second'}, format='json')
            self.assertEqual(second.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

        self._login()
        self._with_rate(StyleRoomWriteThrottle, 'room_write', '1/min', run)

    def test_invite_throttled(self):
        def run():
            room = self._create_room(self.owner)
            issue_invite_token(room, self.owner)
            first = self.client.post(f'/api/style-rooms/{room.id}/invite/', {}, format='json')
            self.assertEqual(first.status_code, status.HTTP_200_OK)
            second = self.client.post(f'/api/style-rooms/{room.id}/invite/', {}, format='json')
            self.assertEqual(second.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

        self.owner = self._login('owner')
        self._with_rate(StyleRoomInviteThrottle, 'room_invite', '1/hour', run)


class ActivityTests(StyleRoomAuthMixin, APITestCase):
    def test_activity_provides_events(self):
        owner = self._login('owner')
        room = create_room(owner=owner, title='Activity Room', description='')
        product = ProductFactory(is_active=True)
        self.client.post(
            f'/api/style-rooms/{room.id}/items/', {'product_id': product.id}, format='json',
        )
        resp = self.client.get(f'/api/style-rooms/{room.id}/activity/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        types = [e['type'] for e in resp.data['results']]
        self.assertIn(EVENT_ROOM_CREATED, types)
        self.assertIn(EVENT_ROOM_ITEM_ADDED, types)

    def test_non_member_cannot_view_activity(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        _, token = create_user_with_token(username='actoutsider')
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        resp = self.client.get(f'/api/style-rooms/{room.id}/activity/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_activity_bounded_queries(self):
        """Activity must not run a wishlist query per event (N+1).

        A paginated page can contain many events by distinct actors; each
        actor's public profile otherwise triggers a live wishlist query,
        making activity scale ~1 query per event. The actor__wishlist prefetch
        keeps it constant even with a mix of actors.
        """
        owner = self._login('owner')
        room = self._create_room(owner)
        for i in range(5):
            actor = User.objects.create_user(username=f'actactor{i}', password='x')
            UserProfileFactory(user=actor)
            StyleRoomEvent.objects.create(room=room, actor=actor, type=EVENT_ROOM_ITEM_ADDED, payload={'i': i})
        with CaptureQueriesContext(connection) as captured:
            resp = self.client.get(f'/api/style-rooms/{room.id}/activity/', {'page_size': 50})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data['results']), 5)
        self.assertLessEqual(
            len(captured), 7,
            msg=f'activity scaled with event count: {len(captured)} queries, sql={[q["sql"][:70] for q in captured]}',
        )


class QueryPerformanceTests(StyleRoomAuthMixin, APITestCase):
    def test_items_list_does_not_scale_with_item_count(self):
        user = self._login('owner')
        room = self._create_room(user)
        for _ in range(6):
            self._add_item(room, ProductFactory(is_active=True), user)
        with CaptureQueriesContext(connection) as captured:
            resp = self.client.get(f'/api/style-rooms/{room.id}/items/', {'page_size': 50})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data['results']), 6)
        # If the serializer did N+1 queries for product/user this would be far
        # higher (6 products + 6 adders). Keep it well below that.
        self.assertLessEqual(len(captured), 10)

    def test_rooms_list_bounded_queries(self):
        user = self._login('owner')
        for i in range(3):
            self._create_room(user, f'Room {i}')
        with CaptureQueriesContext(connection) as captured:
            resp = self.client.get('/api/style-rooms/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data['results']), 3)
        self.assertLessEqual(len(captured), 12)

    def test_add_item_bounded_queries(self):
        """POST /items/ must not re-run per-field product/user queries.

        The response used to spend ~6 serialization queries (category, brand,
        repeated product images, profile, wishlist). The item is now re-fetched
        with the same select_related/prefetch queryset as GET /items/.
        """
        user = self._login('owner')
        room = self._create_room(user)
        product = ProductFactory(is_active=True)
        with CaptureQueriesContext(connection) as captured:
            resp = self.client.post(
                f'/api/style-rooms/{room.id}/items/', {'product_id': product.id}, format='json',
            )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(resp.data['product']['is_active'])
        self.assertLessEqual(
            len(captured), 16,
            msg=f'add_item spent {len(captured)} queries, sql={[q["sql"][:70] for q in captured]}',
        )

    def test_add_item_queries_do_not_scale_with_adder_wishlist(self):
        """Item serialization must stay O(1) as the adder's data grows."""
        user = self._login('owner')
        room = self._create_room(user)
        p1 = ProductFactory(is_active=True)
        with CaptureQueriesContext(connection) as cap_base:
            self.client.post(f'/api/style-rooms/{room.id}/items/', {'product_id': p1.id}, format='json')
        base = len(cap_base)

        for _ in range(8):
            Wishlist.objects.create(user=user, product=ProductFactory(is_active=True))
        p2 = ProductFactory(is_active=True)
        with CaptureQueriesContext(connection) as cap2:
            resp2 = self.client.post(f'/api/style-rooms/{room.id}/items/', {'product_id': p2.id}, format='json')
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)
        self.assertLessEqual(
            len(cap2), base + 1,
            msg=f'add_item scaled with adder wishlist size: {len(cap2)} vs {base}',
        )


class RegressionTests(StyleRoomAuthMixin, APITestCase):
    """Regression coverage for response-consistency and race fixes."""

    def test_create_response_has_owner_role_and_counts(self):
        user = self._login()
        resp = self.client.post(
            '/api/style-rooms/', {'title': 'Consistent'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['my_role'], 'owner')
        self.assertTrue(resp.data['is_owner'])
        self.assertEqual(resp.data['member_count'], 1)
        self.assertEqual(resp.data['item_count'], 0)

    def test_create_response_has_no_nplus_one_for_counts(self):
        user = self._login()
        product = ProductFactory(is_active=True)
        with CaptureQueriesContext(connection) as captured:
            resp = self.client.post(
                '/api/style-rooms/', {'title': 'Cheap'}, format='json',
            )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['member_count'], 1)
        self.assertEqual(resp.data['item_count'], 0)
        # create_room (room + member + event) plus the annotated refetch.
        # 9 is the current steady state; a per-field .count() fallback or a
        # shared-join Count would push this well above 12.
        self.assertLessEqual(len(captured), 12, msg=[q['sql'][:80] for q in captured])

    def test_update_response_keeps_annotated_counts(self):
        user = self._login()
        room = self._create_room(user)
        self._add_item(room, ProductFactory(is_active=True), user)
        resp = self.client.patch(
            f'/api/style-rooms/{room.id}/', {'title': 'Updated'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['my_role'], 'owner')
        self.assertEqual(resp.data['member_count'], 1)
        self.assertEqual(resp.data['item_count'], 1)

    def test_join_response_has_member_role_and_counts(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        token, _ = issue_invite_token(room, owner)
        _, gtoken = create_user_with_token(username='consistencer')
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {gtoken}')
        resp = self.client.post(
            f'/api/style-rooms/{room.id}/join/', {'token': token}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['my_role'], 'member')
        self.assertFalse(resp.data['is_owner'])
        self.assertEqual(resp.data['member_count'], 2)

    def test_join_when_already_member_returns_consistent_role(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        member = self._new_member('joiner-again')
        StyleRoomMember.objects.create(room=room, user=member)
        token, _ = issue_invite_token(room, owner)
        self._auth_as(member)
        resp = self.client.post(
            f'/api/style-rooms/{room.id}/join/', {'token': token}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['my_role'], 'member')
        self.assertEqual(resp.data['member_count'], 2)

    def test_item_flags_deactivated_product_unavailable(self):
        user = self._login()
        room = self._create_room(user)
        product = ProductFactory(is_active=False)
        self._add_item(room, product, user)
        resp = self.client.get(f'/api/style-rooms/{room.id}/items/', {'page_size': 50})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        item = resp.data['results'][0]
        self.assertTrue(item['is_unavailable'])
        self.assertFalse(item['product']['is_active'])

    def test_item_active_product_not_flagged(self):
        user = self._login()
        room = self._create_room(user)
        self._add_item(room, ProductFactory(is_active=True), user)
        resp = self.client.get(f'/api/style-rooms/{room.id}/items/', {'page_size': 50})
        item = resp.data['results'][0]
        self.assertFalse(item['is_unavailable'])

    def test_add_member_raises_when_room_full(self):
        owner = self._login('owner')
        room = self._create_room(owner)
        for i in range(MAX_ROOM_MEMBERS - 1):
            StyleRoomMember.objects.create(room=room, user=self._new_member(f'svc-cap-{i}'))
        overflow = self._new_member('svc-cap-overflow')
        with self.assertRaises(RoomMemberLimitExceeded):
            add_member(room, overflow, added_by=owner)
        self.assertFalse(StyleRoomMember.objects.filter(room=room, user=overflow).exists())

    def test_join_room_raises_when_room_full(self):
        room = StyleRoom.objects.create(owner=self._new_member('svc-owner'), title='Full')
        StyleRoomMember.objects.create(room=room, user=room.owner, role=StyleRoomMember.ROLE_OWNER)
        for i in range(MAX_ROOM_MEMBERS - 1):
            StyleRoomMember.objects.create(room=room, user=self._new_member(f'svc-join-{i}'))
        overflow = self._new_member('svc-join-overflow')
        with self.assertRaises(RoomMemberLimitExceeded):
            join_room(room, overflow)
        self.assertFalse(StyleRoomMember.objects.filter(room=room, user=overflow).exists())


class RoomMessageApiTests(StyleRoomAuthMixin, APITestCase):
    def setUp(self):
        self.owner = self._login('room-message-owner')
        self.room = self._create_room(self.owner)
        self.member = self._new_member('room-message-member')
        UserProfileFactory(user=self.member)
        StyleRoomMember.objects.create(room=self.room, user=self.member)
        self.product = ProductFactory(is_active=True, name='Shared Jacket')
        self.inactive_product = ProductFactory(is_active=False)
        self.url = f'/api/style-rooms/{self.room.id}/messages/'

    def test_owner_and_member_can_read_and_send_all_payloads(self):
        for payload in (
            {'text': '  Outfit question  '},
            {'product_id': self.product.id},
            {'text': 'This works.', 'product_id': self.product.id},
        ):
            response = self.client.post(self.url, payload, format='json')
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self._auth_as(self.member)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 3)
        self.assertEqual(response.data['results'][0]['text'], 'This works.')
        self.assertEqual(response.data['results'][1]['product']['id'], self.product.id)
        self.assertEqual(response.data['results'][2]['text'], 'Outfit question')
        response = self.client.post(self.url, {'text': 'Member reply'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_authentication_and_membership_are_required(self):
        self.client.credentials()
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            self.client.post(self.url, {'text': 'No access'}, format='json').status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
        outsider = self._new_member('room-message-outsider')
        self._auth_as(outsider)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            self.client.post(self.url, {'text': 'No access'}, format='json').status_code,
            status.HTTP_404_NOT_FOUND,
        )
        StyleRoomMember.objects.filter(room=self.room, user=self.member).delete()
        self._auth_as(self.member)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_404_NOT_FOUND)

    def test_payload_and_product_validation(self):
        invalid_payloads = [
            {}, {'text': ''}, {'text': '   '},
            {'product_id': 999999}, {'product_id': self.inactive_product.id},
            {'text': 'x' * 2001},
        ]
        for payload in invalid_payloads:
            response = self.client.post(self.url, payload, format='json')
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, payload)
        self.assertEqual(Message.objects.filter(style_room=self.room).count(), 0)

    def test_duplicate_product_messages_are_events_not_items(self):
        for _ in range(2):
            response = self.client.post(
                self.url, {'product_id': self.product.id}, format='json',
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Message.objects.filter(style_room=self.room).count(), 2)
        self.assertFalse(StyleRoomItem.objects.filter(room=self.room, product=self.product).exists())
        message = Message.objects.filter(style_room=self.room).order_by('id').first()
        self.assertIsNone(message.conversation_id)
        self.assertEqual(message.style_room_id, self.room.id)
        self.assertEqual(message.product_id, self.product.id)

    def test_ordering_and_pagination_are_deterministic(self):
        for index in range(3):
            self.client.post(self.url, {'text': f'message-{index}'}, format='json')
        response = self.client.get(self.url, {'page_size': 2})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 3)
        self.assertEqual([item['text'] for item in response.data['results']], ['message-2', 'message-1'])
        self.assertIsNotNone(response.data['next'])
        response = self.client.get(response.data['next'])
        self.assertEqual([item['text'] for item in response.data['results']], ['message-0'])

    def test_room_specific_read_tracking(self):
        first = self.client.post(self.url, {'text': 'first'}, format='json').data
        second = self.client.post(self.url, {'text': 'second'}, format='json').data
        self.assertEqual(
            StyleRoomMessageRead.objects.filter(user=self.owner).count(), 2,
        )
        self._auth_as(self.member)
        response = self.client.get(self.url)
        self.assertEqual({item['text']: item['is_read'] for item in response.data['results']}, {'second': False, 'first': False})
        response = self.client.post(
            f'{self.url}read/', {'message_ids': [first['id']]}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['marked_read'], 1)
        response = self.client.get(self.url)
        self.assertEqual({item['text']: item['is_read'] for item in response.data['results']}, {'second': False, 'first': True})
        self.assertEqual(Message.objects.get(id=first['id']).is_read, False)
