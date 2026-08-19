"""WebSocket consumer tests for the realtime chat layer.

Uses ``TransactionTestCase`` so ``transaction.on_commit`` broadcasts actually
run (Django's ``TestCase`` wraps each test in a rollback transaction, which
would swallow the commit-time group sends). The channel layer is the in-memory
one, which supports cross-thread group sends inside a single process.

Each scenario runs on a single event loop via ``asyncio.run``. This matters on
Python 3.9: ``asgiref.AsyncToSync`` starts a fresh event loop per call, and
``ApplicationCommunicator``'s queues bind to the loop of the call that first
touched them — so mixing ``async_to_sync(comm.connect)()`` and
``async_to_sync(comm.receive_json_from)()`` would await a queue bound to a
closed loop and time out. Driving one communicator end-to-end inside one
``asyncio.run`` avoids that entirely.
"""

import asyncio

from channels.routing import URLRouter
from channels.testing import WebsocketCommunicator
from django.conf import settings
from django.contrib.auth.models import User
from django.test import TransactionTestCase, override_settings
from rest_framework.authtoken.models import Token

from accounts.models import UserProfile
from chat.auth import TokenAuthMiddleware
from chat.models import Conversation
from support.models import SupportConversation, SupportDepartmentMembership
from style_rooms.services import add_member, create_room

from . import routing as chat_routing
from support import routing as support_routing
from style_rooms import routing as style_rooms_routing

TEST_CHANNEL_LAYERS = {
    'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'},
}

ORIGIN = b'http://localhost:3000'
HOST = b'localhost:3000'


def _app(routing_module):
    return TokenAuthMiddleware(URLRouter(routing_module.websocket_urlpatterns))


def _communicator(routing_module, path, token):
    headers = [
        (b'origin', ORIGIN),
        (b'host', HOST),
        (b'cookie', f'{settings.AUTH_TOKEN_COOKIE_NAME}={token}'.encode('latin-1')),
    ]
    return WebsocketCommunicator(_app(routing_module), path, headers=headers)


async def _expect_connected(comm):
    """Consume the socket's own ``connected`` frame (sent by base_send during
    connect, so it is always the first output on the connecting socket)."""
    message = await comm.receive_json_from()
    if message['type'] != 'connected':
        raise AssertionError(f'expected connected, got {message["type"]}')
    return message


async def _expect_presence(comm, count):
    """Consume ``count`` presence broadcasts. Each connect pushes one presence
    event to every member already in the group (including the joiner); these
    arrive after ``connected`` because they are routed through the channel
    layer once the consumer's dispatch loop starts."""
    for _ in range(count):
        message = await comm.receive_json_from()
        if message['type'] != 'presence':
            raise AssertionError(f'expected presence, got {message["type"]}')
        if message['user_id'] is None:
            raise AssertionError('presence frame missing user_id')


@override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
class PrivateChatRealtimeTests(TransactionTestCase):
    def setUp(self):
        self.alice = User.objects.create_user(username='alice', password='x')
        self.bob = User.objects.create_user(username='bob', password='x')
        self.alice_token = Token.objects.create(user=self.alice).key
        self.bob_token = Token.objects.create(user=self.bob).key
        self.conversation = Conversation.objects.create(
            user1=self.alice, user2=self.bob, status=Conversation.STATUS_ACCEPTED,
        )

    def _chat(self, path, token):
        return _communicator(chat_routing, path, token)

    def test_unauthenticated_socket_is_rejected(self):
        async def scenario():
            comm = self._chat(f'/ws/chat/user/{self.alice.id}/', 'bad-token')
            connected, _ = await comm.connect()
            self.assertFalse(connected)

        asyncio.run(scenario())

    def test_bad_origin_is_rejected(self):
        async def scenario():
            headers = [
                (b'origin', b'http://evil.example'),
                (b'cookie', f'{settings.AUTH_TOKEN_COOKIE_NAME}={self.alice_token}'.encode('latin-1')),
            ]
            comm = WebsocketCommunicator(_app(chat_routing), f'/ws/chat/user/{self.alice.id}/', headers=headers)
            connected, _ = await comm.connect()
            self.assertFalse(connected)

        asyncio.run(scenario())

    def test_user_cannot_open_another_users_channel(self):
        async def scenario():
            comm = self._chat(f'/ws/chat/user/{self.bob.id}/', self.alice_token)
            connected, _ = await comm.connect()
            self.assertFalse(connected)

        asyncio.run(scenario())

    def test_user_channel_connects(self):
        async def scenario():
            comm = self._chat(f'/ws/chat/user/{self.alice.id}/', self.alice_token)
            connected, _ = await comm.connect()
            self.assertTrue(connected)
            message = await comm.receive_json_from()
            self.assertEqual(message['type'], 'connected')
            await comm.disconnect()

        asyncio.run(scenario())

    def test_private_message_reaches_the_peer(self):
        async def scenario():
            alice_comm = self._chat(f'/ws/chat/private/{self.conversation.pk}/', self.alice_token)
            bob_comm = self._chat(f'/ws/chat/private/{self.conversation.pk}/', self.bob_token)
            await alice_comm.connect()
            await _expect_connected(alice_comm)
            await bob_comm.connect()
            await _expect_connected(bob_comm)
            await _expect_presence(alice_comm, 2)  # presence(alice), presence(bob)
            await _expect_presence(bob_comm, 1)    # presence(bob)

            # The sender's own user channel must be listening before the send
            # broadcast fires (on_commit drops it otherwise).
            alice_user_comm = self._chat(f'/ws/chat/user/{self.alice.id}/', self.alice_token)
            await alice_user_comm.connect()
            await _expect_connected(alice_user_comm)

            await alice_comm.send_json_to({'type': 'message.send', 'payload': {'text': 'سلام دنیا'}})
            ack = await alice_comm.receive_json_from()
            self.assertEqual(ack['type'], 'message.sent')

            delivered = await bob_comm.receive_json_from()
            self.assertEqual(delivered['type'], 'chat.message')
            self.assertEqual(delivered['message']['text'], 'سلام دنیا')
            self.assertEqual(delivered['message']['sender_id'], self.alice.id)

            updated = await alice_user_comm.receive_json_from()
            self.assertEqual(updated['type'], 'conversation.updated')

            await alice_comm.disconnect()
            await bob_comm.disconnect()
            await alice_user_comm.disconnect()

        asyncio.run(scenario())

    def test_read_receipt_is_broadcast(self):
        from chat.services import send_private_message
        message = send_private_message(self.alice, self.conversation, text='read me')

        async def scenario():
            alice_comm = self._chat(f'/ws/chat/private/{self.conversation.pk}/', self.alice_token)
            bob_comm = self._chat(f'/ws/chat/private/{self.conversation.pk}/', self.bob_token)
            await alice_comm.connect()
            await _expect_connected(alice_comm)
            await bob_comm.connect()
            await _expect_connected(bob_comm)
            await _expect_presence(alice_comm, 2)
            await _expect_presence(bob_comm, 1)

            await bob_comm.send_json_to({'type': 'read.mark'})
            await bob_comm.receive_json_from()  # read.marked ack
            receipt = await alice_comm.receive_json_from()
            self.assertEqual(receipt['type'], 'read_receipt')
            self.assertEqual(receipt['up_to_message_id'], message.pk)
            self.assertEqual(receipt['user_id'], self.bob.id)

            await alice_comm.disconnect()
            await bob_comm.disconnect()

        asyncio.run(scenario())

    def test_user_cannot_join_a_conversation_they_are_not_in(self):
        eve = User.objects.create_user(username='eve', password='x')
        eve_token = Token.objects.create(user=eve).key

        async def scenario():
            comm = self._chat(f'/ws/chat/private/{self.conversation.pk}/', eve_token)
            connected, _ = await comm.connect()
            self.assertFalse(connected)

        asyncio.run(scenario())

    @override_settings(REALTIME={**settings.REALTIME, 'MAX_FRAME_SIZE': 256})
    def test_oversized_frame_is_rejected(self):
        async def scenario():
            comm = self._chat(f'/ws/chat/private/{self.conversation.pk}/', self.alice_token)
            await comm.connect()
            await _expect_connected(comm)
            await _expect_presence(comm, 1)
            await comm.send_json_to({'type': 'message.send', 'payload': {'text': 'x' * 5000}})
            reply = await comm.receive_json_from()
            self.assertEqual(reply['type'], 'error')
            self.assertEqual(reply['message'], 'frame_too_large')

        asyncio.run(scenario())

    def test_invalid_payload_is_rejected(self):
        async def scenario():
            comm = self._chat(f'/ws/chat/private/{self.conversation.pk}/', self.alice_token)
            await comm.connect()
            await _expect_connected(comm)
            await _expect_presence(comm, 1)
            await comm.send_json_to(['not', 'a', 'dict'])
            reply = await comm.receive_json_from()
            self.assertEqual(reply['type'], 'error')
            self.assertEqual(reply['message'], 'invalid_payload')

        asyncio.run(scenario())

    def test_unknown_message_type_is_rejected(self):
        async def scenario():
            comm = self._chat(f'/ws/chat/private/{self.conversation.pk}/', self.alice_token)
            await comm.connect()
            await _expect_connected(comm)
            await _expect_presence(comm, 1)
            await comm.send_json_to({'type': 'no.such.handler'})
            reply = await comm.receive_json_from()
            self.assertEqual(reply['type'], 'error')
            self.assertEqual(reply['message'], 'unknown_type')

        asyncio.run(scenario())

    @override_settings(REALTIME={**settings.REALTIME, 'MAX_CONNECTIONS_PER_USER': 2})
    def test_connection_limit_per_user(self):
        async def scenario():
            first = self._chat(f'/ws/chat/private/{self.conversation.pk}/', self.alice_token)
            second = self._chat(f'/ws/chat/private/{self.conversation.pk}/', self.alice_token)
            third = self._chat(f'/ws/chat/private/{self.conversation.pk}/', self.alice_token)
            ok1, _ = await first.connect()
            self.assertTrue(ok1)
            await _expect_connected(first)
            ok2, _ = await second.connect()
            self.assertTrue(ok2)
            await _expect_connected(second)
            ok3, code = await third.connect()
            self.assertFalse(ok3)
            self.assertEqual(code, 4429)  # CONNECTION_LIMIT_CLOSE
            await first.disconnect()
            await second.disconnect()

        asyncio.run(scenario())

    @override_settings(REALTIME={**settings.REALTIME, 'MESSAGE_RATE': 3})
    def test_message_rate_limit(self):
        async def scenario():
            comm = self._chat(f'/ws/chat/private/{self.conversation.pk}/', self.alice_token)
            await comm.connect()
            await _expect_connected(comm)
            await _expect_presence(comm, 1)
            for _ in range(4):
                await comm.send_json_to({'type': 'message.send', 'payload': {'text': 'ok'}})
            # The 4th send exceeds the limit; ack/echo frames may interleave.
            reply = None
            for _ in range(8):
                reply = await comm.receive_json_from()
                if reply['type'] == 'error':
                    break
            self.assertEqual(reply['type'], 'error')
            self.assertEqual(reply['message'], 'rate_limited')

        asyncio.run(scenario())


@override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
class StyleRoomRealtimeTests(TransactionTestCase):
    def setUp(self):
        self.alice = User.objects.create_user(username='alice', password='x')
        self.bob = User.objects.create_user(username='bob', password='x')
        self.alice_token = Token.objects.create(user=self.alice).key
        self.bob_token = Token.objects.create(user=self.bob).key
        self.room = create_room(self.alice, title='اتاق تست')
        add_member(self.room, self.bob, self.alice)

    def test_room_message_reaches_members(self):
        async def scenario():
            alice_comm = _communicator(style_rooms_routing, f'/ws/style-rooms/{self.room.pk}/', self.alice_token)
            bob_comm = _communicator(style_rooms_routing, f'/ws/style-rooms/{self.room.pk}/', self.bob_token)
            await alice_comm.connect()
            await _expect_connected(alice_comm)
            await bob_comm.connect()
            await _expect_connected(bob_comm)
            await _expect_presence(alice_comm, 2)
            await _expect_presence(bob_comm, 1)

            await alice_comm.send_json_to({'type': 'message.send', 'payload': {'text': 'به این استایل چه‌طور؟'}})
            await alice_comm.receive_json_from()  # message.sent ack
            delivered = await bob_comm.receive_json_from()
            self.assertEqual(delivered['type'], 'chat.message')
            self.assertEqual(delivered['message']['text'], 'به این استایل چه‌طور؟')
            self.assertEqual(delivered['member_count'], 2)

            await alice_comm.disconnect()
            await bob_comm.disconnect()

        asyncio.run(scenario())

    def test_room_read_receipt_broadcasts_member_count(self):
        async def scenario():
            alice_comm = _communicator(style_rooms_routing, f'/ws/style-rooms/{self.room.pk}/', self.alice_token)
            bob_comm = _communicator(style_rooms_routing, f'/ws/style-rooms/{self.room.pk}/', self.bob_token)
            await alice_comm.connect()
            await _expect_connected(alice_comm)
            await bob_comm.connect()
            await _expect_connected(bob_comm)
            await _expect_presence(alice_comm, 2)
            await _expect_presence(bob_comm, 1)

            await alice_comm.send_json_to({'type': 'message.send', 'payload': {'text': 'بخوان'}})
            await alice_comm.receive_json_from()  # message.sent ack
            await bob_comm.receive_json_from()  # chat.message for bob
            await alice_comm.receive_json_from()  # echo chat.message for alice

            await bob_comm.send_json_to({'type': 'read.mark'})
            await bob_comm.receive_json_from()  # read.marked ack
            read_event = await alice_comm.receive_json_from()
            self.assertEqual(read_event['type'], 'read')
            self.assertEqual(read_event['member_count'], 2)
            self.assertEqual(read_event['user_id'], self.bob.id)

            await alice_comm.disconnect()
            await bob_comm.disconnect()

        asyncio.run(scenario())

    def test_non_member_is_rejected(self):
        eve = User.objects.create_user(username='eve', password='x')
        eve_token = Token.objects.create(user=eve).key

        async def scenario():
            comm = _communicator(style_rooms_routing, f'/ws/style-rooms/{self.room.pk}/', eve_token)
            connected, _ = await comm.connect()
            self.assertFalse(connected)

        asyncio.run(scenario())


@override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
class SupportRealtimeTests(TransactionTestCase):
    def setUp(self):
        self.customer = User.objects.create_user(username='customer', password='x')
        self.customer_token = Token.objects.create(user=self.customer).key
        self.staff = User.objects.create_user(username='staff', password='x')
        UserProfile.objects.create(user=self.staff, role='support_agent')
        SupportDepartmentMembership.objects.create(staff=self.staff, department='support')
        self.staff_token = Token.objects.create(user=self.staff).key

    def test_support_message_reaches_the_agent(self):
        conversation = SupportConversation.objects.create(
            customer=self.customer, assigned_agent=self.staff,
            department='support', status=SupportConversation.STATUS_ASSIGNED,
        )

        async def scenario():
            customer_comm = _communicator(support_routing, f'/ws/support/conversations/{conversation.pk}/', self.customer_token)
            staff_comm = _communicator(support_routing, f'/ws/support/conversations/{conversation.pk}/', self.staff_token)
            await customer_comm.connect()
            await _expect_connected(customer_comm)
            await staff_comm.connect()
            await _expect_connected(staff_comm)
            await _expect_presence(customer_comm, 2)
            await _expect_presence(staff_comm, 1)

            await customer_comm.send_json_to({'type': 'message.send', 'payload': {'text': 'سفارش من دیر شده'}})
            await customer_comm.receive_json_from()  # message.sent
            delivered = await staff_comm.receive_json_from()
            self.assertEqual(delivered['type'], 'chat.message')
            self.assertEqual(delivered['message']['text'], 'سفارش من دیر شده')

            await customer_comm.disconnect()
            await staff_comm.disconnect()

        asyncio.run(scenario())

    def test_queue_socket_gets_claim_events(self):
        from support.services import claim_conversation
        queued = SupportConversation.objects.create(
            customer=self.customer, department='support', status=SupportConversation.STATUS_QUEUED,
        )

        async def scenario():
            queue_comm = _communicator(support_routing, '/ws/support/departments/support/', self.staff_token)
            connected, _ = await queue_comm.connect()
            self.assertTrue(connected)
            await _expect_connected(queue_comm)
            await _expect_presence(queue_comm, 1)  # the joiner's own presence

            await asyncio.to_thread(claim_conversation, self.staff, queued.pk)
            event = await queue_comm.receive_json_from()
            self.assertEqual(event['type'], 'queue.updated')
            self.assertEqual(event['conversation']['id'], queued.pk)
            self.assertEqual(event['conversation']['status'], 'assigned')

            await queue_comm.disconnect()

        asyncio.run(scenario())

    def test_non_participant_is_rejected_from_conversation(self):
        intruder = User.objects.create_user(username='intruder', password='x')
        intruder_token = Token.objects.create(user=intruder).key
        conversation = SupportConversation.objects.create(
            customer=self.customer, assigned_agent=self.staff,
            department='support', status=SupportConversation.STATUS_ASSIGNED,
        )

        async def scenario():
            comm = _communicator(support_routing, f'/ws/support/conversations/{conversation.pk}/', intruder_token)
            connected, _ = await comm.connect()
            self.assertFalse(connected)

        asyncio.run(scenario())