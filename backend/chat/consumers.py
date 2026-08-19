"""WebSocket consumers for private chat.

- ``PrivateChatConsumer``: one socket per private conversation. Sends and
  read receipts are performed through the shared ``chat.services`` layer so
  REST and WS behave identically; broadcasts happen via
  ``transaction.on_commit`` in the services.
- ``UserChannelConsumer``: personal inbox — receives unread-count updates,
  conversation-list updates and notifications for the user without a socket
  per conversation.
"""

import asyncio
import json
import logging
import secrets
import time

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from rest_framework.exceptions import ValidationError

from .models import Block, Conversation
from .realtime import (
    RealtimeRateLimitExceeded,
    allow_rate_limit,
    presence_mark,
    presence_status,
    presence_unmark,
)
from .services import (
    SendMessageError,
    mark_conversation_read,
    send_private_message,
    send_rate_limit,
)

logger = logging.getLogger('chat')

AUTH_CLOSE = 4401
NOT_FOUND_CLOSE = 4404
DISABLED_CLOSE = 4403
CONNECTION_LIMIT_CLOSE = 4429
FRAME_TOO_LARGE_CLOSE = 4409


def _user_from_scope(scope):
    user = scope.get('user') or AnonymousUser()
    return user


def _mark_presence(user_id, connection_id, status='online'):
    presence_mark(user_id, connection_id, status=status)


def _unmark_presence(user_id, connection_id):
    presence_unmark(user_id, connection_id)


def _current_presence(user_id):
    return presence_status(user_id)


class RealtimeConsumerMixin:
    """Shared connection lifecycle: auth gate, presence, heartbeat watchdog."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._connection_id = secrets.token_hex(8)
        self._last_activity = 0.0
        self._watchdog_task = None
        self._groups = []
        self._presence_groups = []
        self._connected = False
        self.user = AnonymousUser()

    # ── Auth / limits ────────────────────────────────────────────

    async def _auth_gate(self):
        if not settings.REALTIME['ENABLED']:
            await self.close(code=DISABLED_CLOSE)
            return None
        user = _user_from_scope(self.scope)
        if not user.is_authenticated or not getattr(user, 'is_active', False):
            await self.close(code=AUTH_CLOSE)
            return None
        return user

    async def _register_connection(self, user_id):
        allowed = await database_sync_to_async(
            lambda: self._presence_connect(user_id, self._connection_id)
        )()
        if not allowed:
            await self.close(code=CONNECTION_LIMIT_CLOSE)
        return allowed

    @staticmethod
    def _presence_connect(user_id, connection_id):
        from .realtime import presence_connect
        return presence_connect(user_id, connection_id)

    # ── Heartbeat watchdog ───────────────────────────────────────

    async def _start_watchdog(self):
        self._last_activity = time.monotonic()
        self._watchdog_task = asyncio.ensure_future(self._watchdog_loop())

    async def _watchdog_loop(self):
        cfg = settings.REALTIME
        try:
            while True:
                await asyncio.sleep(cfg['HEARTBEAT_INTERVAL'])
                if time.monotonic() - self._last_activity > cfg['INACTIVITY_TIMEOUT']:
                    await self.close(code=4408)
                    return
        except asyncio.CancelledError:
            return

    # ── Receive dispatch ─────────────────────────────────────────

    async def receive_json(self, content, **kwargs):
        self._last_activity = time.monotonic()
        try:
            size = len(json.dumps(content))
        except (TypeError, ValueError):
            size = 0
        if size > settings.REALTIME['MAX_FRAME_SIZE']:
            await self.send_json({'type': 'error', 'message': 'frame_too_large'})
            await self.close(code=FRAME_TOO_LARGE_CLOSE)
            return
        if not isinstance(content, dict):
            await self.send_json({'type': 'error', 'message': 'invalid_payload'})
            return
        kind = content.get('type')
        if kind == 'ping':
            await self.send_json({'type': 'pong'})
            return
        handler = self.handlers.get(kind)
        if handler is None:
            await self.send_json({'type': 'error', 'message': 'unknown_type', 'received': kind})
            return
        if isinstance(handler, str):
            handler = getattr(self, handler)
        try:
            await handler(content)
        except RealtimeRateLimitExceeded as exc:
            await self.send_json({'type': 'error', 'message': 'rate_limited', 'bucket': str(exc)})
        except Exception:
            logger.exception('[ws_handler_error] consumer=%s type=%s', self.__class__.__name__, kind)
            await self.send_json({'type': 'error', 'message': 'handler_error'})

    # ── Presence ──────────────────────────────────────────────────

    async def _broadcast_presence(self):
        status = await database_sync_to_async(_current_presence)(self.user.id)
        for group in self._presence_groups:
            await self.channel_layer.group_send(group, {
                'type': 'presence_event',
                'user_id': self.user.id,
                'status': status,
            })

    async def presence_event(self, event):
        await self.send_json({
            'type': 'presence',
            'user_id': event['user_id'],
            'status': event['status'],
        })

    # ── Connect / disconnect ──────────────────────────────────────

    async def connect(self):
        # Subclasses implement after performing authorization; they must call
        # this helpers manually because accept() must follow authorization.
        raise NotImplementedError

    async def disconnect(self, code):
        if self._watchdog_task:
            self._watchdog_task.cancel()
        for group in self._groups:
            await self.channel_layer.group_discard(group, self.channel_name)
        if self._connected:
            await database_sync_to_async(_unmark_presence)(self.user.id, self._connection_id)
            await self._broadcast_presence()


class PrivateChatConsumer(RealtimeConsumerMixin, AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = await self._auth_gate()
        if user is None:
            return
        if not await self._register_connection(user.id):
            return
        conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        conversation = await database_sync_to_async(self._load_conversation)(
            conversation_id, user.id,
        )
        if conversation is None:
            await self.close(code=NOT_FOUND_CLOSE)
            return
        self.user = user
        self.conversation = conversation
        self.group = f'chat.private.{conversation_id}'
        await self.channel_layer.group_add(self.group, self.channel_name)
        self._groups.append(self.group)
        self._presence_groups.append(self.group)
        self._connected = True
        await self.accept()
        await self._start_watchdog()
        await database_sync_to_async(_mark_presence)(user.id, self._connection_id)
        await self._broadcast_presence()
        await self.send_json({
            'type': 'connected',
            'conversation_id': conversation_id,
            'user_id': user.id,
        })

    @staticmethod
    def _load_conversation(conversation_id, user_id):
        try:
            conversation = Conversation.objects.select_related(
                'user1', 'user2', 'user1__profile', 'user2__profile',
            ).get(pk=conversation_id)
        except Conversation.DoesNotExist:
            return None
        if user_id not in (conversation.user1_id, conversation.user2_id):
            return None
        return conversation

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
        allow_rate_limit(
            self.scope,
            'send',
            send_rate_limit(self.user, settings.REALTIME['MESSAGE_RATE']),
            60,
        )
        payload = content.get('payload')
        if not isinstance(payload, dict):
            await self.send_json({'type': 'message.error', 'error': 'invalid_payload'})
            return
        try:
            await database_sync_to_async(send_private_message)(
                self.user,
                self.conversation,
                text=payload.get('text') or '',
                product_id=payload.get('product_id'),
                reply_to_id=payload.get('reply_to_id'),
                idempotency_key=payload.get('idempotency_key') or '',
            )
        except SendMessageError as exc:
            await self.send_json({'type': 'message.error', 'error': exc.message})
            return
        except ValidationError:
            await self.send_json({'type': 'message.error', 'error': 'invalid_payload'})
            return
        # The broadcast (echo to sender + peers) is emitted inside the service
        # via transaction.on_commit.
        await self.send_json({'type': 'message.sent', 'ok': True})

    async def _handle_typing(self, content):
        allow_rate_limit(self.scope, 'typing', 30, 60)
        blocked = await database_sync_to_async(Block.is_blocked)(
            self.user, self.conversation.other_user(self.user),
        )
        if blocked:
            return
        status = content.get('status')
        if status not in ('typing', 'stopped'):
            status = 'typing'
        await self.channel_layer.group_send(self.group, {
            'type': 'typing_event',
            'user_id': self.user.id,
            'status': status,
        })

    async def typing_event(self, event):
        await self.send_json({
            'type': 'typing',
            'user_id': event['user_id'],
            'status': event['status'],
        })

    async def _handle_read(self, content):
        allow_rate_limit(self.scope, 'read', 60, 60)
        payload = content.get('payload') if isinstance(content.get('payload'), dict) else content
        try:
            await database_sync_to_async(mark_conversation_read)(
                self.user, self.conversation, message_ids=payload.get('message_ids'),
            )
        except SendMessageError as exc:
            await self.send_json({'type': 'error', 'message': exc.message})
            return
        await self.send_json({'type': 'read.marked', 'ok': True})

    async def _handle_presence(self, content):
        status = content.get('status')
        if status not in ('online', 'away'):
            status = 'online'
        await database_sync_to_async(_mark_presence)(self.user.id, self._connection_id, status=status)
        await self._broadcast_presence()

    # Event handlers (invoked by the channel layer for group broadcasts)
    async def chat_message(self, event):
        await self.send_json({'type': 'chat.message', 'message': event['message']})

    async def read_receipt(self, event):
        await self.send_json({
            'type': 'read_receipt',
            'conversation_id': event['conversation_id'],
            'up_to_message_id': event.get('up_to_message_id'),
            'message_ids': event.get('message_ids') or [],
            'user_id': event['user_id'],
        })

    async def delivery_receipt(self, event):
        await self.send_json({
            'type': 'delivery_receipt',
            'conversation_id': event['conversation_id'],
            'message_ids': event.get('message_ids') or [],
            'user_id': event['user_id'],
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
            'conversation_id': event.get('conversation_id'),
        })


class UserChannelConsumer(RealtimeConsumerMixin, AsyncJsonWebsocketConsumer):
    """Personal inbox socket — receives list-affecting events for one user."""

    async def connect(self):
        user = await self._auth_gate()
        if user is None:
            return
        url_user_id = self.scope['url_route']['kwargs'].get('user_id')
        if url_user_id != user.id:
            # A user may only open their own inbox channel.
            await self.close(code=NOT_FOUND_CLOSE)
            return
        if not await self._register_connection(user.id):
            return
        self.user = user
        self.group = f'chat.user.{user.id}'
        await self.channel_layer.group_add(self.group, self.channel_name)
        self._groups.append(self.group)
        self._connected = True
        await self.accept()
        await self._start_watchdog()
        await self.send_json({'type': 'connected', 'user_id': user.id})

    handlers = {}

    # Forwarded events (dict keys must match what services broadcast)
    async def unread(self, event):
        await self.send_json({'type': 'unread', 'conversation': event['conversation']})

    async def conversation_updated(self, event):
        await self.send_json({'type': 'conversation.updated', 'conversation': event['conversation']})

    async def notification(self, event):
        await self.send_json({'type': 'notification', 'notification': event['notification']})

    async def support_unread(self, event):
        await self.send_json({
            'type': 'support.unread',
            'conversation_id': event['conversation_id'],
            'unread_count': event['unread_count'],
            'from': event.get('from'),
        })

    async def support_updated(self, event):
        await self.send_json({'type': 'support.updated', 'conversation_id': event['conversation_id']})