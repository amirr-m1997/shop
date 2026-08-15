from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from shop.tests import ProductFactory, UserProfileFactory
from .models import SupportConversation, SupportDepartmentMembership, SupportMessage


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
        self.client.post(f'/api/support/conversations/{conversation_id}/read/')
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
