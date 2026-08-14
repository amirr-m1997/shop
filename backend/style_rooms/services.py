"""
Service layer for Style Rooms.

Keeps domain operations (room creation, invitations, events, membership
rules) out of the views so the feature stays testable and reusable by
future features (AI stylist, loyalty) without direct database access.
"""
import hashlib
import secrets

from django.db import transaction
from django.utils import timezone

from chat.models import Block, Message, Notification, StyleRoomMessageRead

from .models import (
    INVITE_TOKEN_TTL,
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


class RoomMemberLimitExceeded(Exception):
    """Raised when a join/invite would exceed MAX_ROOM_MEMBERS.

    Views check the cap as a cheap early exit; the authoritative check
    happens here inside the transaction with the room row locked, so two
    concurrent joins cannot race past the limit.
    """

    def __init__(self, message=None):
        super().__init__(message or f'حداکثر {MAX_ROOM_MEMBERS} عضو مجاز است.')


def hash_invite_token(token):
    """SHA-256 hash of a plaintext invite token."""
    return hashlib.sha256((token or '').encode('utf-8')).hexdigest()


def blocks_interaction(user_a, user_b):
    """Reuse the existing chat Block logic — never duplicate the model."""
    return Block.is_blocked(user_a, user_b)


def log_room_event(room, actor, event_type, payload=None):
    StyleRoomEvent.objects.create(
        room=room, actor=actor, type=event_type, payload=payload or {},
    )


def notify(recipient, actor, text):
    """Reuse chat.Notification — no new notification model."""
    Notification.objects.create(recipient=recipient, actor=actor, text=text)


@transaction.atomic
def create_room(owner, *, title, description='', cover=None, visibility=StyleRoom.VISIBILITY_PRIVATE):
    room = StyleRoom.objects.create(
        owner=owner, title=title, description=description,
        cover=cover, visibility=visibility,
    )
    StyleRoomMember.objects.create(
        room=room, user=owner, role=StyleRoomMember.ROLE_OWNER,
    )
    log_room_event(room, owner, EVENT_ROOM_CREATED, {'title': title})
    return room


@transaction.atomic
def update_room(room, actor, *, title=None, description=None, cover=None, visibility=None):
    if title is not None:
        room.title = title
    if description is not None:
        room.description = description
    if visibility is not None:
        room.visibility = visibility
    if cover is not None:
        room.cover = cover
    room.save()
    log_room_event(room, actor, EVENT_ROOM_UPDATED, {'title': room.title})
    return room


def issue_invite_token(room, actor):
    """
    Issue a fresh, cryptographically secure invite token.
    Revokes any previous token (only one active token per room).
    Returns (plaintext_token, expires_at).
    """
    token = secrets.token_urlsafe(24)
    room.invite_token_hash = hash_invite_token(token)
    room.invite_expires_at = timezone.now() + INVITE_TOKEN_TTL
    room.invite_revoked = False
    room.save(update_fields=['invite_token_hash', 'invite_expires_at', 'invite_revoked'])
    return token, room.invite_expires_at


def validate_invite_token(room, token):
    """Return an error string if the token is invalid, otherwise None."""
    if room.invite_revoked or not room.invite_token_hash:
        return 'این دعوتنامه باطل شده است.'
    if room.invite_expires_at is None or timezone.now() > room.invite_expires_at:
        return 'این دعوتنامه منقضی شده است.'
    candidate = hash_invite_token((token or '').strip())
    if not secrets.compare_digest(candidate, room.invite_token_hash):
        return 'کد دعوتنامه نامعتبر است.'
    return None


@transaction.atomic
def add_member(room, user, added_by, *, role=StyleRoomMember.ROLE_MEMBER, event_type=EVENT_ROOM_MEMBER_INVITED, notify_recipient=True):
    # Row-lock the room so concurrent invites/joins can't both pass the cap
    # check. Views do a cheap pre-check, but this is the authority.
    room = StyleRoom.objects.select_for_update().get(pk=room.pk)
    existing = room.members.filter(user_id=user.id).first()
    if existing:
        return existing, False
    if room.members.count() >= MAX_ROOM_MEMBERS:
        raise RoomMemberLimitExceeded()
    member = StyleRoomMember.objects.create(
        room=room, user=user, role=role, added_by=added_by,
    )
    log_room_event(room, added_by or user, event_type, {'user_id': user.id, 'username': user.username})
    if notify_recipient and added_by and added_by.id != user.id:
        notify(recipient=user, actor=added_by, text=f'شما را به اتاق استایل «{room.title}» دعوت کرده')
    return member, True


@transaction.atomic
def join_room(room, user):
    # Same row-lock discipline as add_member — the cap is enforced here, not
    # just in the view, so parallel joins can't overflow the room.
    room = StyleRoom.objects.select_for_update().get(pk=room.pk)
    existing = room.members.filter(user_id=user.id).first()
    if existing:
        return existing, False
    if room.members.count() >= MAX_ROOM_MEMBERS:
        raise RoomMemberLimitExceeded()
    member = StyleRoomMember.objects.create(
        room=room, user=user, role=StyleRoomMember.ROLE_MEMBER, added_by=None,
    )
    log_room_event(room, user, EVENT_ROOM_MEMBER_JOINED, {'user_id': user.id, 'username': user.username})
    notify(recipient=room.owner, actor=user, text=f'به اتاق استایل «{room.title}» پیوست')
    return member, True


@transaction.atomic
def add_item(room, product, added_by):
    item, created = StyleRoomItem.objects.get_or_create(
        room=room, product=product, defaults={'added_by': added_by},
    )
    if not created:
        return item, False
    log_room_event(room, added_by, EVENT_ROOM_ITEM_ADDED, {'product_id': product.id, 'product_name': product.name})
    return item, True


@transaction.atomic
def create_room_message(room, sender, *, text='', product=None):
    message = Message.objects.create(
        conversation=None,
        style_room=room,
        sender=sender,
        text=text,
        product=product,
    )
    StyleRoomMessageRead.objects.create(message=message, user=sender)
    return message


@transaction.atomic
def mark_room_messages_read(room, user, message_ids=None):
    queryset = room.messages.filter(style_room=room)
    if message_ids is not None:
        queryset = queryset.filter(id__in=message_ids)
    messages = list(queryset.only('id'))
    reads = [
        StyleRoomMessageRead(message=message, user=user)
        for message in messages
    ]
    StyleRoomMessageRead.objects.bulk_create(
        reads, ignore_conflicts=True,
    )
    return len(messages)
