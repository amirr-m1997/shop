"""Real concurrent join tests for the Style Room member cap.

SQLite does not honor ``SELECT FOR UPDATE`` the way PostgreSQL does, so these
cases skip unless the test database is PostgreSQL. Run them in CI with a
Postgres service — see ``docs/chat-production-notes.md``.
"""

from concurrent.futures import ThreadPoolExecutor

from django.contrib.auth.models import User
from django.db import connection, connections
from django.test import TransactionTestCase

from .models import MAX_ROOM_MEMBERS, StyleRoom, StyleRoomMember
from .services import RoomMemberLimitExceeded, add_member, join_room


class RoomJoinConcurrencyTests(TransactionTestCase):
    def _require_postgres(self):
        if connection.vendor != 'postgresql':
            self.skipTest(
                'row-level locks are not reliable on %s; run against PostgreSQL '
                '(set DB_NAME/DB_USER/DB_HOST).' % connection.vendor
            )

    def _fill(self, occupied):
        owner = User.objects.create_user(username='cap-owner', password='x')
        room = StyleRoom.objects.create(owner=owner, title='Cap race')
        StyleRoomMember.objects.create(room=room, user=owner, role=StyleRoomMember.ROLE_OWNER)
        for index in range(occupied - 1):
            user = User.objects.create_user(username=f'cap-fill-{index}', password='x')
            StyleRoomMember.objects.create(room=room, user=user)
        self.assertEqual(room.members.count(), occupied)
        return room

    def _join_many(self, room, users):
        def attempt(user):
            try:
                join_room(room, user)
                return True
            except RoomMemberLimitExceeded:
                return False
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=len(users)) as pool:
            return list(pool.map(attempt, users))

    def test_two_parallel_joins_at_one_seat_left(self):
        self._require_postgres()
        room = self._fill(MAX_ROOM_MEMBERS - 1)
        first = User.objects.create_user(username='cap-a', password='x')
        second = User.objects.create_user(username='cap-b', password='x')
        results = self._join_many(room, [first, second])
        self.assertEqual(sum(results), 1)
        self.assertLessEqual(room.members.count(), MAX_ROOM_MEMBERS)
        self.assertEqual(room.members.count(), MAX_ROOM_MEMBERS)

    def test_five_parallel_joins_at_one_seat_left(self):
        self._require_postgres()
        room = self._fill(MAX_ROOM_MEMBERS - 1)
        users = [
            User.objects.create_user(username=f'cap-burst-{index}', password='x')
            for index in range(5)
        ]
        results = self._join_many(room, users)
        self.assertEqual(sum(results), 1)
        self.assertEqual(room.members.count(), MAX_ROOM_MEMBERS)

    def test_five_parallel_joins_with_two_seats_left(self):
        self._require_postgres()
        room = self._fill(MAX_ROOM_MEMBERS - 2)
        users = [
            User.objects.create_user(username=f'cap-two-{index}', password='x')
            for index in range(5)
        ]
        results = self._join_many(room, users)
        self.assertEqual(sum(results), 2)
        self.assertEqual(room.members.count(), MAX_ROOM_MEMBERS)

    def test_parallel_add_member_at_one_seat_left(self):
        self._require_postgres()
        room = self._fill(MAX_ROOM_MEMBERS - 1)
        owner = room.owner
        first = User.objects.create_user(username='cap-invite-a', password='x')
        second = User.objects.create_user(username='cap-invite-b', password='x')

        def attempt(user):
            try:
                add_member(room, user, added_by=owner)
                return True
            except RoomMemberLimitExceeded:
                return False
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(attempt, [first, second]))
        self.assertEqual(sum(results), 1)
        self.assertEqual(room.members.count(), MAX_ROOM_MEMBERS)
