from django.test import TestCase, override_settings
from django.core.cache import cache
from rest_framework.test import APITestCase
from rest_framework import status
from decimal import Decimal
from products.models import Category, Brand
from django.contrib.auth.models import User

from shop.tests import (
    UserFactory, AdminUserFactory, SuperAdminUserFactory,
    AdminProfileFactory, SuperAdminProfileFactory,
    ProductFactory, CategoryFactory, OrderFactory, OrderItemFactory,
    create_user_with_token, create_admin_with_token, create_superadmin_with_token,
    BrandFactory,
)
from products.models import Product
from pages.models import FAQ, SiteSettings, Testimonial, SiteFeature, ContactInfo, CustomerSatisfaction


# ─── FAQ Tests ─────────────────────────────────────────────

class FAQListActiveOnlyTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = '/api/pages/faq/'
        self.active_faq = FAQ.objects.create(
            question='What is your return policy?', answer='30 days.', order=1, is_active=True
        )
        FAQ.objects.create(
            question='Hidden question', answer='Hidden answer', order=2, is_active=False
        )

    def test_list_returns_only_active_faqs(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['question'], 'What is your return policy?')

    def test_inactive_faq_not_in_list(self):
        response = self.client.get(self.url)
        ids = [f['id'] for f in response.data['results']]
        self.assertNotIn(2, ids)


class FAQDetailTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.faq = FAQ.objects.create(
            question='How to track my order?', answer='Use tracking link.', order=1, is_active=True
        )
        self.url = f'/api/pages/faq/{self.faq.id}/'

    def test_detail_returns_faq(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['question'], 'How to track my order?')

    def test_detail_404_for_nonexistent_faq(self):
        response = self.client.get('/api/pages/faq/99999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ─── Contact Info Tests ────────────────────────────────────

class ContactInfoGetSingletonTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = '/api/pages/contact-info/'

    def test_contact_info_returns_singleton(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('site_name', response.data)
        self.assertIn('phone1', response.data)
        self.assertIn('email1', response.data)

    def test_contact_info_creates_on_first_access(self):
        self.assertEqual(ContactInfo.objects.count(), 0)
        self.client.get(self.url)
        self.assertEqual(ContactInfo.objects.count(), 1)

    def test_contact_info_returns_same_instance(self):
        self.client.get(self.url)
        self.client.get(self.url)
        self.assertEqual(ContactInfo.objects.count(), 1)


# ─── Site Settings Tests ───────────────────────────────────

class SiteSettingsGetTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = '/api/pages/settings/'

    def test_site_settings_returns_data(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('free_shipping_threshold', response.data)
        self.assertIn('shipping_cost', response.data)

    def test_site_settings_creates_on_first_access(self):
        self.assertEqual(SiteSettings.objects.count(), 0)
        self.client.get(self.url)
        self.assertEqual(SiteSettings.objects.count(), 1)


class SiteSettingsCalculateShippingTest(TestCase):
    def setUp(self):
        cache.clear()
        self.settings = SiteSettings.load()
        self.settings.free_shipping_threshold = Decimal('500000')
        self.settings.shipping_cost = Decimal('45000')
        self.settings.save()

    def test_free_shipping_above_threshold(self):
        result = self.settings.calculate_shipping(Decimal('500000'))
        self.assertEqual(result, Decimal('0'))

    def test_free_shipping_above_threshold_large(self):
        result = self.settings.calculate_shipping(Decimal('1000000'))
        self.assertEqual(result, Decimal('0'))

    def test_paid_shipping_below_threshold(self):
        result = self.settings.calculate_shipping(Decimal('100000'))
        self.assertEqual(result, Decimal('45000'))

    def test_paid_shipping_zero_subtotal(self):
        result = self.settings.calculate_shipping(Decimal('0'))
        self.assertEqual(result, Decimal('45000'))

    def test_paid_shipping_none_subtotal(self):
        result = self.settings.calculate_shipping(None)
        self.assertEqual(result, Decimal('45000'))


# ─── Testimonial Tests ─────────────────────────────────────

class TestimonialPublicSeesApprovedFeaturedTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = '/api/pages/testimonials/'
        self.approved_featured = Testimonial.objects.create(
            name='Alice', text='Great shop!', rating=5,
            is_approved=True, is_featured=True
        )
        self.approved_not_featured = Testimonial.objects.create(
            name='Bob', text='Good prices.', rating=4,
            is_approved=True, is_featured=False
        )
        self.not_approved = Testimonial.objects.create(
            name='Charlie', text='Not yet.', rating=3,
            is_approved=False, is_featured=True
        )

    def test_public_sees_only_approved_and_featured(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['name'], 'Alice')

    def test_public_does_not_see_unapproved(self):
        response = self.client.get(self.url)
        ids = [t['id'] for t in response.data['results']]
        self.assertNotIn(self.not_approved.id, ids)

    def test_public_does_not_see_approved_not_featured(self):
        response = self.client.get(self.url)
        ids = [t['id'] for t in response.data['results']]
        self.assertNotIn(self.approved_not_featured.id, ids)


class TestimonialStaffSeesAllTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.user, self.token = create_admin_with_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.url = '/api/pages/testimonials/'
        self.approved_featured = Testimonial.objects.create(
            name='Alice', text='Great!', rating=5,
            is_approved=True, is_featured=True
        )
        self.not_approved = Testimonial.objects.create(
            name='Bob', text='Pending.', rating=3,
            is_approved=False, is_featured=False
        )

    def test_staff_sees_all_testimonials(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)


# ─── Site Feature Tests ────────────────────────────────────

class SiteFeatureListActiveOnlyTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = '/api/pages/features/'
        self.active_feature = SiteFeature.objects.create(
            title='Free Shipping', description='Over 500k tomans', icon='Truck',
            order=1, is_active=True
        )
        SiteFeature.objects.create(
            title='Hidden Feature', description='Hidden', icon='Star',
            order=2, is_active=False
        )

    def test_list_returns_only_active_features(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['title'], 'Free Shipping')

    def test_inactive_feature_not_in_list(self):
        response = self.client.get(self.url)
        ids = [f['id'] for f in response.data['results']]
        self.assertNotIn(2, ids)


class SiteFeatureDetailTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.feature = SiteFeature.objects.create(
            title='24/7 Support', description='Always available', icon='Headphones',
            order=1, is_active=True
        )
        self.url = f'/api/pages/features/{self.feature.id}/'

    def test_detail_returns_feature(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], '24/7 Support')


# ─── About Stats Tests ─────────────────────────────────────

class AboutStatsReturnsCorrectCountsTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = '/api/pages/about-stats/'

    def test_empty_database_returns_zeros(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['products_count'], 0)
        self.assertEqual(response.data['users_count'], 0)
        self.assertEqual(response.data['brands_count'], 0)

    def test_counts_active_products(self):
        cat = Category.objects.create(name='Men', slug='men')
        Product.objects.create(
            name='Product 1', slug='product-1', description='desc',
            category=cat, price=Decimal('100000'), stock=10, is_active=True,
            main_category='مردانه',
        )
        Product.objects.create(
            name='Product 2', slug='product-2', description='desc',
            category=cat, price=Decimal('100000'), stock=10, is_active=True,
            main_category='مردانه',
        )
        Product.objects.create(
            name='Product 3', slug='product-3', description='desc',
            category=cat, price=Decimal('100000'), stock=10, is_active=False,
            main_category='مردانه',
        )
        response = self.client.get(self.url)
        self.assertEqual(response.data['products_count'], 2)

    def test_counts_active_users(self):
        UserFactory(is_active=True)
        UserFactory(is_active=True)
        UserFactory(is_active=False)
        response = self.client.get(self.url)
        self.assertEqual(response.data['users_count'], 2)

    def test_counts_brands(self):
        BrandFactory()
        BrandFactory()
        response = self.client.get(self.url)
        self.assertEqual(response.data['brands_count'], 2)

    def test_returns_customer_satisfaction(self):
        sat = CustomerSatisfaction.load()
        sat.value = 95
        sat.save()
        response = self.client.get(self.url)
        self.assertEqual(response.data['customer_satisfaction'], 95)


# ─── Home Data Tests ───────────────────────────────────────

class HomeDataReturnsAllSectionsTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = '/api/pages/home/'

    def test_home_data_returns_all_keys(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expected_keys = ['banners', 'categories', 'settings', 'styles',
                         'sections', 'testimonials', 'features']
        for key in expected_keys:
            self.assertIn(key, response.data)

    def test_home_data_includes_active_testimonials(self):
        Testimonial.objects.create(
            name='Happy Customer', text='Love it!', rating=5,
            is_approved=True, is_featured=True
        )
        Testimonial.objects.create(
            name='Unapproved', text='Pending', rating=3,
            is_approved=False, is_featured=True
        )
        response = self.client.get(self.url)
        self.assertEqual(len(response.data['testimonials']), 1)

    def test_home_data_includes_active_features(self):
        SiteFeature.objects.create(
            title='Fast Delivery', description='Fast', icon='Truck',
            order=1, is_active=True
        )
        SiteFeature.objects.create(
            title='Hidden', description='Hidden', icon='Star',
            order=2, is_active=False
        )
        response = self.client.get(self.url)
        self.assertEqual(len(response.data['features']), 1)

    def test_home_data_includes_site_settings(self):
        response = self.client.get(self.url)
        self.assertIn('free_shipping_threshold', response.data['settings'])


# ─── Sitemap XML Tests ─────────────────────────────────────

class SitemapXmlTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = '/api/pages/sitemap.xml'

    def test_sitemap_returns_xml(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_sitemap_includes_categories_and_products(self):
        cat = CategoryFactory(name='Menswear', slug='menswear')
        product = ProductFactory(name='Blue Shirt', slug='blue-shirt',
                                 category=cat, is_active=True)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.content.decode('utf-8')
        self.assertIn('/category/menswear', body)
        self.assertIn('/product/blue-shirt', body)
