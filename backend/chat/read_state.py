"""Unified read-state abstraction for all chat types.

Provides a consistent interface for marking messages read and querying
unread counts across private chat, support chat, and Style Rooms.

Storage remains destination-specific:
- Private chat: Message.is_read + MessageReceipt
- Support chat: SupportMessage.is_read
- Style Room: StyleRoomMessageRead (per-user per-message)
"""

import logging
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger('chat')


class ReadStateError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


def _normalize_message_ids(message_ids):
    if not message_ids:
        raise ReadStateError('شناسه پیام‌ها الزامی است.')
    if not isinstance(message_ids, (list, tuple)):
        raise ReadStateError('message_ids باید لیست باشد.')
    normalized = []
    for item in message_ids:
        try:
            value = int(item)
        except (TypeError, ValueError):
            raise ReadStateError('شناسه پیام نامعتبر است.')
        if value > 0:
            normalized.append(value)
    if not normalized:
        raise ReadStateError('شناسه پیام‌ها الزامی است.')
    return list(dict.fromkeys(normalized))


@transaction.atomic
def mark_private_read(user, conversation, message_ids):
    from .models import Message, MessageReceipt, Notification
    from .realtime import broadcast_after_commit

    ids = _normalize_message_ids(message_ids)
    candidates = list(
        conversation.messages.filter(id__in=ids).exclude(sender=user).exclude(deleted_for=user)
    )
    found = [m.id for m in candidates]
    if not found:
        return {'status': 'ok', 'marked_ids': []}

    now = timezone.now()
    new_receipts = [
        MessageReceipt(message=message, user=user, delivered_at=now, seen_at=now)
        for message in candidates
    ]
    if new_receipts:
        MessageReceipt.objects.bulk_create(new_receipts, ignore_conflicts=True, batch_size=500)
    MessageReceipt.objects.filter(message_id__in=found, user=user, delivered_at__isnull=True).update(delivered_at=now)
    MessageReceipt.objects.filter(message_id__in=found, user=user, seen_at__isnull=True).update(seen_at=now)

    conversation.messages.filter(id__in=found).update(is_read=True)
    Notification.objects.filter(
        conversation=conversation, recipient=user, is_read=False,
    ).update(is_read=True)

    up_to_id = max(found)
    broadcast_after_commit(
        f'chat.private.{conversation.pk}',
        {
            'type': 'read_receipt',
            'conversation_id': conversation.pk,
            'up_to_message_id': up_to_id,
            'message_ids': found,
            'user_id': user.pk,
        },
    )
    broadcast_after_commit(
        f'chat.user.{user.pk}',
        {'type': 'unread', 'conversation': _conversation_snippet(conversation, user)},
    )
    return {'status': 'ok', 'marked_ids': found}


@transaction.atomic
def mark_support_read(user, conversation, message_ids):
    from support.models import SupportMessage
    from chat.realtime import broadcast_after_commit

    if user != conversation.customer and user != conversation.assigned_agent:
        raise ReadStateError('شما در این گفتگو شرکت‌کننده نیستید.', 403)

    ids = _normalize_message_ids(message_ids)
    marked = list(
        conversation.messages.filter(id__in=ids, is_read=False)
        .exclude(sender=user).values_list('id', flat=True)
    )
    if marked:
        SupportMessage.objects.filter(id__in=marked).update(is_read=True)

    broadcast_after_commit(
        f'support.conv.{conversation.pk}',
        {
            'type': 'read_receipt',
            'conversation_id': conversation.pk,
            'user_id': user.pk,
            'message_ids': marked,
            'mark_all': False,
        },
    )
    return {'status': 'ok', 'marked_ids': marked}


@transaction.atomic
def mark_room_read(room, user, message_ids):
    from chat.models import StyleRoomMessageRead
    from chat.realtime import broadcast_after_commit

    ids = _normalize_message_ids(message_ids)
    messages = list(
        room.messages.filter(style_room=room, id__in=ids).only('id')
    )
    if not messages:
        return {'status': 'ok', 'marked_ids': []}

    from django.db.models import Q
    existing = set(
        StyleRoomMessageRead.objects.filter(
            message__in=messages, user=user,
        ).values_list('message_id', flat=True)
    )
    new_reads = [
        StyleRoomMessageRead(message=m, user=user)
        for m in messages if m.id not in existing
    ]
    if new_reads:
        StyleRoomMessageRead.objects.bulk_create(new_reads, ignore_conflicts=True)

    member_count = room.members.count()
    broadcast_after_commit(
        f'room.{room.pk}',
        {
            'type': 'read',
            'message_ids': [m.id for m in messages],
            'user_id': user.id,
            'member_count': member_count,
        },
    )
    return {'status': 'ok', 'marked_ids': [m.id for m in messages]}


def _conversation_snippet(conversation, user):
    from .services import _conversation_snippet
    return _conversation_snippet(conversation, user)
