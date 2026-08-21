"""
Service layer for Style Rooms.

Keeps domain operations (room creation, invitations, events, membership
rules) out of the views so the feature stays testable and reusable by
future features (AI stylist, loyalty) without direct database access.
"""
import hashlib
import secrets

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from chat.models import Block, Message, Notification, StyleRoomMessageRead
from chat.realtime import broadcast_after_commit

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


def _notification_snippet(notification):
    return {
        'id': notification.id,
        'text': notification.text,
        'actor_id': notification.actor_id,
        'actor_username': notification.actor.username if notification.actor_id else None,
        'conversation_id': notification.conversation_id,
        'product_id': notification.product_id,
        'created_at': notification.created_at.isoformat(),
        'is_read': notification.is_read,
    }


def notify(recipient, actor, text):
    """Reuse chat.Notification — no new notification model."""
    notification = Notification.objects.create(recipient=recipient, actor=actor, text=text)
    broadcast_after_commit(
        f'chat.user.{recipient.pk}',
        {'type': 'notification', 'notification': _notification_snippet(notification)},
    )


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
def create_room_message(room, sender, *, text='', product=None, idempotency_key=''):
    key = (idempotency_key or '').strip()[:64]
    if key:
        existing = Message.objects.filter(
            style_room=room, sender=sender, idempotency_key=key,
        ).first()
        if existing:
            return existing

    try:
        message = Message.objects.create(
            conversation=None,
            style_room=room,
            sender=sender,
            text=text,
            product=product,
            idempotency_key=key,
        )
    except IntegrityError:
        if key:
            existing = Message.objects.filter(
                style_room=room, sender=sender, idempotency_key=key,
            ).first()
            if existing:
                return existing
        raise
    StyleRoomMessageRead.objects.create(message=message, user=sender)
    if product:
        try:
            from personalization.services import record_product_share
            record_product_share(
                user=sender,
                product=product,
                source='style_room',
                idempotency_key=f'product-share:message:{message.pk}',
                metadata={'message_id': message.pk, 'style_room_id': str(room.pk)},
            )
        except Exception:
            import logging
            logging.getLogger('style_rooms').exception(
                '[personalization_product_share_error] message_id=%s', message.pk,
            )
    from chat.serializers import MessageSerializer
    dto = MessageSerializer(message).data
    broadcast_after_commit(
        f'room.{room.pk}',
        {
            'type': 'chat.message',
            'message': dto,
            'member_count': room.members.count(),
        },
    )
    return message


@transaction.atomic
def mark_room_messages_read(room, user, message_ids=None):
    from chat.read_state import ReadStateError, mark_room_read
    from rest_framework.exceptions import ValidationError
    try:
        result = mark_room_read(room, user, message_ids)
    except ReadStateError as exc:
        raise ValidationError({'message_ids': exc.message})
    return len(result.get('marked_ids') or [])


@transaction.atomic
def react_room_message(user, message, reaction):
    room = message.style_room
    if not room or not room.is_member(user):
        raise PermissionDenied('شما به این اتاق دسترسی ندارید.')
    reaction = reaction if isinstance(reaction, str) and len(reaction) <= 20 else ''

    from chat.models import MessageReaction

    if not reaction:
        MessageReaction.objects.filter(message=message, user=user).delete()
    else:
        MessageReaction.objects.update_or_create(
            message=message, user=user, defaults={'emoji': reaction}
        )
        message.reaction = reaction
        message.save(update_fields=['reaction'])

    reactions = list(
        MessageReaction.objects.filter(message=message)
        .values('emoji')
        .annotate(count=models.Count('id'))
        .values('emoji', 'count')
    )
    broadcast_after_commit(
        f'room.{room.pk}',
        {
            'type': 'message.updated',
            'message_id': message.pk,
            'reaction': reaction,
            'reactions': reactions,
            'user_id': user.pk,
        },
    )
    return {'status': 'ok', 'reaction': reaction, 'reactions': reactions}


@transaction.atomic
def favorite_room_message(user, message):
    room = message.style_room
    if not room or not room.is_member(user):
        raise PermissionDenied('شما به این اتاق دسترسی ندارید.')

    from chat.models import MessageFavorite

    fav, created = MessageFavorite.objects.get_or_create(message=message, user=user)
    if not created:
        fav.delete()
        is_favorite = False
    else:
        is_favorite = True

    has_any = MessageFavorite.objects.filter(message=message).exists()
    if message.is_favorite != has_any:
        message.is_favorite = has_any
        message.save(update_fields=['is_favorite'])

    broadcast_after_commit(
        f'room.{room.pk}',
        {
            'type': 'message.updated',
            'message_id': message.pk,
            'is_favorite': is_favorite,
            'user_id': user.pk,
            'favorites_count': MessageFavorite.objects.filter(message=message).count(),
        },
    )
    return {'status': 'ok', 'is_favorite': is_favorite}


DELETE_FOR_EVERYONE_SECONDS = 15 * 60
MAX_FORWARD_TARGETS = 5


def forward_to_room(user, room, source_message):
    """Forward a message (from private chat or another room) to a Style Room."""
    if not room.is_member(user):
        raise PermissionDenied('شما عضو این اتاق نیستید.')
    text = source_message.text or ''
    product = source_message.product
    return create_room_message(
        room, user,
        text=text,
        product=product,
    )


@transaction.atomic
def delete_room_message(user, message, mode='me'):
    room = message.style_room
    if not room or not room.is_member(user):
        raise PermissionDenied('شما به این پیام دسترسی ندارید.')
    if mode not in ('me', 'everyone'):
        raise PermissionDenied('حالت حذف نامعتبر است.')

    if mode == 'me':
        message.deleted_for.add(user)
        broadcast_after_commit(
            f'room.{room.pk}',
            {
                'type': 'message.deleted',
                'message_id': message.pk,
                'for_everyone': False,
                'user_id': user.pk,
            },
        )
        return {'status': 'ok', 'mode': 'me', 'message_id': message.pk}

    if message.sender_id != user.id and not room.is_owner(user):
        raise PermissionDenied('فقط فرستنده یا مالک اتاق می‌تواند پیام را برای همه حذف کند.')
    if message.deleted_at:
        return {'status': 'ok', 'mode': 'everyone', 'message_id': message.pk}
    age = timezone.now() - message.created_at
    if age.total_seconds() > DELETE_FOR_EVERYONE_SECONDS:
        raise PermissionDenied('مهلت حذف برای همه به پایان رسیده است.')

    message.deleted_at = timezone.now()
    message.deleted_by = user
    message.save(update_fields=['deleted_at', 'deleted_by'])
    broadcast_after_commit(
        f'room.{room.pk}',
        {
            'type': 'message.deleted',
            'message_id': message.pk,
            'for_everyone': True,
            'user_id': user.pk,
        },
    )
    return {'status': 'ok', 'mode': 'everyone', 'message_id': message.pk}
