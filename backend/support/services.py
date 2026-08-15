from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from products.models import Product
from .models import SupportConversation, SupportMessage
from .permissions import has_department_access, is_support_staff


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
        conversation.assigned_agent = user
        conversation.status = SupportConversation.STATUS_ASSIGNED
        conversation.save(update_fields=['assigned_agent', 'status', 'updated_at'])
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
        conversation.assigned_agent = agent
        conversation.status = SupportConversation.STATUS_ASSIGNED
        conversation.save(update_fields=['assigned_agent', 'status', 'updated_at'])
    return conversation


def create_message(user, conversation, data):
    if conversation.status == SupportConversation.STATUS_CLOSED:
        raise ValidationError({'status': 'This conversation is closed.'})
    if user != conversation.customer and user != conversation.assigned_agent:
        raise PermissionDenied('You are not a participant in this conversation.')
    product = None
    if data.get('product_id'):
        product = Product.objects.filter(pk=data['product_id'], is_active=True).first()
        if product is None:
            raise NotFound('Product not found.')
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
    return message
