from django.contrib.auth.models import User
from django.test import RequestFactory, TestCase
from datetime import timedelta
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.test import APITestCase
from django.utils import timezone

from shop.tests import ProductFactory, UserProfileFactory
from .models import (
    SupportAgentPresence, SupportAssignment, SupportConversation,
    SupportDepartmentMembership, SupportMessage,
)
from .services import create_message


class SupportApiTests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(username='customer', password='pass')
        UserProfileFactory(user=self.customer, role='user')
        self.other_customer = User.objects.create_user(username='other', password='pass')
        UserProfileFactory(user=self.other_customer, role='user')
        self.agent = User.objects.create_user(username='agent', password='pass')
        UserProfileFactory(user=self.agent, role='support_agent')
        SupportDepartmentMembership.objects.create(staff=self.agent, department='support')
        self.stylist = User.objects.create_user(username='stylist', password='pass')
        UserProfileFactory(user=self.stylist, role='fashion_stylist')
        SupportDepartmentMembership.objects.create(staff=self.stylist, department='fashion_stylist')

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def create_conversation(self, department='support'):
        self.auth(self.customer)
        return self.client.post('/api/support/conversations/', {'department': department}, format='json')

    def test_customer_can_create_both_departments(self):
        support = self.create_conversation()
        stylist = self.create_conversation('fashion_stylist')
        self.assertEqual(support.status_code, status.HTTP_201_CREATED)
        self.assertEqual(stylist.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SupportConversation.objects.count(), 2)

    def test_same_department_reuses_open_conversation(self):
        first = self.create_conversation()
        second = self.create_conversation()
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data['id'], second.data['id'])
        self.assertEqual(SupportConversation.objects.count(), 1)

    def test_closed_conversation_is_reopened_not_duplicated(self):
        first = self.create_conversation()
        conversation_id = first.data['id']
        self.client.post(f'/api/support/conversations/{conversation_id}/close/')
        reopened = self.create_conversation()
        self.assertEqual(reopened.status_code, status.HTTP_200_OK)
        self.assertEqual(reopened.data['id'], conversation_id)
        self.assertEqual(reopened.data['status'], SupportConversation.STATUS_QUEUED)
        self.assertEqual(SupportConversation.objects.count(), 1)

    def test_customer_visibility_is_scoped(self):
        conversation = self.create_conversation().data['id']
        self.auth(self.other_customer)
        self.assertEqual(self.client.get('/api/support/conversations/').data, [])
        self.assertEqual(
            self.client.get(f'/api/support/conversations/{conversation}/').status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_staff_queue_is_department_scoped(self):
        support = self.create_conversation().data['id']
        stylist = self.create_conversation('fashion_stylist').data['id']
        self.auth(self.agent)
        queue = self.client.get('/api/support/queue/')
        self.assertEqual(queue.status_code, status.HTTP_200_OK)
        self.assertEqual([row['id'] for row in queue.data], [support])
        self.auth(self.stylist)
        queue = self.client.get('/api/support/queue/')
        self.assertEqual([row['id'] for row in queue.data], [stylist])

    def test_customer_cannot_use_staff_endpoints(self):
        self.auth(self.customer)
        self.assertEqual(self.client.get('/api/support/queue/').status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get('/api/support/assigned/').status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get('/api/support/agents/').status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_agent_directory_is_department_scoped(self):
        self.auth(self.agent)
        response = self.client.get('/api/support/agents/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([row['username'] for row in response.data], ['agent'])
        self.auth(self.stylist)
        response = self.client.get('/api/support/agents/')
        self.assertEqual([row['username'] for row in response.data], ['stylist'])

    def test_claim_is_atomic_and_second_claim_fails(self):
        conversation_id = self.create_conversation().data['id']
        self.auth(self.agent)
        first = self.client.post(f'/api/support/conversations/{conversation_id}/claim/')
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data['status'], SupportConversation.STATUS_ASSIGNED)
        agent2 = User.objects.create_user(username='agent2', password='pass')
        UserProfileFactory(user=agent2, role='support_agent')
        SupportDepartmentMembership.objects.create(staff=agent2, department='support')
        self.auth(agent2)
        second = self.client.post(f'/api/support/conversations/{conversation_id}/claim/')
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

    def test_assignment_requires_matching_department(self):
        conversation_id = self.create_conversation().data['id']
        self.auth(self.agent)
        response = self.client.post(
            f'/api/support/conversations/{conversation_id}/assign/',
            {'agent_id': self.stylist.id}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_staff_with_both_memberships_can_access_both_queues(self):
        both = User.objects.create_user(username='both', password='pass')
        UserProfileFactory(user=both, role='support_agent')
        SupportDepartmentMembership.objects.create(staff=both, department='support')
        SupportDepartmentMembership.objects.create(staff=both, department='fashion_stylist')
        self.create_conversation()
        self.create_conversation('fashion_stylist')
        self.auth(both)
        response = self.client.get('/api/support/queue/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(self.client.get('/api/support/my-departments/').data['departments'], ['fashion_stylist', 'support'])

    def test_membership_is_required_even_for_staff_role(self):
        unassigned = User.objects.create_user(username='unassigned', password='pass')
        UserProfileFactory(user=unassigned, role='support_agent')
        self.create_conversation()
        self.auth(unassigned)
        self.assertEqual(self.client.get('/api/support/queue/').status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get('/api/support/my-departments/').data['departments'], [])

    def test_inactive_staff_cannot_claim_or_appear_in_agents(self):
        self.agent.is_active = False
        self.agent.save(update_fields=['is_active'])
        conversation_id = self.create_conversation().data['id']
        self.auth(self.stylist)
        self.assertNotIn('agent', [row['username'] for row in self.client.get('/api/support/agents/').data])
        self.auth(self.agent)
        self.assertEqual(self.client.post(f'/api/support/conversations/{conversation_id}/claim/').status_code, status.HTTP_403_FORBIDDEN)

    def test_assignment_rejects_inactive_target(self):
        self.stylist.is_active = False
        self.stylist.save(update_fields=['is_active'])
        conversation_id = self.create_conversation('fashion_stylist').data['id']
        self.auth(self.agent)
        response = self.client.post(f'/api/support/conversations/{conversation_id}/assign/', {'agent_id': self.stylist.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_customer_can_send_text_and_active_product(self):
        conversation_id = self.create_conversation().data['id']
        product = ProductFactory()
        self.auth(self.customer)
        response = self.client.post(
            f'/api/support/conversations/{conversation_id}/messages/',
            {'text': 'Please help', 'product_id': product.id}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['product']['id'], product.id)
        self.assertEqual(SupportMessage.objects.count(), 1)

    def test_inactive_product_is_rejected(self):
        conversation_id = self.create_conversation().data['id']
        product = ProductFactory(is_active=False)
        self.auth(self.customer)
        response = self.client.post(
            f'/api/support/conversations/{conversation_id}/messages/',
            {'product_id': product.id}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_agent_can_reply_and_customer_can_mark_messages_read(self):
        conversation_id = self.create_conversation().data['id']
        self.auth(self.agent)
        self.client.post(f'/api/support/conversations/{conversation_id}/claim/')
        self.client.post(f'/api/support/conversations/{conversation_id}/messages/', {'text': 'Welcome'}, format='json')
        self.auth(self.customer)
        unread = self.client.get('/api/support/unread-count/')
        self.assertEqual(unread.data['unread_count'], 1)
        message_id = SupportMessage.objects.get(conversation_id=conversation_id).id
        blank = self.client.post(f'/api/support/conversations/{conversation_id}/read/', {}, format='json')
        self.assertEqual(blank.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.client.get('/api/support/unread-count/').data['unread_count'], 1)
        self.client.post(
            f'/api/support/conversations/{conversation_id}/read/',
            {'message_ids': [message_id]}, format='json',
        )
        self.assertEqual(self.client.get('/api/support/unread-count/').data['unread_count'], 0)

    def test_close_and_customer_reopen_requeues(self):
        conversation_id = self.create_conversation().data['id']
        self.auth(self.customer)
        self.client.post(f'/api/support/conversations/{conversation_id}/close/')
        closed = SupportConversation.objects.get(pk=conversation_id)
        self.assertEqual(closed.status, SupportConversation.STATUS_CLOSED)
        self.client.post(f'/api/support/conversations/{conversation_id}/reopen/')
        reopened = SupportConversation.objects.get(pk=conversation_id)
        self.assertEqual(reopened.status, SupportConversation.STATUS_QUEUED)
        self.assertIsNone(reopened.assigned_agent_id)

    def test_customer_cannot_send_to_closed_conversation(self):
        conversation_id = self.create_conversation().data['id']
        self.auth(self.customer)
        self.client.post(f'/api/support/conversations/{conversation_id}/close/')
        response = self.client.post(
            f'/api/support/conversations/{conversation_id}/messages/', {'text': 'again'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_private_chat_is_not_visible_through_support_api(self):
        self.auth(self.customer)
        response = self.client.get('/api/support/conversations/999999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class SupportAdminDeletionTests(TestCase):
    def setUp(self):
        self.superuser = User.objects.create_superuser(username='admin-del', password='pass')
        self.customer = User.objects.create_user(username='customer-del', password='pass')
        self.conversation = SupportConversation.objects.create(customer=self.customer, department='support')
        SupportMessage.objects.create(conversation=self.conversation, sender=self.customer, text='hi')

    def request_as(self, user):
        request = RequestFactory().get('/admin/support/supportconversation/')
        request.user = user
        return request

    def test_conversation_delete_is_not_blocked_by_read_only_messages(self):
        from django.contrib import admin
        model_admin = admin.site._registry[SupportConversation]
        deleted_objects, model_count, perms_needed, protected = model_admin.get_deleted_objects(
            [self.conversation], self.request_as(self.superuser)
        )
        self.assertEqual(perms_needed, set())
        self.assertGreaterEqual(model_count.get(SupportMessage._meta.verbose_name_plural, 0), 1)

    def test_conversation_delete_cascades_messages(self):
        self.conversation.delete()
        self.assertEqual(SupportMessage.objects.count(), 0)

    def test_admin_delete_confirm_page_is_shown_for_superuser(self):
        from django.contrib import admin
        from django.urls import reverse
        self.client.force_login(self.superuser)
        url = reverse('admin:support_supportconversation_delete', args=[self.conversation.pk])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'مطمئن')
        self.assertNotContains(response, 'امکان حذف')


class SupportAuthMixin:
    def setUp(self):
        self.customer = User.objects.create_user(username='mix-customer', password='pass')
        UserProfileFactory(user=self.customer, role='user')
        self.agent = User.objects.create_user(username='mix-agent', password='pass')
        UserProfileFactory(user=self.agent, role='support_agent')
        SupportDepartmentMembership.objects.create(staff=self.agent, department='support')
        self.agent2 = User.objects.create_user(username='mix-agent2', password='pass')
        UserProfileFactory(user=self.agent2, role='support_agent')
        SupportDepartmentMembership.objects.create(staff=self.agent2, department='support')
        self.stylist = User.objects.create_user(username='mix-stylist', password='pass')
        UserProfileFactory(user=self.stylist, role='fashion_stylist')
        SupportDepartmentMembership.objects.create(staff=self.stylist, department='fashion_stylist')

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def create_conversation(self, department='support'):
        self.auth(self.customer)
        return self.client.post('/api/support/conversations/', {'department': department}, format='json')


class SupportEligibilityTests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(username='elig-customer', password='pass')
        self.super_no_member = User.objects.create_superuser(username='elig-super-no', password='pass')
        self.super_member = User.objects.create_superuser(username='elig-super-mem', password='pass')
        SupportDepartmentMembership.objects.create(staff=self.super_member, department='support')
        self.staff_member = User.objects.create_user(username='elig-staff', password='pass', is_staff=True)
        SupportDepartmentMembership.objects.create(staff=self.staff_member, department='support')
        self.admin_role_member = User.objects.create_user(username='elig-admin', password='pass')
        UserProfileFactory(user=self.admin_role_member, role='admin')
        SupportDepartmentMembership.objects.create(staff=self.admin_role_member, department='support')
        self.inactive_agent = User.objects.create_user(
            username='elig-inactive', password='pass', is_active=False
        )
        UserProfileFactory(user=self.inactive_agent, role='support_agent')
        SupportDepartmentMembership.objects.create(staff=self.inactive_agent, department='support')
        SupportConversation.objects.create(customer=self.customer, department='support')

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def test_superuser_without_membership_has_no_access(self):
        self.auth(self.super_no_member)
        self.assertEqual(self.client.get('/api/support/queue/').status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get('/api/support/my-departments/').data['departments'], [])

    def test_superuser_with_membership_accesses_department(self):
        self.auth(self.super_member)
        queue = self.client.get('/api/support/queue/')
        self.assertEqual(queue.status_code, status.HTTP_200_OK)
        self.assertEqual(len(queue.data), 1)
        self.assertEqual(self.client.get('/api/support/my-departments/').data['departments'], ['support'])

    def test_is_staff_user_with_membership_can_access(self):
        self.auth(self.staff_member)
        self.assertEqual(self.client.get('/api/support/queue/').status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get('/api/support/my-departments/').data['departments'], ['support'])

    def test_admin_role_with_membership_can_access(self):
        self.auth(self.admin_role_member)
        self.assertEqual(self.client.get('/api/support/queue/').status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get('/api/support/my-departments/').data['departments'], ['support'])

    def test_inactive_eligible_user_has_no_access(self):
        self.auth(self.inactive_agent)
        self.assertEqual(self.client.get('/api/support/queue/').status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get('/api/support/my-departments/').data['departments'], [])


class SupportAssignmentHistoryTests(SupportAuthMixin, APITestCase):
    def test_claim_records_assignment(self):
        conversation_id = self.create_conversation().data['id']
        self.auth(self.agent)
        self.assertEqual(
            self.client.post(f'/api/support/conversations/{conversation_id}/claim/').status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(SupportAssignment.objects.count(), 1)
        row = SupportAssignment.objects.get()
        self.assertEqual(row.conversation_id, conversation_id)
        self.assertEqual(row.agent, self.agent)
        self.assertEqual(row.action, SupportAssignment.ACTION_CLAIM)
        self.assertEqual(row.actor, self.agent)
        self.assertIsNone(row.previous_agent)

    def test_assign_without_prior_assignee_records_assign(self):
        conversation_id = self.create_conversation().data['id']
        self.auth(self.agent)
        response = self.client.post(
            f'/api/support/conversations/{conversation_id}/assign/',
            {'agent_id': self.agent2.id}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row = SupportAssignment.objects.get()
        self.assertEqual(row.action, SupportAssignment.ACTION_ASSIGN)
        self.assertEqual(row.agent, self.agent2)
        self.assertEqual(row.actor, self.agent)
        self.assertIsNone(row.previous_agent)

    def test_reassign_records_previous_agent(self):
        conversation_id = self.create_conversation().data['id']
        self.auth(self.agent)
        self.client.post(f'/api/support/conversations/{conversation_id}/claim/')
        response = self.client.post(
            f'/api/support/conversations/{conversation_id}/assign/',
            {'agent_id': self.agent2.id}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = list(SupportAssignment.objects.order_by('created_at'))
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0].action, SupportAssignment.ACTION_CLAIM)
        self.assertEqual(rows[1].action, SupportAssignment.ACTION_REASSIGN)
        self.assertEqual(rows[1].agent, self.agent2)
        self.assertEqual(rows[1].previous_agent, self.agent)

    def test_failed_second_claim_creates_no_history(self):
        conversation_id = self.create_conversation().data['id']
        self.auth(self.agent)
        self.client.post(f'/api/support/conversations/{conversation_id}/claim/')
        self.auth(self.agent2)
        self.assertEqual(
            self.client.post(f'/api/support/conversations/{conversation_id}/claim/').status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(SupportAssignment.objects.count(), 1)


class SupportPriorityTests(SupportAuthMixin, APITestCase):
    def test_priority_default_is_normal(self):
        conversation_id = self.create_conversation().data['id']
        self.auth(self.customer)
        response = self.client.get(f'/api/support/conversations/{conversation_id}/')
        self.assertEqual(response.data['priority'], SupportConversation.PRIORITY_NORMAL)

    def test_staff_can_set_priority(self):
        conversation_id = self.create_conversation().data['id']
        self.auth(self.agent)
        response = self.client.post(
            f'/api/support/conversations/{conversation_id}/priority/',
            {'priority': 'urgent'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['priority'], 'urgent')
        self.assertEqual(SupportConversation.objects.get(pk=conversation_id).priority, 'urgent')

    def test_customer_cannot_set_priority(self):
        conversation_id = self.create_conversation().data['id']
        self.auth(self.customer)
        response = self.client.post(
            f'/api/support/conversations/{conversation_id}/priority/',
            {'priority': 'high'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_wrong_department_staff_gets_404(self):
        conversation_id = self.create_conversation().data['id']
        self.auth(self.stylist)
        response = self.client.post(
            f'/api/support/conversations/{conversation_id}/priority/',
            {'priority': 'high'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_invalid_priority_is_400(self):
        conversation_id = self.create_conversation().data['id']
        self.auth(self.agent)
        response = self.client.post(
            f'/api/support/conversations/{conversation_id}/priority/',
            {'priority': 'critical'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_queue_orders_by_priority_rank_then_created_at(self):
        def queue_customer(i):
            return User.objects.create_user(username=f'queue-cust-{i}', password='pass')

        conv_a = SupportConversation.objects.create(customer=queue_customer(1), department='support', priority='urgent')
        conv_b = SupportConversation.objects.create(customer=queue_customer(2), department='support', priority='high')
        conv_c = SupportConversation.objects.create(customer=queue_customer(3), department='support', priority='normal')
        conv_d = SupportConversation.objects.create(customer=queue_customer(4), department='support', priority='urgent')
        base = timezone.now() - timedelta(days=1)
        SupportConversation.objects.filter(pk=conv_a.pk).update(created_at=base)
        SupportConversation.objects.filter(pk=conv_b.pk).update(created_at=base + timedelta(minutes=1))
        SupportConversation.objects.filter(pk=conv_c.pk).update(created_at=base + timedelta(minutes=2))
        SupportConversation.objects.filter(pk=conv_d.pk).update(created_at=base + timedelta(minutes=3))
        self.auth(self.agent)
        queue = self.client.get('/api/support/queue/')
        self.assertEqual([row['id'] for row in queue.data], [conv_a.id, conv_d.id, conv_b.id, conv_c.id])


class SupportTransactionTests(SupportAuthMixin, APITestCase):
    def test_service_rejects_closed_conversation(self):
        conv = SupportConversation.objects.create(
            customer=self.customer, department='support', status=SupportConversation.STATUS_CLOSED
        )
        with self.assertRaises(ValidationError):
            create_message(self.customer, conv, {'text': 'hi'})
        self.assertEqual(SupportMessage.objects.count(), 0)

    def test_service_rejects_non_participant(self):
        conv = SupportConversation.objects.create(customer=self.customer, department='support')
        with self.assertRaises(PermissionDenied):
            create_message(self.agent, conv, {'text': 'hi'})
        self.assertEqual(SupportMessage.objects.count(), 0)

    def test_service_creates_message_and_touches_conversation(self):
        conv = SupportConversation.objects.create(customer=self.customer, department='support')
        message = create_message(self.customer, conv, {'text': 'hello'})
        self.assertEqual(SupportMessage.objects.count(), 1)
        self.assertEqual(message.sender, self.customer)
        conv.refresh_from_db()
        self.assertIsNotNone(conv.last_message_at)


class SupportMessagesPaginationTests(SupportAuthMixin, APITestCase):
    def test_messages_are_paginated(self):
        conversation_id = self.create_conversation().data['id']
        SupportMessage.objects.bulk_create([
            SupportMessage(conversation_id=conversation_id, sender=self.customer, text=f'm{i}')
            for i in range(55)
        ])
        self.auth(self.customer)
        response = self.client.get(f'/api/support/conversations/{conversation_id}/messages/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 50)
        self.assertTrue(response.data['has_older'])
        self.assertEqual(response.data['results'][-1]['text'], 'm54')
        older = self.client.get(
            f'/api/support/conversations/{conversation_id}/messages/',
            {'before': response.data['oldest_id']},
        )
        self.assertEqual(len(older.data['results']), 5)
        self.assertFalse(older.data['has_older'])


class SupportUnreadCountPerfTests(SupportAuthMixin, APITestCase):
    def test_unread_count_is_a_single_aggregate_query(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext
        for i in range(3):
            cust = User.objects.create_user(username=f'perf-cust-{i}', password='pass')
            conv = SupportConversation.objects.create(customer=cust, department='support')
            SupportMessage.objects.create(conversation=conv, sender=self.agent, text='hi')
        self.auth(self.agent2)
        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get('/api/support/unread-count/')
        message_queries = [q['sql'] for q in ctx.captured_queries if 'support_supportmessage' in q['sql']]
        self.assertEqual(len(message_queries), 1)
        self.assertEqual(response.data['unread_count'], 3)


class SupportPresenceTests(SupportAuthMixin, APITestCase):
    def test_presence_is_touched_on_staff_queue_access(self):
        self.auth(self.agent)
        self.client.get('/api/support/queue/')
        presence = SupportAgentPresence.objects.get(staff=self.agent)
        self.assertIsNotNone(presence.last_seen_at)

    def test_presence_not_created_for_customer_requests(self):
        self.auth(self.customer)
        self.client.get('/api/support/my-departments/')
        self.assertEqual(SupportAgentPresence.objects.count(), 0)

    def test_stale_heartbeat_expires_to_away_then_offline(self):
        from datetime import timedelta
        from django.utils import timezone
        from support.services import expire_stale_support_presence

        now = timezone.now()
        SupportAgentPresence.objects.create(
            staff=self.agent,
            status=SupportAgentPresence.STATUS_ONLINE,
            heartbeat_at=now - timedelta(seconds=70),
        )
        SupportAgentPresence.objects.create(
            staff=self.agent2,
            status=SupportAgentPresence.STATUS_ONLINE,
            heartbeat_at=now - timedelta(seconds=120),
        )
        result = expire_stale_support_presence(offline_after_seconds=90, away_after_seconds=60)
        self.assertEqual(result['away'], 1)
        self.assertEqual(result['offline'], 1)
        self.assertEqual(
            SupportAgentPresence.objects.get(staff=self.agent).status,
            SupportAgentPresence.STATUS_AWAY,
        )
        self.assertEqual(
            SupportAgentPresence.objects.get(staff=self.agent2).status,
            SupportAgentPresence.STATUS_OFFLINE,
        )

    def test_fresh_heartbeat_keeps_agent_online(self):
        from django.utils import timezone
        from support.services import expire_stale_support_presence

        SupportAgentPresence.objects.create(
            staff=self.agent,
            status=SupportAgentPresence.STATUS_ONLINE,
            heartbeat_at=timezone.now(),
        )
        result = expire_stale_support_presence(offline_after_seconds=90, away_after_seconds=60)
        self.assertEqual(result['away'], 0)
        self.assertEqual(result['offline'], 0)
        self.assertEqual(
            SupportAgentPresence.objects.get(staff=self.agent).status,
            SupportAgentPresence.STATUS_ONLINE,
        )
