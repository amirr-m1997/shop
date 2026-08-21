"""WebSocket consumers for support conversations and the staff queue.

Both consumers reuse ``support.services`` for writes so REST and WS behave
identically; broadcasts happen via ``transaction.on_commit`` inside the
services.
"""

import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.conf import settings
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from chat.consumers import (
    CONNECTION_LIMIT_CLOSE,
    NOT_FOUND_CLOSE,
    RealtimeConsumerMixin,
)
from chat.realtime import allow_rate_limit, presence_mark, presence_status

from .models import SupportConversation
from .permissions import departments_for, is_support_eligible, is_support_staff
from .serializers import SupportMessageCreateSerializer
from .services import (
    create_message,
    mark_support_read,
    support_presence_offline,
    support_presence_update,
)

logger = logging.getLogger('support')


class SupportChatConsumer(RealtimeConsumerMixin, AsyncJsonWebsocketConsumer):
    """Socket for one support conversation (customer <-> assigned agent)."""

    async def connect(self):
        user = await self._auth_gate()
        if user is None:
            return
        if not await self._register_connection(user.id):
            return
        conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        conversation = await database_sync_to_async(self._load_conversation)(
            user, conversation_id,
        )
        if conversation is None:
            await self.close(code=NOT_FOUND_CLOSE)
            return
        self.user = user
        self.conversation = conversation
        self.group = f'support.conv.{conversation.pk}'
        await self.channel_layer.group_add(self.group, self.channel_name)
        self._groups.append(self.group)
        self._presence_groups.append(self.group)
        self._connected = True
        await self.accept()
        await self._start_watchdog()
        await database_sync_to_async(presence_mark)(user.id, self._connection_id)
        await self._broadcast_presence()
        if await database_sync_to_async(is_support_eligible)(user):
            await database_sync_to_async(support_presence_update)(user, 'online')
        await self.send_json({
            'type': 'connected',
            'conversation_id': conversation.pk,
            'user_id': user.id,
        })

    @staticmethod
    def _load_conversation(user, conversation_id):
        try:
            conversation = SupportConversation.objects.select_related(
                'customer', 'assigned_agent',
            ).get(pk=conversation_id)
        except SupportConversation.DoesNotExist:
            return None
        if user.pk == conversation.customer_id or user.pk == conversation.assigned_agent_id:
            return conversation
        return None

    async def disconnect(self, code):
        user = getattr(self, 'user', None)
        await super().disconnect(code)
        if user is not None and not getattr(user, 'is_anonymous', True):
            remaining = await database_sync_to_async(presence_status)(user.id)
            if remaining == 'offline':
                await database_sync_to_async(support_presence_offline)(user)

    handlers = {}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.handlers = {
            'message.send': self._handle_send,
            'typing': self._handle_typing,
            'read.mark': self._handle_read,
            'presence': self._handle_presence,
        }

    async def _handle_send(self, content):
        allow_rate_limit(self.scope, 'support_send', settings.REALTIME['MESSAGE_RATE'], 60)
        payload = content.get('payload')
        if not isinstance(payload, dict):
            await self.send_json({'type': 'message.error', 'error': 'invalid_payload'})
            return
        try:
            await database_sync_to_async(self._create_support_message)(payload)
        except (ValidationError, NotFound, PermissionDenied) as exc:
            detail = getattr(exc, 'detail', str(exc))
            await self.send_json({'type': 'message.error', 'error': detail})
            return
        await self.send_json({'type': 'message.sent', 'ok': True})

    def _create_support_message(self, payload):
        serializer = SupportMessageCreateSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        create_message(self.user, self.conversation, serializer.validated_data)

    async def _handle_typing(self, content):
        allow_rate_limit(self.scope, 'support_typing', 30, 60)
        typing_status = content.get('status')
        if typing_status not in ('typing', 'stopped'):
            typing_status = 'typing'
        await self.channel_layer.group_send(self.group, {
            'type': 'typing_event',
            'user_id': self.user.id,
            'status': typing_status,
            'exclude': self.channel_name,
        })

    async def typing_event(self, event):
        if event.get('exclude') == self.channel_name:
            return
        await self.send_json({
            'type': 'typing',
            'user_id': event['user_id'],
            'status': event['status'],
        })

    async def _handle_read(self, content):
        allow_rate_limit(self.scope, 'support_read', 60, 60)
        payload = content.get('payload') if isinstance(content.get('payload'), dict) else content
        try:
            await database_sync_to_async(mark_support_read)(
                self.user, self.conversation, message_ids=payload.get('message_ids'),
            )
        except ValidationError as exc:
            await self.send_json({'type': 'error', 'message': exc.detail})
            return
        await self.send_json({'type': 'read.marked', 'ok': True})

    async def _handle_presence(self, content):
        status = content.get('status')
        if status not in ('online', 'away'):
            status = 'online'
        await database_sync_to_async(presence_mark)(self.user.id, self._connection_id, status=status)
        await self._broadcast_presence()
        if await database_sync_to_async(is_support_eligible)(self.user):
            await database_sync_to_async(support_presence_update)(self.user, status)

    # Event handlers (invoked by the channel layer for group broadcasts)
    async def chat_message(self, event):
        await self.send_json({'type': 'chat.message', 'message': event['message']})

    async def read_receipt(self, event):
        await self.send_json({
            'type': 'read_receipt',
            'conversation_id': event['conversation_id'],
            'user_id': event['user_id'],
            'mark_all': event.get('mark_all', False),
        })

    async def support_updated(self, event):
        await self.send_json({
            'type': 'support.updated',
            'conversation': event.get('conversation'),
            'event': event.get('event'),
        })


class SupportQueueConsumer(RealtimeConsumerMixin, AsyncJsonWebsocketConsumer):
    """Staff socket per department — receives lightweight queue events and
    tells the client to refresh via REST (authoritative)."""

    async def connect(self):
        user = await self._auth_gate()
        if user is None:
            return
        if not await database_sync_to_async(is_support_staff)(user):
            await self.close(code=NOT_FOUND_CLOSE)
            return
        if not await self._register_connection(user.id):
            return
        self.user = user
        departments = await database_sync_to_async(departments_for)(user)
        if not departments:
            await self.close(code=NOT_FOUND_CLOSE)
            return
        self.departments = departments
        self._presence_groups = [f'support.department.{d}' for d in departments]
        self._groups = list(self._presence_groups)
        for group in self._groups:
            await self.channel_layer.group_add(group, self.channel_name)
        self._connected = True
        await self.accept()
        await self._start_watchdog()
        await database_sync_to_async(presence_mark)(user.id, self._connection_id)
        await self._broadcast_presence()
        await database_sync_to_async(support_presence_update)(user, 'online')
        await self.send_json({
            'type': 'connected',
            'departments': list(departments),
            'user_id': user.id,
        })

    async def disconnect(self, code):
        user = getattr(self, 'user', None)
        await super().disconnect(code)
        if user is not None and not getattr(user, 'is_anonymous', True):
            remaining = await database_sync_to_async(presence_status)(user.id)
            if remaining == 'offline':
                await database_sync_to_async(support_presence_offline)(user)

    handlers = {}

    async def queue_updated(self, event):
        await self.send_json({
            'type': 'queue.updated',
            'conversation': event.get('conversation'),
            'event': event.get('event'),
        })