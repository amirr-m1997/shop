from django.test import TestCase
from django.core.cache import cache
from rest_framework.test import APITestCase
from rest_framework import status
from decimal import Decimal
from products.models import Product, Category
from django.contrib.auth.models import User

from shop.tests import (
    UserFactory, AdminUserFactory, SuperAdminUserFactory,
    AdminProfileFactory, SuperAdminProfileFactory,
    ProductFactory, CategoryFactory, OrderFactory, OrderItemFactory,
    create_user_with_token, create_admin_with_token, create_superadmin_with_token,
)
from dashboard.models import Notification, TodoItem
from accounts.models import UserProfile


# ─── Admin Product Tests ───────────────────────────────────

class AdminProductListTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = '/api/dashboard/products/'
        self.admin, self.token = create_admin_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        cat = Category.objects.create(name='Men', slug='men')
        Product.objects.create(
            name='Test Product', slug='test-product', description='desc',
            category=cat, price=Decimal('100000'), stock=10, is_active=True,
            main_category='مردانه',
        )

    def test_admin_can_list_products(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_admin_cannot_list_products(self):
        user, token = create_user_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_list_products(self):
        self.client.credentials()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AdminProductCreateTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = '/api/dashboard/products/'
        self.admin, self.token = create_admin_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.category = Category.objects.create(name='Men', slug='men')
        self.product_data = {
            'name': 'New Product',
            'slug': 'new-product',
            'description': 'A new product',
            'category': self.category.id,
            'main_category': 'مردانه',
            'price': Decimal('250000'),
            'stock': 10,
        }

    def test_admin_can_create_product(self):
        response = self.client.post(self.url, self.product_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'New Product')

    def test_non_admin_cannot_create_product(self):
        user, token = create_user_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        response = self.client.post(self.url, self.product_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class AdminProductUpdateTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin, self.token = create_admin_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        cat = Category.objects.create(name='Men', slug='men')
        self.product = Product.objects.create(
            name='Old Name', slug='old-name', description='desc',
            category=cat, price=Decimal('100000'), stock=10, is_active=True,
            main_category='مردانه',
        )
        self.url = f'/api/dashboard/products/{self.product.id}/'

    def test_admin_can_update_product(self):
        response = self.client.patch(self.url, {'name': 'New Name'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertEqual(self.product.name, 'New Name')

    def test_non_admin_cannot_update_product(self):
        user, token = create_user_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        response = self.client.patch(self.url, {'name': 'Hacked'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class AdminProductDeleteTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin, self.token = create_superadmin_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        cat = Category.objects.create(name='Men', slug='men')
        self.product = Product.objects.create(
            name='To Delete', slug='to-delete', description='desc',
            category=cat, price=Decimal('100000'), stock=10, is_active=True,
            main_category='مردانه',
        )
        self.url = f'/api/dashboard/products/{self.product.id}/'

    def test_super_admin_can_delete_product(self):
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_regular_admin_cannot_delete_product(self):
        admin, token = create_admin_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ─── Admin Order Tests ─────────────────────────────────────

class AdminOrderListTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = '/api/dashboard/orders/'
        self.admin, self.token = create_admin_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.order = OrderFactory()

    def test_admin_can_list_orders(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_admin_cannot_list_orders(self):
        user, token = create_user_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class AdminOrderUpdateStatusTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin, self.token = create_admin_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.order = OrderFactory(status='pending_payment')
        self.url = f'/api/dashboard/orders/{self.order.id}/'

    def test_admin_can_update_order_status(self):
        response = self.client.patch(self.url, {'status': 'processing'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'processing')

    def test_admin_cannot_update_payment_status(self):
        response = self.client.patch(self.url, {'payment_status': 'paid'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_admin_cannot_update_order(self):
        user, token = create_user_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        response = self.client.patch(self.url, {'status': 'shipped'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class AdminOrderSuperAdminUpdateTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin, self.token = create_superadmin_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.order = OrderFactory(status='pending_payment')
        self.url = f'/api/dashboard/orders/{self.order.id}/'

    def test_super_admin_can_update_payment_status(self):
        response = self.client.patch(self.url, {'payment_status': 'paid'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, 'paid')


# ─── Dashboard Stats Tests ─────────────────────────────────

class DashboardStatsReturnsCorrectCountsTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = '/api/dashboard/stats/'
        self.admin, self.token = create_admin_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')

    def test_empty_database_returns_zero_products_and_orders(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_products'], 0)
        self.assertEqual(response.data['total_orders'], 0)

    def test_counts_products(self):
        cat = Category.objects.create(name='Men', slug='men')
        Product.objects.create(
            name='P1', slug='p1', description='d', category=cat,
            price=Decimal('100'), stock=5, is_active=True, main_category='مردانه',
        )
        Product.objects.create(
            name='P2', slug='p2', description='d', category=cat,
            price=Decimal('100'), stock=5, is_active=True, main_category='مردانه',
        )
        Product.objects.create(
            name='P3', slug='p3', description='d', category=cat,
            price=Decimal('100'), stock=5, is_active=False, main_category='مردانه',
        )
        response = self.client.get(self.url)
        self.assertEqual(response.data['total_products'], 3)

    def test_counts_orders(self):
        OrderFactory()
        OrderFactory()
        response = self.client.get(self.url)
        self.assertEqual(response.data['total_orders'], 2)

    def test_counts_pending_orders(self):
        OrderFactory(status='pending')
        OrderFactory(status='processing')
        response = self.client.get(self.url)
        self.assertEqual(response.data['pending_orders'], 1)

    def test_counts_low_stock_products(self):
        cat = Category.objects.create(name='Men', slug='men')
        Product.objects.create(
            name='Low', slug='low', description='d', category=cat,
            price=Decimal('100'), stock=3, is_active=True, main_category='مردانه',
        )
        Product.objects.create(
            name='High', slug='high', description='d', category=cat,
            price=Decimal('100'), stock=10, is_active=True, main_category='مردانه',
        )
        Product.objects.create(
            name='Inactive', slug='inactive', description='d', category=cat,
            price=Decimal('100'), stock=1, is_active=False, main_category='مردانه',
        )
        response = self.client.get(self.url)
        self.assertEqual(response.data['low_stock_products'], 1)

    def test_non_admin_cannot_access_stats(self):
        user, token = create_user_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ─── Permission Tests ──────────────────────────────────────

class IsAdminUserPermissionTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = '/api/dashboard/stats/'

    def test_admin_user_has_access(self):
        admin, token = create_admin_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_admin_user_denied(self):
        user, token = create_user_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_user_denied(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class IsSuperAdminPermissionTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = '/api/dashboard/users/'

    def test_super_admin_has_access(self):
        super_admin, token = create_superadmin_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_regular_admin_denied(self):
        admin, token = create_admin_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_regular_user_denied(self):
        user, token = create_user_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class CanDeleteProductPermissionTest(APITestCase):
    def setUp(self):
        cache.clear()
        cat = Category.objects.create(name='Men', slug='men')
        self.product = Product.objects.create(
            name='To Delete', slug='to-delete', description='desc',
            category=cat, price=Decimal('100000'), stock=10, is_active=True,
            main_category='مردانه',
        )

    def test_super_admin_can_delete(self):
        super_admin, token = create_superadmin_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        url = f'/api/dashboard/products/{self.product.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_regular_admin_cannot_delete(self):
        admin, token = create_admin_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        url = f'/api/dashboard/products/{self.product.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ─── Todo Tests ────────────────────────────────────────────

class TodoCreateTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = '/api/dashboard/todos/'
        self.admin, self.token = create_admin_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')

    def test_admin_can_create_todo(self):
        response = self.client.post(self.url, {
            'title': 'Review orders',
            'priority': 'high',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TodoItem.objects.count(), 1)

    def test_todo_is_assigned_to_current_user(self):
        self.client.post(self.url, {
            'title': 'Review orders',
            'priority': 'high',
        }, format='json')
        todo = TodoItem.objects.first()
        self.assertEqual(todo.user, self.admin)


class TodoListTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = '/api/dashboard/todos/'
        self.admin, self.token = create_admin_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')

    def test_user_sees_own_todos_only(self):
        self.client.post(self.url, {'title': 'My todo', 'priority': 'medium'}, format='json')
        other_admin, other_token = create_admin_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {other_token}')
        self.client.post(self.url, {'title': 'Other todo', 'priority': 'low'}, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        response = self.client.get(self.url)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['title'], 'My todo')


class TodoUpdateTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin, self.token = create_admin_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.todo = TodoItem.objects.create(
            user=self.admin, title='Original', priority='medium'
        )
        self.url = f'/api/dashboard/todos/{self.todo.id}/'

    def test_admin_can_update_todo(self):
        response = self.client.patch(self.url, {'is_done': True}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.todo.refresh_from_db()
        self.assertTrue(self.todo.is_done)

    def test_admin_can_update_priority(self):
        response = self.client.patch(self.url, {'priority': 'high'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.todo.refresh_from_db()
        self.assertEqual(self.todo.priority, 'high')


class TodoDeleteTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin, self.token = create_admin_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.todo = TodoItem.objects.create(
            user=self.admin, title='To delete', priority='low'
        )
        self.url = f'/api/dashboard/todos/{self.todo.id}/'

    def test_admin_can_delete_todo(self):
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(TodoItem.objects.count(), 0)


class TodoUserScopedTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin, self.token = create_admin_with_token()
        self.other_admin, self.other_token = create_admin_with_token()
        self.todo = TodoItem.objects.create(
            user=self.admin, title='My private todo', priority='medium'
        )

    def test_user_cannot_update_other_users_todo(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.other_token}')
        url = f'/api/dashboard/todos/{self.todo.id}/'
        response = self.client.patch(url, {'title': 'Hacked'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_cannot_delete_other_users_todo(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.other_token}')
        url = f'/api/dashboard/todos/{self.todo.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(TodoItem.objects.count(), 1)


# ─── Notification Tests ────────────────────────────────────

class NotificationListTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = '/api/dashboard/notifications/'
        self.admin, self.token = create_admin_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')

    def test_admin_can_list_notifications(self):
        Notification.objects.create(
            user=self.admin, title='New order', message='Order #123', type='order'
        )
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('notifications', response.data)
        self.assertIn('unread_count', response.data)

    def test_user_sees_own_notifications_only(self):
        Notification.objects.create(
            user=self.admin, title='Mine', message='My msg', type='order'
        )
        other_admin, _ = create_admin_with_token()
        Notification.objects.create(
            user=other_admin, title='Theirs', message='Their msg', type='order'
        )
        response = self.client.get(self.url)
        self.assertEqual(response.data['notifications'][0]['title'], 'Mine')

    def test_unread_count_is_accurate(self):
        Notification.objects.create(
            user=self.admin, title='Read', message='msg', type='order', is_read=True
        )
        Notification.objects.create(
            user=self.admin, title='Unread', message='msg', type='order', is_read=False
        )
        response = self.client.get(self.url)
        self.assertEqual(response.data['unread_count'], 1)


class NotificationMarkReadTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin, self.token = create_admin_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.notification = Notification.objects.create(
            user=self.admin, title='Unread', message='msg', type='order', is_read=False
        )

    def test_mark_single_notification_read(self):
        url = f'/api/dashboard/notifications/{self.notification.id}/mark-read/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.notification.refresh_from_db()
        self.assertTrue(self.notification.is_read)

    def test_mark_all_notifications_read(self):
        Notification.objects.create(
            user=self.admin, title='Another', message='msg', type='order', is_read=False
        )
        url = '/api/dashboard/notifications/mark-read/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        unread = Notification.objects.filter(user=self.admin, is_read=False).count()
        self.assertEqual(unread, 0)


class NotificationDeleteTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin, self.token = create_admin_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.notification = Notification.objects.create(
            user=self.admin, title='To delete', message='msg', type='order'
        )
        self.url = f'/api/dashboard/notifications/{self.notification.id}/delete/'

    def test_admin_can_delete_notification(self):
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Notification.objects.count(), 0)

    def test_cannot_delete_other_users_notification(self):
        other_admin, other_token = create_admin_with_token()
        Notification.objects.create(
            user=other_admin, title='Other', message='msg', type='order'
        )
        other_notification = Notification.objects.filter(user=other_admin).first()
        url = f'/api/dashboard/notifications/{other_notification.id}/delete/'
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {other_token}')
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Notification.objects.filter(user=other_admin).count(), 0)

    def test_delete_nonexistent_notification_returns_404(self):
        url = '/api/dashboard/notifications/99999/delete/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
