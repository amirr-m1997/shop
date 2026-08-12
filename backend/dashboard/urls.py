from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('products', views.AdminProductViewSet, basename='admin-products')
router.register('orders', views.AdminOrderViewSet, basename='admin-orders')
router.register('users', views.AdminUserViewSet, basename='admin-users')
router.register('customers', views.CustomerViewSet, basename='admin-customers')
router.register('todos', views.TodoViewSet, basename='admin-todos')
router.register('notes', views.AdminNoteViewSet, basename='admin-notes')
router.register('roles', views.AdminRoleViewSet, basename='admin-roles')

urlpatterns = [
    # Phase 1
    path('stats/', views.dashboard_stats, name='dashboard-stats'),
    path('sales-chart/', views.sales_chart, name='sales-chart'),
    path('recent-orders/', views.recent_orders, name='recent-orders'),
    path('categories/', views.admin_categories, name='admin-categories'),
    path('brands/', views.admin_brands, name='admin-brands'),
    path('products/<int:pk>/toggle-active/', views.admin_toggle_product_active, name='admin-toggle-active'),
    path('bulk-action/', views.admin_bulk_action, name='admin-bulk-action'),

    # Phase 2 - Low Stock
    path('low-stock/', views.low_stock_products, name='low-stock-products'),

    # Phase 2 - Customers
    path('customers/<int:user_id>/order-history/', views.customer_order_history, name='customer-order-history'),

    # Phase 2 - Notifications
    path('notifications/', views.notification_list, name='notification-list'),
    path('notifications/mark-read/', views.notification_mark_read, name='notification-mark-read-all'),
    path('notifications/<int:pk>/mark-read/', views.notification_mark_read, name='notification-mark-read'),
    path('notifications/<int:pk>/delete/', views.notification_delete, name='notification-delete'),

    # Phase 2 - Activity
    path('activity/', views.activity_feed, name='activity-feed'),

    # Phase 2 - Export
    path('export/products/', views.export_products_csv, name='export-products'),
    path('export/orders/', views.export_orders_csv, name='export-orders'),

    # Phase 3 - Reports
    path('reports/custom/', views.custom_report, name='custom-report'),
    path('reports/comparison/', views.comparison_chart, name='comparison-chart'),

    # Phase 3 - Calendar
    path('calendar/', views.calendar_data, name='calendar-data'),

    # Phase 3 - Roles & Permissions
    path('permissions/', views.admin_permissions_list, name='admin-permissions-list'),
    path('roles/<int:role_id>/assign-permissions/', views.admin_role_assign_permissions, name='admin-role-assign-permissions'),
    path('users/<int:user_id>/permissions/', views.admin_user_permissions, name='admin-user-permissions'),

    path('', include(router.urls)),
]
