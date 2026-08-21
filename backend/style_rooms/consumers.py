"""WebSocket consumer for Style Rooms.

Reuses ``style_rooms.services`` so REST and WS behave identically; all
broadcasts happen via ``transaction.on_commit`` inside the services.
"""

import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.conf import settings
from rest_framework.exceptions import ValidationError

from chat.consumers import (
    CONNECTION_LIMIT_CLOSE,
    NOT_FOUND_CLOSE,
    RealtimeConsumerMixin,
)
from chat.models import Message
from chat.realtime import allow_rate_limit, presence_mark

from .models import StyleRoom
from .serializers import (
    StyleRoomMessageCreateSerializer,
    StyleRoomMessageReadSerializer,
)
from .services import (
    create_room_message,
    delete_room_message,
    favorite_room_message,
    mark_room_messages_read,
    react_room_message,
)

logger = logging.getLogger('style_rooms')


class StyleRoomConsumer(RealtimeConsumerMixin, AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = await self._auth_gate()
        if user is None:
            return
        if not await self._register_connection(user.id):
            return
        room_id = self.scope['url_route']['kwargs']['room_id']
        room = await database_sync_to_async(self._load_room)(room_id, user.id)
        if room is None:
            await self.close(code=NOT_FOUND_CLOSE)
            return
        self.user = user
        self.room = room
        self.group = f'room.{room.pk}'
        await self.channel_layer.group_add(self.group, self.channel_name)
        self._groups.append(self.group)
        self._presence_groups.append(self.group)
        self._connected = True
        await self.accept()
        await self._start_watchdog()
        await database_sync_to_async(presence_mark)(user.id, self._connection_id)
        await self._broadcast_presence()
        await self.send_json({'type': 'connected', 'room_id': str(room.pk), 'user_id': user.id})

    @staticmethod
    def _load_room(room_id, user_id):
        try:
            room = StyleRoom.objects.get(pk=room_id)
        except (StyleRoom.DoesNotExist, ValueError):
            return None
        if not room.members.filter(user_id=user_id).exists():
            return None
        return room

    async def _handle_send(self, content):
        allow_rate_limit(self.scope, 'room_send', settings.REALTIME['MESSAGE_RATE'], 60)
        payload = content.get('payload')
        if not isinstance(payload, dict):
            await self.send_json({'type': 'message.error', 'error': 'invalid_payload'})
            return
        try:
            await database_sync_to_async(self._create_room_message)(payload)
        except ValidationError as exc:
            await self.send_json({'type': 'message.error', 'error': exc.detail})
            return
        await self.send_json({'type': 'message.sent', 'ok': True})

    def _create_room_message(self, payload):
        serializer = StyleRoomMessageCreateSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        create_room_message(
            self.room,
            self.user,
            text=data.get('text', ''),
            product=data.get('product'),
            idempotency_key=data.get('idempotency_key', ''),
        )

    async def _handle_react(self, content):
        allow_rate_limit(self.scope, 'room_write', settings.REALTIME['MESSAGE_RATE'], 60)
        message_id = content.get('message_id')
        reaction = content.get('reaction', '')
        message = await database_sync_to_async(self._room_message)(message_id)
        if message is None:
            await self.send_json({'type': 'message.error', 'error': 'پیام پیدا نشد.'})
            return
        await database_sync_to_async(react_room_message)(self.user, message, reaction)
        await self.send_json({'type': 'message.reacted', 'ok': True})

    async def _handle_favorite(self, content):
        allow_rate_limit(self.scope, 'room_write', settings.REALTIME['MESSAGE_RATE'], 60)
        message_id = content.get('message_id')
        message = await database_sync_to_async(self._room_message)(message_id)
        if message is None:
            await self.send_json({'type': 'message.error', 'error': 'پیام پیدا نشد.'})
            return
        await database_sync_to_async(favorite_room_message)(self.user, message)
        await self.send_json({'type': 'message.favorited', 'ok': True})

    async def _handle_delete(self, content):
        allow_rate_limit(self.scope, 'room_write', settings.REALTIME['MESSAGE_RATE'], 60)
        message_id = content.get('message_id')
        mode = content.get('mode', 'me')
        message = await database_sync_to_async(self._room_message)(message_id)
        if message is None:
            await self.send_json({'type': 'message.error', 'error': 'پیام پیدا نشد.'})
            return
        try:
            await database_sync_to_async(delete_room_message)(self.user, message, mode=mode)
        except Exception as exc:
            await self.send_json({'type': 'message.error', 'error': str(exc)})
            return
        await self.send_json({'type': 'message.deleted', 'ok': True})

    def _room_message(self, message_id):
        return (
            self.room.messages.filter(style_room=self.room, pk=message_id).first()
        )

    async def _handle_read(self, content):
        allow_rate_limit(self.scope, 'room_read', 60, 60)
        serializer = StyleRoomMessageReadSerializer(data=content.get('payload') or {})
        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as exc:
            await self.send_json({'type': 'message.error', 'error': exc.detail})
            return
        message_ids = serializer.validated_data.get('message_ids')
        await database_sync_to_async(mark_room_messages_read)(
            self.room, self.user, message_ids,
        )
        await self.send_json({'type': 'read.marked', 'ok': True})

    async def _handle_typing(self, content):
        allow_rate_limit(self.scope, 'room_typing', 30, 60)
        typing_status = content.get('status')
        if typing_status not in ('typing', 'stopped'):
            typing_status = 'typing'
        await self.channel_layer.group_send(self.group, {
            'type': 'typing_event',
            'user_id': self.user.id,
            'status': typing_status,
            'exclude': self.channel_name,
        })

    async def _handle_presence(self, content):
        status = content.get('status')
        if status not in ('online', 'away'):
            status = 'online'
        await database_sync_to_async(presence_mark)(self.user.id, self._connection_id, status=status)
        await self._broadcast_presence()

    handlers = {
        'message.send': '_handle_send',
        'message.react': '_handle_react',
        'message.favorite': '_handle_favorite',
        'message.delete': '_handle_delete',
        'read.mark': '_handle_read',
        'typing': '_handle_typing',
        'presence': '_handle_presence',
    }

    # Event handlers (invoked by the channel layer for group broadcasts)
    async def chat_message(self, event):
        await self.send_json({
            'type': 'chat.message',
            'message': event['message'],
            'member_count': event.get('member_count'),
        })

    async def read(self, event):
        await self.send_json({
            'type': 'read',
            'message_ids': event['message_ids'],
            'user_id': event['user_id'],
            'member_count': event.get('member_count'),
        })

    async def message_updated(self, event):
        await self.send_json({
            'type': 'message.updated',
            'message_id': event['message_id'],
            'reaction': event.get('reaction'),
            'is_favorite': event.get('is_favorite'),
        })

    async def message_deleted(self, event):
        await self.send_json({
            'type': 'message.deleted',
            'message_id': event['message_id'],
            'for_everyone': event.get('for_everyone', False),
            'user_id': event.get('user_id'),
        })

    async def typing_event(self, event):
        if event.get('exclude') == self.channel_name:
            return
        await self.send_json({
            'type': 'typing',
            'user_id': event['user_id'],
            'status': event['status'],
        })