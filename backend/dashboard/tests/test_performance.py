from django.core.cache import cache
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APITestCase

from shop.tests import OrderFactory, UserFactory, create_superadmin_with_token


class DashboardQueryCountTests(APITestCase):
    def setUp(self):
        cache.clear()
        _, token = create_superadmin_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')

    def _customer_query_count(self):
        with CaptureQueriesContext(connection) as queries:
            response = self.client.get('/api/dashboard/customers/')
            response.render()
        self.assertEqual(response.status_code, 200)
        return len(queries)

    def test_customer_metrics_do_not_create_per_user_queries(self):
        customer = UserFactory(is_staff=False)
        OrderFactory(user=customer, payment_status='paid')
        one_count = self._customer_query_count()

        for _ in range(19):
            user = UserFactory(is_staff=False)
            OrderFactory(user=user, payment_status='paid')
        twenty_count = self._customer_query_count()

        self.assertEqual(twenty_count, one_count)
        self.assertLessEqual(twenty_count, 5)
        if os.getenv('PERF_REPORT'):
            print(f'PERF dashboard_customers queries_1={one_count} queries_20={twenty_count}')
import os
