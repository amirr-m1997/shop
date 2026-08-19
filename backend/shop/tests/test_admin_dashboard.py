from django.contrib import admin
from django.contrib.admin import AdminSite
from django.test import RequestFactory, TestCase
from django.urls import reverse

from shop import admin_site
from shop.admin_dashboard import dashboard_context
from shop.tests import AdminUserFactory


class AdminDashboardRegressionTests(TestCase):
    def setUp(self):
        self.user = AdminUserFactory()
        self.request = RequestFactory().get('/admin/', HTTP_HOST='127.0.0.1')
        self.request.user = self.user

    def test_dashboard_context_supplies_real_dashboard_sections(self):
        context = dashboard_context(self.request)

        self.assertEqual(len(context['kpi_cards']), 4)
        self.assertEqual(len(context['sales_chart']), 30)
        self.assertIn('chart_points', context)
        self.assertIn('recent_orders', context)
        self.assertIn('best_selling_products', context)

    def test_admin_index_renders_standard_django_admin(self):
        response = admin.site.index(self.request)
        response.render()

        self.assertContains(response, 'content-main')
        self.assertContains(response, 'content-dashboard')
        self.assertContains(response, 'dash-grid')
        self.assertNotContains(response, 'lux-dashboard')

    def test_admin_index_uses_custom_index_template(self):
        self.assertEqual(admin.site.index_template, 'admin/shop_index.html')

    def test_index_wired_with_dashboard_injection(self):
        self.assertIsNot(admin.site.index, AdminSite.index)

    def test_every_registered_model_changelist_renders(self):
        self.user.is_superuser = True
        self.user.save(update_fields=['is_superuser'])
        self.client.force_login(self.user)

        for model in admin.site._registry:
            url = reverse(
                f'admin:{model._meta.app_label}_{model._meta.model_name}_changelist'
            )
            with self.subTest(model=model._meta.label):
                response = self.client.get(url)
                self.assertLess(response.status_code, 500)
