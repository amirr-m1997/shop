"""Service layer for private chat.

Single home for private-conversation writes so the REST views and the
WebSocket consumer behave identically. Every write that should reach other
clients in realtime calls ``broadcast_after_commit`` — never before commit.
REST endpoints remain the authoritative fallback and call exactly these
functions.
"""

import json
import logging
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import User
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone

from .models import (
    Block,
    Conversation,
    Message,
    MessageReceipt,
    MessageReport,
    Notification,
    PushSubscription,
)
from .realtime import broadcast_after_commit, presence_status
from .serializers import MAX_MESSAGE_LENGTH, SendMessageSerializer

logger = logging.getLogger('chat')

DUPLICATE_WINDOW_SECONDS = 15
DELETE_FOR_EVERYONE_SECONDS = 15 * 60
MAX_FORWARD_TARGETS = 5
MAX_REPORTS_PER_DAY = 3
NEW_ACCOUNT_DAYS = 7
SEARCH_MIN_CHARS = 2
SEARCH_LIMIT = 20
SEND_BUDGET_WINDOW = 60
SUPPORT_STAFF_ROLES = ('support_agent', 'fashion_stylist')


class SendMessageError(Exception):
    """Raised when a private message cannot be sent; carries a status code
    and a client-facing error message mirroring the REST response."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


def is_new_account(user):
    joined = getattr(user, 'date_joined', None)
    if not joined:
        return False
    return joined >= timezone.now() - timedelta(days=NEW_ACCOUNT_DAYS)


def send_rate_limit(user, base_rate):
    """Halve the per-minute send budget for newly registered accounts."""
    try:
        rate = int(base_rate)
    except (TypeError, ValueError):
        rate = 60
    if is_new_account(user):
        return max(1, rate // 2)
    return rate


def consume_send_budget(user):
    """Shared atomic send budget for REST and WebSocket.

    Two sockets or a REST+WS pair must not each get a full allowance.
    """
    limit = send_rate_limit(user, settings.REALTIME.get('MESSAGE_RATE', 60))
    window = SEND_BUDGET_WINDOW
    cache_key = f'chat:send-budget:{user.pk}:{int(timezone.now().timestamp() // window)}'
    try:
        current = cache.incr(cache_key)
    except ValueError:
        if cache.add(cache_key, 1, timeout=window * 2):
            current = 1
        else:
            current = cache.incr(cache_key)
    if current > limit:
        raise SendMessageError('تعداد ارسال پیام بیش از حد مجاز است. کمی صبر کنید.', 429)
    return current


def _resolve_product(product_id, *, require_active):
    from products.models import Product
    if not product_id:
        return None
    qs = Product.objects.filter(id=product_id)
    if require_active:
        qs = qs.filter(is_active=True)
    return qs.first()


def _int_or_none(value):
    if value in (None, '', False):
        return None
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def private_conversation_ids_for(user):
    return Conversation.objects.filter(
        Q(user1=user) | Q(user2=user)
    ).exclude(
        Q(user1__profile__role__in=SUPPORT_STAFF_ROLES)
        | Q(user2__profile__role__in=SUPPORT_STAFF_ROLES)
    ).values('id')


def _conversation_snippet(conversation, user):
    """Lightweight last-message + unread summary for realtime list updates.

    Mirrors the shape produced by ConversationSerializer.get_last_message /
    get_unread_count for a single conversation, without the heavy annotated
    queryset — used only for push events.
    """
    last = (
        conversation.messages.exclude(deleted_for=user)
        .filter(deleted_at__isnull=True)
        .order_by('-created_at', '-id').first()
    )
    unread = (
        conversation.messages.exclude(deleted_for=user)
        .filter(deleted_at__isnull=True, is_read=False).exclude(sender=user).count()
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


def _visible_source_message(user, message):
    if message is None:
        return None
    if message.deleted_at:
        return None
    if message.conversation_id:
        conversation = message.conversation
        if conversation is None or not conversation.is_member(user):
            return None
        if message.deleted_for.filter(pk=user.pk).exists():
            return None
        return message
    return None


def _visible_messages(qs, user):
    return qs.exclude(deleted_for=user).filter(deleted_at__isnull=True)


def unread_summary(user):
    """Unseen private-chat messages for the header badge — not Notification count."""
    count = (
        Message.objects.filter(
            conversation_id__in=private_conversation_ids_for(user),
            deleted_at__isnull=True,
            is_read=False,
        )
        .exclude(sender=user)
        .exclude(deleted_for=user)
        .count()
    )
    return {'count': count}


@transaction.atomic
def send_private_message(
    user,
    conversation,
    *,
    text='',
    product_id=None,
    require_active_product=True,
    reply_to_id=None,
    forwarded_from_id=None,
    idempotency_key='',
):
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

    key = (idempotency_key or '').strip()[:64]
    if key:
        existing = conversation.messages.filter(sender=user, idempotency_key=key).first()
        if existing:
            return existing

    consume_send_budget(user)

    if text and len(text) >= 8:
        recent = conversation.messages.filter(
            sender=user,
            text=text,
            created_at__gte=timezone.now() - timedelta(seconds=DUPLICATE_WINDOW_SECONDS),
        ).filter(deleted_at__isnull=True).first()
        if recent:
            raise SendMessageError('این پیام همین حالا ارسال شده است. کمی صبر کنید.', 429)

    reply_to = None
    reply_pk = _int_or_none(reply_to_id)
    if reply_pk:
        reply_to = conversation.messages.filter(pk=reply_pk).select_related('sender').first()
        if _visible_source_message(user, reply_to) is None:
            raise SendMessageError('پیام مورد نظر برای پاسخ یافت نشد.', 404)

    forwarded_from = None
    forwarded_pk = _int_or_none(forwarded_from_id)
    if forwarded_pk:
        forwarded_from = Message.objects.filter(pk=forwarded_pk).select_related('conversation').first()
        if forwarded_from is None or not forwarded_from.conversation or not forwarded_from.conversation.is_member(user):
            raise SendMessageError('پیام قابل هدایت یافت نشد.', 404)
        if forwarded_from.deleted_at:
            raise SendMessageError('پیام حذف‌شده را نمی‌توان هدایت کرد.', 400)
        if forwarded_from.deleted_for.filter(pk=user.pk).exists():
            raise SendMessageError('پیام قابل هدایت یافت نشد.', 404)

    try:
        with transaction.atomic():
            message = Message.objects.create(
                conversation=conversation,
                sender=user,
                text=text,
                product=product,
                reply_to=reply_to,
                forwarded_from=forwarded_from,
                idempotency_key=key,
            )
    except IntegrityError:
        if key:
            existing = conversation.messages.filter(sender=user, idempotency_key=key).first()
            if existing:
                return existing
        raise
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
    MessageReceipt.objects.get_or_create(message=message, user=other)
    _broadcast_message(conversation, user, message)
    transaction.on_commit(lambda: _safe_push(other, conversation, message, actor=user))
    return message


def _normalize_message_ids(message_ids):
    if not message_ids:
        raise SendMessageError('شناسه پیام‌های دیده‌شده الزامی است.', 400)
    if not isinstance(message_ids, (list, tuple)):
        raise SendMessageError('message_ids باید یک فهرست باشد.', 400)
    normalized = []
    for item in message_ids:
        try:
            value = int(item)
        except (TypeError, ValueError):
            raise SendMessageError('شناسه پیام نامعتبر است.', 400)
        if value > 0:
            normalized.append(value)
    if not normalized:
        raise SendMessageError('شناسه پیام‌های دیده‌شده الزامی است.', 400)
    return list(dict.fromkeys(normalized))


def _mark_private_read(user, conversation, message_ids):
    ids = _normalize_message_ids(message_ids)
    candidates = list(
        conversation.messages.filter(id__in=ids).exclude(sender=user).exclude(deleted_for=user)
    )
    found = [message.id for message in candidates]
    if not found:
        return None, []
    now = timezone.now()
    for message in candidates:
        receipt, _ = MessageReceipt.objects.get_or_create(message=message, user=user)
        updates = []
        if receipt.delivered_at is None:
            receipt.delivered_at = now
            updates.append('delivered_at')
        if receipt.seen_at is None:
            receipt.seen_at = now
            updates.append('seen_at')
        if updates:
            receipt.save(update_fields=updates)
    conversation.messages.filter(id__in=found).update(is_read=True)
    Notification.objects.filter(
        conversation=conversation, recipient=user, is_read=False,
    ).update(is_read=True)
    return max(found), found


@transaction.atomic
def mark_conversation_read(user, conversation, message_ids=None):
    """Mark specific private messages read. Opening a thread is not enough."""
    up_to_id, found = _mark_private_read(user, conversation, message_ids)
    if not found:
        return {'status': 'ok', 'marked_ids': []}
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
def mark_conversation_delivered(user, conversation, message_ids=None):
    ids = _normalize_message_ids(message_ids)
    candidates = conversation.messages.filter(id__in=ids).exclude(sender=user).exclude(deleted_for=user)
    found = list(candidates.values_list('id', flat=True))
    if not found:
        return {'status': 'ok', 'delivered_ids': []}
    now = timezone.now()
    for message in candidates:
        receipt, _ = MessageReceipt.objects.get_or_create(message=message, user=user)
        if receipt.delivered_at is None:
            receipt.delivered_at = now
            receipt.save(update_fields=['delivered_at'])
    broadcast_after_commit(
        f'chat.private.{conversation.pk}',
        {
            'type': 'delivery_receipt',
            'conversation_id': conversation.pk,
            'message_ids': found,
            'user_id': user.pk,
        },
    )
    return {'status': 'ok', 'delivered_ids': found}


def _can_access_message(user, message):
    if not message.conversation_id or not message.conversation.is_member(user):
        return False
    if message.deleted_for.filter(pk=user.pk).exists():
        return False
    return True


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


@transaction.atomic
def delete_message(user, message, mode='me'):
    if not _can_access_message(user, message):
        raise SendMessageError('شما به این پیام دسترسی ندارید.', 403)
    if mode not in ('me', 'everyone'):
        raise SendMessageError('حالت حذف نامعتبر است.', 400)

    conversation = message.conversation
    if mode == 'me':
        message.deleted_for.add(user)
        broadcast_after_commit(
            f'chat.private.{conversation.pk}',
            {
                'type': 'message.deleted',
                'message_id': message.pk,
                'for_everyone': False,
                'user_id': user.pk,
                'conversation_id': conversation.pk,
            },
        )
        broadcast_after_commit(
            f'chat.user.{user.pk}',
            {'type': 'conversation.updated', 'conversation': _conversation_snippet(conversation, user)},
        )
        return {'status': 'ok', 'mode': 'me', 'message_id': message.pk}

    if message.sender_id != user.id:
        raise SendMessageError('فقط فرستنده می‌تواند پیام را برای همه حذف کند.', 403)
    if message.deleted_at:
        raise SendMessageError('این پیام قبلاً حذف شده است.', 400)
    age = timezone.now() - message.created_at
    if age.total_seconds() > DELETE_FOR_EVERYONE_SECONDS:
        raise SendMessageError('مهلت حذف برای همه به پایان رسیده است.', 400)

    message.deleted_at = timezone.now()
    message.deleted_by = user
    message.save(update_fields=['deleted_at', 'deleted_by'])
    broadcast_after_commit(
        f'chat.private.{conversation.pk}',
        {
            'type': 'message.deleted',
            'message_id': message.pk,
            'for_everyone': True,
            'user_id': user.pk,
            'conversation_id': conversation.pk,
        },
    )
    conversation.updated_at = timezone.now()
    conversation.save(update_fields=['updated_at'])
    other = conversation.other_user(user)
    broadcast_after_commit(
        f'chat.user.{user.pk}',
        {'type': 'conversation.updated', 'conversation': _conversation_snippet(conversation, user)},
    )
    broadcast_after_commit(
        f'chat.user.{other.pk}',
        {'type': 'conversation.updated', 'conversation': _conversation_snippet(conversation, other)},
    )
    return {'status': 'ok', 'mode': 'everyone', 'message_id': message.pk}


def forward_message(user, message, conversation_ids):
    source = _visible_source_message(user, message)
    if source is None:
        raise SendMessageError('پیام قابل هدایت یافت نشد.', 404)
    if not conversation_ids or not isinstance(conversation_ids, (list, tuple)):
        raise SendMessageError('حداقل یک گفتگوی مقصد لازم است.', 400)
    targets = []
    for item in conversation_ids:
        parsed = _int_or_none(item)
        if parsed and parsed not in targets:
            targets.append(parsed)
    if not targets:
        raise SendMessageError('حداقل یک گفتگوی مقصد لازم است.', 400)
    if len(targets) > MAX_FORWARD_TARGETS:
        raise SendMessageError(f'حداکثر {MAX_FORWARD_TARGETS} مقصد مجاز است.', 400)

    created = []
    source_conversation_id = source.conversation_id
    if source.conversation and Block.is_blocked(user, source.conversation.other_user(user)):
        raise SendMessageError('پیام قابل هدایت یافت نشد.', 404)
    for conversation_id in targets:
        if conversation_id == source_conversation_id:
            continue
        conversation = Conversation.objects.filter(pk=conversation_id).select_related('user1', 'user2').first()
        if conversation is None or not conversation.is_member(user) or not conversation.is_accepted:
            continue
        if Block.is_blocked(user, conversation.other_user(user)):
            continue
        created.append(send_private_message(
            user,
            conversation,
            text=source.text,
            product_id=source.product_id,
            require_active_product=False,
            forwarded_from_id=source.pk,
        ))
    if not created:
        raise SendMessageError('هیچ مقصد معتبری برای هدایت پیدا نشد.', 400)
    return created


@transaction.atomic
def report_message(user, message, *, reason='', details=''):
    if not _can_access_message(user, message):
        raise SendMessageError('شما به این پیام دسترسی ندارید.', 403)
    if message.sender_id == user.id:
        raise SendMessageError('نمی‌توانید پیام خودتان را گزارش کنید.', 400)
    valid_reasons = {choice[0] for choice in MessageReport.REASON_CHOICES}
    reason = reason if reason in valid_reasons else MessageReport.REASON_OTHER
    since = timezone.now() - timedelta(days=1)
    daily = MessageReport.objects.filter(reporter=user, created_at__gte=since).count()
    if daily >= MAX_REPORTS_PER_DAY:
        raise SendMessageError('سقف گزارش روزانه پر شده است.', 429)
    if MessageReport.objects.filter(reporter=user, message=message).exists():
        raise SendMessageError('این پیام را قبلاً گزارش کرده‌اید.', 400)
    report = MessageReport.objects.create(
        reporter=user,
        target_user=message.sender,
        message=message,
        conversation=message.conversation,
        reason=reason,
        details=(details or '')[:1000],
    )
    return {'status': 'ok', 'id': report.pk}


def search_conversation_messages(user, conversation, query):
    if not conversation.is_member(user):
        raise SendMessageError('شما به این گفتگو دسترسی ندارید.', 403)
    needle = (query or '').strip()
    if len(needle) < SEARCH_MIN_CHARS:
        raise SendMessageError('برای جستجو حداقل دو نویسه لازم است.', 400)
    return list(
        conversation.messages.exclude(deleted_for=user)
        .filter(deleted_at__isnull=True, text__icontains=needle)
        .order_by('-created_at', '-id')[:SEARCH_LIMIT]
    )


def subscribe_push(user, *, endpoint='', p256dh='', auth='', user_agent=''):
    endpoint = (endpoint or '').strip()
    p256dh = (p256dh or '').strip()
    auth_key = (auth or '').strip()
    if not endpoint or not endpoint.startswith('https://'):
        raise SendMessageError('آدرس پوش نامعتبر است.', 400)
    if not p256dh or not auth_key:
        raise SendMessageError('کلیدهای پوش ناقص است.', 400)
    PushSubscription.objects.update_or_create(
        endpoint=endpoint[:500],
        defaults={
            'user': user,
            'p256dh': p256dh[:200],
            'auth': auth_key[:200],
            'user_agent': (user_agent or '')[:300],
        },
    )
    return {'status': 'ok'}


def unsubscribe_push(user, endpoint=''):
    endpoint = (endpoint or '').strip()
    if not endpoint:
        return {'status': 'ok', 'removed': 0}
    removed, _ = PushSubscription.objects.filter(user=user, endpoint=endpoint).delete()
    return {'status': 'ok', 'removed': removed}


def _safe_push(recipient, conversation, message, *, actor):
    """Push must never roll back a committed message."""
    try:
        _maybe_push(recipient, conversation, message, actor=actor)
    except Exception as exc:
        logger.warning(
            '[chat_push_unhandled] recipient=%s conversation=%s message=%s error=%s',
            getattr(recipient, 'pk', None),
            getattr(conversation, 'pk', None),
            getattr(message, 'pk', None),
            type(exc).__name__,
        )


def _maybe_push(recipient, conversation, message, *, actor):
    """Send a Web Push only when the peer is not currently online.

    Opening the same visible thread is approximated by presence=online.
    Clicking a push never marks the message seen.
    """
    if recipient is None or Block.is_blocked(actor, recipient):
        return
    if presence_status(recipient.id) == 'online':
        return
    subscriptions = list(PushSubscription.objects.filter(user=recipient))
    if not subscriptions:
        return
    body = (message.text or '').strip()
    if not body and message.product_id:
        body = 'یک محصول برای شما ارسال شد'
    payload = {
        'title': getattr(actor, 'username', 'پیام جدید'),
        'body': body[:80],
        'url': f'/chat/{conversation.pk}',
        'conversation_id': conversation.pk,
        'message_id': message.pk,
    }
    public_key = getattr(settings, 'WEB_PUSH', {}).get('VAPID_PUBLIC_KEY') or ''
    private_key = getattr(settings, 'WEB_PUSH', {}).get('VAPID_PRIVATE_KEY') or ''
    claim_email = getattr(settings, 'WEB_PUSH', {}).get('VAPID_CLAIM_EMAIL') or 'mailto:support@localhost'
    if not public_key or not private_key:
        logger.info(
            '[chat_push_skipped] reason=no_vapid recipient=%s conversation=%s message=%s',
            recipient.pk, conversation.pk, message.pk,
        )
        return
    try:
        from pywebpush import WebPushException, webpush
    except ImportError:
        logger.info(
            '[chat_push_skipped] reason=no_pywebpush recipient=%s conversation=%s',
            recipient.pk, conversation.pk,
        )
        return
    stale = []
    for subscription in subscriptions:
        try:
            webpush(
                subscription_info={
                    'endpoint': subscription.endpoint,
                    'keys': {'p256dh': subscription.p256dh, 'auth': subscription.auth},
                },
                data=json.dumps(payload, ensure_ascii=False),
                vapid_private_key=private_key,
                vapid_claims={'sub': claim_email},
            )
        except WebPushException as exc:
            status_code = getattr(getattr(exc, 'response', None), 'status_code', None)
            # 404/410 are gone endpoints. 401/403 can be a global VAPID
            # misconfiguration and must not wipe every subscription.
            if status_code in (404, 410):
                stale.append(subscription.pk)
                logger.warning(
                    '[chat_push_stale] recipient=%s subscription=%s status=%s',
                    recipient.pk, subscription.pk, status_code,
                )
            else:
                logger.warning(
                    '[chat_push_error] recipient=%s subscription=%s status=%s',
                    recipient.pk, subscription.pk, status_code,
                )
        except Exception as exc:
            logger.warning(
                '[chat_push_error] recipient=%s subscription=%s error=%s',
                recipient.pk, subscription.pk, type(exc).__name__,
            )
        else:
            logger.info(
                '[chat_push_sent] recipient=%s conversation=%s message=%s subscription=%s',
                recipient.pk, conversation.pk, message.pk, subscription.pk,
            )
    if stale:
        PushSubscription.objects.filter(pk__in=stale).delete()
