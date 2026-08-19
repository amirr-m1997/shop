"""Service layer for private chat.

Single home for private-conversation writes so the REST views and the
WebSocket consumer behave identically. Every write that should reach other
clients in realtime calls ``broadcast_after_commit`` — never before commit.
REST endpoints remain the authoritative fallback and call exactly these
functions.
"""

import logging

from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone

from .models import Block, Conversation, Message, Notification
from .serializers import MAX_MESSAGE_LENGTH, SendMessageSerializer
from .realtime import broadcast_after_commit

logger = logging.getLogger('chat')


class SendMessageError(Exception):
    """Raised when a private message cannot be sent; carries a status code
    and a client-facing error message mirroring the REST response."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


def _resolve_product(product_id, *, require_active):
    from products.models import Product
    if not product_id:
        return None
    qs = Product.objects.filter(id=product_id)
    if require_active:
        qs = qs.filter(is_active=True)
    return qs.first()


def _conversation_snippet(conversation, user):
    """Lightweight last-message + unread summary for realtime list updates.

    Mirrors the shape produced by ConversationSerializer.get_last_message /
    get_unread_count for a single conversation, without the heavy annotated
    queryset — used only for push events.
    """
    last = (
        conversation.messages.exclude(deleted_for=user)
        .order_by('-created_at', '-id').first()
    )
    unread = (
        conversation.messages.exclude(deleted_for=user)
        .filter(is_read=False).exclude(sender=user).count()
    )
    return {
        'id': conversation.pk,
        'unread_count': unread,
        'updated_at': conversation.updated_at.isoformat(),
        'last_message': {
            'id': last.id,
            'text': last.text[:100],
            'has_product': bool(last.product_id),
            'sender_id': last.sender_id,
            'created_at': last.created_at.isoformat(),
        } if last else None,
    }


def _broadcast_message(conversation, user, message):
    """Push a just-committed message to the conversation group and the
    personal groups of both members."""
    from .serializers import MessageSerializer
    dto = MessageSerializer(message).data

    broadcast_after_commit(
        f'chat.private.{conversation.pk}',
        {'type': 'chat.message', 'message': dto},
    )
    other = conversation.other_user(user)
    broadcast_after_commit(
        f'chat.user.{user.pk}',
        {'type': 'conversation.updated', 'conversation': _conversation_snippet(conversation, user)},
    )
    broadcast_after_commit(
        f'chat.user.{other.pk}',
        {'type': 'unread', 'conversation': _conversation_snippet(conversation, other)},
    )


@transaction.atomic
def send_private_message(user, conversation, *, text='', product_id=None, require_active_product=True):
    """Validate, persist and broadcast a private-chat message.

    Raises SendMessageError with a status + message identical to the REST
    response for the same failure. The created Message is returned so the
    caller (view or consumer) can serialize it.
    """
    if not conversation.is_member(user):
        raise SendMessageError('شما به این گفتگو دسترسی ندارید.', 403)
    if not conversation.is_accepted:
        raise SendMessageError(
            'برای ارسال پیام، ابتدا باید طرف مقابل درخواست گفتگو را تایید کند.', 403,
        )
    if Block.is_blocked(user, conversation.other_user(user)):
        raise SendMessageError(
            'شما امکان ارسال پیام در این گفتگو را ندارید (این کاربر بلاک شده است).', 403,
        )

    serializer = SendMessageSerializer(data={'text': text, 'product_id': product_id})
    serializer.is_valid(raise_exception=True)
    text = (serializer.validated_data.get('text') or '').strip()
    product_id = serializer.validated_data.get('product_id')

    if not text and not product_id:
        raise SendMessageError('متن پیام یا محصول الزامی است.', 400)
    if len(text) > MAX_MESSAGE_LENGTH:
        raise SendMessageError(
            f'طول پیام نمی‌تواند بیش از {MAX_MESSAGE_LENGTH} کاراکتر باشد.', 400,
        )

    product = _resolve_product(product_id, require_active=require_active_product)
    if product_id and not product:
        raise SendMessageError('محصول مورد نظر یافت نشد یا غیرفعال است.', 404)

    message = Message.objects.create(
        conversation=conversation,
        sender=user,
        text=text,
        product=product,
    )
    if product:
        try:
            from personalization.services import record_product_share
            record_product_share(
                user=user,
                product=product,
                source='private_chat',
                idempotency_key=f'product-share:message:{message.pk}',
                metadata={'message_id': message.pk, 'conversation_id': conversation.pk},
            )
        except Exception:
            logger.exception('[personalization_product_share_error] message_id=%s', message.pk)

    conversation.updated_at = timezone.now()
    conversation.save(update_fields=['updated_at'])

    other = conversation.other_user(user)
    notif_text = 'یک پیام برای شما ارسال کرده'
    if product:
        notif_text = f'یک محصول برای شما ارسال کرده: {product.name}'
    Notification.objects.create(
        recipient=other,
        actor=user,
        conversation=conversation,
        product=product,
        text=notif_text,
    )

    _broadcast_message(conversation, user, message)
    return message


def _mark_private_read(user, conversation):
    marked = conversation.messages.filter(is_read=False).exclude(sender=user)
    up_to_id = marked.order_by('-created_at', '-id').values_list('id', flat=True).first()
    marked.update(is_read=True)
    Notification.objects.filter(
        conversation=conversation, recipient=user, is_read=False,
    ).update(is_read=True)
    return up_to_id


@transaction.atomic
def mark_conversation_read(user, conversation):
    """Mark a private conversation read and push the receipt + list update."""
    up_to_id = _mark_private_read(user, conversation)
    broadcast_after_commit(
        f'chat.private.{conversation.pk}',
        {
            'type': 'read_receipt',
            'conversation_id': conversation.pk,
            'up_to_message_id': up_to_id,
            'user_id': user.pk,
        },
    )
    broadcast_after_commit(
        f'chat.user.{user.pk}',
        {'type': 'unread', 'conversation': _conversation_snippet(conversation, user)},
    )
    return {'status': 'ok'}


def _can_access_message(user, message):
    if message.conversation_id:
        return message.conversation.is_member(user)
    return False


@transaction.atomic
def react_message(user, message, reaction):
    if not _can_access_message(user, message):
        raise SendMessageError('شما به این پیام دسترسی ندارید.', 403)
    reaction = reaction if isinstance(reaction, str) and len(reaction) <= 20 else ''
    message.reaction = reaction
    message.save(update_fields=['reaction'])
    broadcast_after_commit(
        f'chat.private.{message.conversation_id}',
        {
            'type': 'message.updated',
            'message_id': message.pk,
            'reaction': message.reaction,
        },
    )
    return {'status': 'ok', 'reaction': message.reaction}


@transaction.atomic
def favorite_message(user, message):
    if not _can_access_message(user, message):
        raise SendMessageError('شما به این پیام دسترسی ندارید.', 403)
    message.is_favorite = not message.is_favorite
    message.save(update_fields=['is_favorite'])
    broadcast_after_commit(
        f'chat.private.{message.conversation_id}',
        {
            'type': 'message.updated',
            'message_id': message.pk,
            'is_favorite': message.is_favorite,
        },
    )
    return {'status': 'ok', 'is_favorite': message.is_favorite}