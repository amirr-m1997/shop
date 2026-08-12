import json
import os

from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APITestCase

from products.models import HomepageSection
from shop.tests import BlogPostFactory, ProductFactory


class PublicAPIQueryCountTests(APITestCase):
    def _get_with_query_count(self, url):
        with CaptureQueriesContext(connection) as queries:
            response = self.client.get(url)
            # Force renderer evaluation inside the measured scope.
            response.render()
        self.assertEqual(response.status_code, 200)
        return response, len(queries)

    def test_product_listing_query_count_does_not_grow_with_products(self):
        ProductFactory(is_active=True, name='needle one')
        _, one_count = self._get_with_query_count('/api/products/products/')
        ProductFactory.create_batch(19, is_active=True)
        response, twenty_count = self._get_with_query_count('/api/products/products/')

        self.assertLessEqual(twenty_count, one_count)
        self.assertLessEqual(twenty_count, 3)
        response_bytes = len(json.dumps(response.data, default=str).encode())
        self.assertLess(response_bytes, 100_000)
        if os.getenv('PERF_REPORT'):
            print(f'PERF product_list queries_1={one_count} queries_20={twenty_count} bytes_20={response_bytes}')

    def test_product_page_size_is_bounded(self):
        ProductFactory.create_batch(60, is_active=True)
        default = self.client.get('/api/products/products/')
        oversized = self.client.get('/api/products/products/?page_size=100')
        self.assertEqual(len(default.data['results']), 24)
        self.assertEqual(len(oversized.data['results']), 48)

    def test_duplicate_homepage_sections_reuse_queries_and_serialization(self):
        ProductFactory.create_batch(5, is_active=True)
        HomepageSection.objects.create(title='New 1', filter_type='new', order=1)
        _, one_count = self._get_with_query_count('/api/products/homepage-sections/')
        for number in range(2, 21):
            HomepageSection.objects.create(
                title=f'New {number}', filter_type='new', order=number,
            )
        _, twenty_count = self._get_with_query_count('/api/products/homepage-sections/')
        self.assertEqual(twenty_count, one_count)
        self.assertLessEqual(twenty_count, 4)
        if os.getenv('PERF_REPORT'):
            print(f'PERF homepage_sections queries_1={one_count} queries_20={twenty_count}')

    def test_aggregated_homepage_does_not_repeat_duplicate_section_queries(self):
        ProductFactory.create_batch(5, is_active=True)
        HomepageSection.objects.create(title='New 1', filter_type='new', order=1)
        # Warm singleton rows that are lazily created by the homepage contract.
        self.client.get('/api/pages/home/')
        _, one_count = self._get_with_query_count('/api/pages/home/')
        for number in range(2, 21):
            HomepageSection.objects.create(
                title=f'New {number}', filter_type='new', order=number,
            )
        _, twenty_count = self._get_with_query_count('/api/pages/home/')
        self.assertLessEqual(twenty_count, one_count)
        if os.getenv('PERF_REPORT'):
            print(f'PERF homepage queries_1={one_count} queries_20={twenty_count}')

    def test_product_search_query_count_is_constant(self):
        ProductFactory(is_active=True, name='needle one')
        _, one_count = self._get_with_query_count('/api/products/products/?search=needle')
        ProductFactory.create_batch(19, is_active=True, name='needle item')
        _, twenty_count = self._get_with_query_count('/api/products/products/?search=needle')
        self.assertEqual(twenty_count, one_count)
        self.assertLessEqual(twenty_count, 3)
        if os.getenv('PERF_REPORT'):
            print(f'PERF product_search queries_1={one_count} queries_20={twenty_count}')

    def test_blog_search_query_count_is_constant(self):
        BlogPostFactory(title='needle one', is_published=True)
        _, one_count = self._get_with_query_count('/api/blog/posts/?search=needle')
        BlogPostFactory.create_batch(19, title='needle article', is_published=True)
        _, twenty_count = self._get_with_query_count('/api/blog/posts/?search=needle')
        self.assertEqual(twenty_count, one_count)
        self.assertLessEqual(twenty_count, 2)
        if os.getenv('PERF_REPORT'):
            print(f'PERF blog_search queries_1={one_count} queries_20={twenty_count}')
