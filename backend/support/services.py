from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from chat.realtime import broadcast_after_commit
from products.models import Product
from .models import SupportAgentPresence, SupportAssignment, SupportConversation, SupportMessage
from .permissions import has_department_access, is_support_eligible, is_support_staff


def _support_conv_dto(conversation):
    """Lightweight conversation summary pushed over the wire for realtime
    events; REST stays the authoritative full representation."""
    return {
        'id': conversation.pk,
        'department': conversation.department,
        'status': conversation.status,
        'priority': conversation.priority,
        'customer_id': conversation.customer_id,
        'assigned_agent_id': conversation.assigned_agent_id,
        'last_message_at': (
            conversation.last_message_at.isoformat()
            if conversation.last_message_at else None
        ),
    }


def _publish_support_updated(conversation, event):
    """Broadcast a support-conversation state change to everyone who cares:
    the conversation group, the department queue, and the personal groups of
    the customer and the assigned agent."""
    payload = {
        'type': 'support.updated',
        'conversation': _support_conv_dto(conversation),
        'event': event,
    }
    broadcast_after_commit(f'support.conv.{conversation.pk}', payload)
    broadcast_after_commit(
        f'support.department.{conversation.department}',
        {'type': 'queue.updated', 'conversation': _support_conv_dto(conversation), 'event': event},
    )
    if conversation.assigned_agent_id:
        broadcast_after_commit(
            f'chat.user.{conversation.assigned_agent_id}',
            {'type': 'support.updated', 'conversation_id': conversation.pk},
        )
    broadcast_after_commit(
        f'chat.user.{conversation.customer_id}',
        {'type': 'support.updated', 'conversation_id': conversation.pk},
    )


def touch_presence(user):
    if not is_support_eligible(user):
        return
    presence, _ = SupportAgentPresence.objects.get_or_create(staff=user)
    presence.last_seen_at = timezone.now()
    presence.save(update_fields=['last_seen_at', 'updated_at'])


def require_department_staff(user, conversation):
    if not is_support_staff(user) or not has_department_access(user, conversation.department):
        raise PermissionDenied('You are not authorized for this department.')


def claim_conversation(user, conversation_id):
    if not is_support_staff(user):
        raise PermissionDenied('Only support staff can claim conversations.')
    with transaction.atomic():
        conversation = SupportConversation.objects.select_for_update().get(pk=conversation_id)
        require_department_staff(user, conversation)
        if conversation.status != SupportConversation.STATUS_QUEUED:
            raise ValidationError({'status': 'This conversation is no longer queued.'})
        SupportAssignment.objects.create(
            conversation=conversation,
            agent=user,
            action=SupportAssignment.ACTION_CLAIM,
            actor=user,
        )
        conversation.assigned_agent = user
        conversation.status = SupportConversation.STATUS_ASSIGNED
        conversation.save(update_fields=['assigned_agent', 'status', 'updated_at'])
    _publish_support_updated(conversation, 'claimed')
    return conversation


def assign_conversation(user, conversation_id, agent):
    if not is_support_staff(user):
        raise PermissionDenied('Only support staff can assign conversations.')
    if not is_support_staff(agent) or not getattr(agent, 'is_active', False):
        raise ValidationError({'agent_id': 'The selected user is not support staff.'})
    with transaction.atomic():
        conversation = SupportConversation.objects.select_for_update().get(pk=conversation_id)
        require_department_staff(user, conversation)
        if not has_department_access(agent, conversation.department):
            raise ValidationError({'agent_id': 'The agent does not belong to this department.'})
        if conversation.status == SupportConversation.STATUS_CLOSED:
            raise ValidationError({'status': 'Closed conversations cannot be assigned.'})
        previous_agent = conversation.assigned_agent
        SupportAssignment.objects.create(
            conversation=conversation,
            agent=agent,
            action=SupportAssignment.ACTION_REASSIGN if previous_agent else SupportAssignment.ACTION_ASSIGN,
            actor=user,
            previous_agent=previous_agent,
        )
        conversation.assigned_agent = agent
        conversation.status = SupportConversation.STATUS_ASSIGNED
        conversation.save(update_fields=['assigned_agent', 'status', 'updated_at'])
    _publish_support_updated(conversation, 'reassigned' if previous_agent else 'assigned')
    if previous_agent:
        broadcast_after_commit(
            f'chat.user.{previous_agent.pk}',
            {'type': 'support.updated', 'conversation_id': conversation.pk},
        )
    return conversation


def create_message(user, conversation, data):
    product = None
    if data.get('product_id'):
        product = Product.objects.filter(pk=data['product_id'], is_active=True).first()
        if product is None:
            raise NotFound('Product not found.')
    with transaction.atomic():
        conversation = SupportConversation.objects.select_for_update().get(pk=conversation.pk)
        if conversation.status == SupportConversation.STATUS_CLOSED:
            raise ValidationError({'status': 'This conversation is closed.'})
        if user != conversation.customer and user != conversation.assigned_agent:
            raise PermissionDenied('You are not a participant in this conversation.')
        now = timezone.now()
        message = SupportMessage.objects.create(
            conversation=conversation,
            sender=user,
            text=data.get('text', '').strip(),
            product=product,
            created_at=now,
        )
        conversation.last_message_at = now
        conversation.save(update_fields=['last_message_at', 'updated_at'])
    _publish_support_message(conversation, user, message)
    return message


def _publish_support_message(conversation, user, message):
    """Broadcast a committed support message to the conversation group and the
    other participant's personal group."""
    from .serializers import SupportMessageSerializer
    dto = SupportMessageSerializer(message).data
    broadcast_after_commit(
        f'support.conv.{conversation.pk}',
        {'type': 'chat.message', 'message': dto},
    )
    if conversation.assigned_agent_id and user.pk != conversation.assigned_agent_id:
        other = conversation.assigned_agent_id
    else:
        other = conversation.customer_id
    if user.pk != other:
        unread = conversation.messages.filter(
            is_read=False,
        ).exclude(sender_id=other).count()
        broadcast_after_commit(
            f'chat.user.{other}',
            {
                'type': 'support.unread',
                'conversation_id': conversation.pk,
                'unread_count': unread,
                'from': user.pk,
            },
        )
    if conversation.status == SupportConversation.STATUS_QUEUED:
        broadcast_after_commit(
            f'support.department.{conversation.department}',
            {'type': 'queue.updated', 'conversation': _support_conv_dto(conversation), 'event': 'message'},
        )


@transaction.atomic
def mark_support_read(user, conversation):
    if user != conversation.customer and user != conversation.assigned_agent:
        raise PermissionDenied('You are not a participant in this conversation.')
    conversation.messages.filter(is_read=False).exclude(sender=user).update(is_read=True)
    broadcast_after_commit(
        f'support.conv.{conversation.pk}',
        {
            'type': 'read_receipt',
            'conversation_id': conversation.pk,
            'user_id': user.pk,
            'mark_all': True,
        },
    )
    return {'status': 'ok'}


@transaction.atomic
def close_conversation(user, conversation):
    if user != conversation.customer and user != conversation.assigned_agent:
        raise PermissionDenied('Conversation access denied.')
    conversation.status = SupportConversation.STATUS_CLOSED
    conversation.closed_at = timezone.now()
    conversation.save(update_fields=['status', 'closed_at', 'updated_at'])
    _publish_support_updated(conversation, 'closed')
    return conversation


@transaction.atomic
def reopen_conversation(user, conversation):
    if user != conversation.customer and user != conversation.assigned_agent:
        raise PermissionDenied('Conversation access denied.')
    conversation.status = SupportConversation.STATUS_QUEUED
    conversation.assigned_agent = None
    conversation.closed_at = None
    conversation.save(update_fields=['status', 'assigned_agent', 'closed_at', 'updated_at'])
    _publish_support_updated(conversation, 'reopened')
    return conversation


@transaction.atomic
def set_conversation_priority(user, conversation, priority):
    if not is_support_staff(user) or not has_department_access(user, conversation.department):
        raise PermissionDenied('Staff access required.')
    valid_priorities = (
        SupportConversation.PRIORITY_NORMAL,
        SupportConversation.PRIORITY_HIGH,
        SupportConversation.PRIORITY_URGENT,
    )
    if priority not in valid_priorities:
        raise ValidationError({'priority': 'Invalid priority.'})
    conversation.priority = priority
    conversation.save(update_fields=['priority', 'updated_at'])
    _publish_support_updated(conversation, 'priority')
    return conversation


def support_presence_update(user, status):
    """Reflect a live WS presence signal into the persistent staff presence
    row (online/away). Called only from realtime paths, matching the P0-A rule
    that presence changes only via explicit staff signals."""
    if not is_support_eligible(user):
        return
    presence, _ = SupportAgentPresence.objects.get_or_create(staff=user)
    now = timezone.now()
    presence.status = status
    presence.last_seen_at = now
    presence.heartbeat_at = now
    presence.save(update_fields=['status', 'last_seen_at', 'heartbeat_at', 'updated_at'])


def support_presence_offline(user):
    if not is_support_eligible(user):
        return
    presence = SupportAgentPresence.objects.filter(staff=user).first()
    if presence:
        presence.status = SupportAgentPresence.STATUS_OFFLINE
        presence.save(update_fields=['status', 'updated_at'])
