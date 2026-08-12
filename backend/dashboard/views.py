from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count, Q, Max, Prefetch, OuterRef, Subquery, IntegerField
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.http import HttpResponse
from datetime import timedelta, datetime
import csv
from shop.jalali import jalali_date

from products.models import Product, ProductImage, ProductVariant, Category, Brand, Color
from orders.models import Order, OrderItem
from django.contrib.auth.models import User
from accounts.models import UserProfile

from .permissions import IsAdminUser, IsSuperAdmin, CanDeleteProduct
from .serializers import (
    AdminProductListSerializer, AdminProductDetailSerializer,
    AdminOrderListSerializer, AdminOrderDetailSerializer,
    AdminUserSerializer, NotificationSerializer, ActivityLogSerializer,
    TodoSerializer, CustomerSerializer, CustomerOrderHistorySerializer,
    AdminNoteSerializer, AdminRoleSerializer, AdminPermissionSerializer,
)
from products.serializers import CategorySerializer, BrandSerializer
from .models import Notification, ActivityLog, TodoItem, AdminNote, AdminRole, AdminPermission, AdminRolePermission


class AdminProductViewSet(viewsets.ModelViewSet):
    """مدیریت محصولات - فقط ادمین‌ها"""
    permission_classes = [IsAuthenticated, IsAdminUser, CanDeleteProduct]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'brand', 'main_category', 'is_active', 'is_featured']
    search_fields = ['name', 'slug', 'sku', 'description']
    ordering_fields = ['name', 'price', 'stock', 'created_at', 'rating']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Product.objects.select_related('category', 'brand', 'fabric')
        if self.action == 'list':
            return qs.annotate(variants_count_value=Count('variants')).prefetch_related(
                Prefetch(
                    'images',
                    queryset=ProductImage.objects.only(
                        'id', 'product_id', 'image', 'is_primary', 'order',
                    ).order_by('order', 'id'),
                    to_attr='_admin_list_images',
                )
            )
        return qs.prefetch_related('images__color', 'variants__size', 'variants__color')

    def get_serializer_class(self):
        if self.action == 'list':
            return AdminProductListSerializer
        return AdminProductDetailSerializer

    def destroy(self, request, *args, **kwargs):
        if not request.user.profile.is_super_admin:
            return Response(
                {'error': 'فقط مدیر اصلی اجازه حذف محصول را دارد'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='images/(?P<image_id>[0-9]+)/color')
    def set_image_color(self, request, pk=None, image_id=None):
        product = self.get_object()
        image = product.images.filter(id=image_id).first()
        if not image:
            return Response({'error': 'تصویر یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

        color_id = request.data.get('color')
        if color_id in [None, '', 'null']:
            image.color = None
        else:
            try:
                color = Color.objects.get(id=color_id)
            except (Color.DoesNotExist, ValueError):
                return Response({'error': 'رنگ معتبر نیست'}, status=status.HTTP_400_BAD_REQUEST)
            image.color = color
        image.save(update_fields=['color'])

        from .serializers import AdminProductImageSerializer
        return Response(AdminProductImageSerializer(image).data)


class AdminOrderViewSet(viewsets.ModelViewSet):
    """مدیریت سفارشات"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'payment_status', 'payment_method']
    search_fields = ['order_number', 'user__username', 'user__email']
    ordering_fields = ['created_at', 'total', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        return Order.objects.select_related('user', 'shipping_address').prefetch_related('items__product')

    def get_serializer_class(self):
        if self.action == 'list':
            return AdminOrderListSerializer
        return AdminOrderDetailSerializer

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_status = instance.status
        allowed_fields = {'status', 'payment_status', 'postal_tracking_code', 'notes'}
        if not request.user.profile.is_super_admin:
            allowed_fields = {'status', 'postal_tracking_code'}

        for field in set(request.data.keys()) - allowed_fields:
            if field not in allowed_fields:
                return Response(
                    {'error': f'شما اجازه تغییر فیلد {field} را ندارید'},
                    status=status.HTTP_403_FORBIDDEN
                )

        response = super().partial_update(request, *args, **kwargs)

        # Post-update side effects: release reserved inventory/coupon when
        # an unpaid order is cancelled or expired from the admin panel,
        # and notify the customer about any status change.
        instance.refresh_from_db()
        new_status = instance.status
        if new_status != old_status:
            if old_status == 'pending_payment' and new_status in ('cancelled', 'expired'):
                from django.db import transaction
                from orders.services import release_inventory, release_coupon_hold
                with transaction.atomic():
                    release_inventory(instance)
                    release_coupon_hold(instance)

            try:
                from django_q.tasks import async_task
                async_task(
                    'orders.tasks.send_order_status_update_email',
                    instance.id,
                    old_status,
                    priority=1,
                )
            except Exception:
                try:
                    from shop.email_service import send_order_status_update
                    send_order_status_update(instance, old_status)
                except Exception:
                    pass

        return response


class AdminUserViewSet(viewsets.ModelViewSet):
    """مدیریت کاربران - فقط super_admin"""
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = AdminUserSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['date_joined', 'username']
    ordering = ['-date_joined']

    def get_queryset(self):
        return User.objects.select_related('profile').annotate(
            order_count_value=Count('orders', distinct=True),
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def dashboard_stats(request):
    """آمار کلی داشبورد"""
    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_revenue = Order.objects.filter(
        payment_status='paid'
    ).aggregate(total=Sum('total'))['total'] or 0

    revenue_this_month = Order.objects.filter(
        payment_status='paid',
        created_at__gte=month_start
    ).aggregate(total=Sum('total'))['total'] or 0

    orders_this_month = Order.objects.filter(
        created_at__gte=month_start
    ).count()

    low_stock = Product.objects.filter(is_active=True, stock__lte=5).count()

    data = {
        'total_products': Product.objects.count(),
        'total_orders': Order.objects.count(),
        'total_users': User.objects.count(),
        'total_revenue': total_revenue,
        'orders_this_month': orders_this_month,
        'revenue_this_month': revenue_this_month,
        'pending_orders': Order.objects.filter(status='pending').count(),
        'low_stock_products': low_stock,
    }
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def sales_chart(request):
    """داده نمودار فروش ۱۲ ماه اخیر"""
    now = timezone.now()
    months = []
    for i in range(11, -1, -1):
        d = now - timedelta(days=30 * i)
        month_start = d.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if i > 0:
            next_month = (d + timedelta(days=32)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            next_month = now + timedelta(days=1)

        revenue = Order.objects.filter(
            payment_status='paid',
            created_at__gte=month_start,
            created_at__lt=next_month
        ).aggregate(total=Sum('total'))['total'] or 0

        orders_count = Order.objects.filter(
            created_at__gte=month_start,
            created_at__lt=next_month
        ).count()

        months.append({
            'month': month_start.strftime('%Y-%m'),
            'revenue': float(revenue),
            'orders': orders_count,
        })

    return Response(months)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def recent_orders(request):
    """آخرین ۱۰ سفارش"""
    orders = Order.objects.select_related('user').prefetch_related('items')[:10]
    serializer = AdminOrderListSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_categories(request):
    """لیست دسته‌بندی‌ها"""
    categories = Category.objects.all()
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_brands(request):
    """لیست برندها"""
    brands = Brand.objects.all()
    serializer = BrandSerializer(brands, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_toggle_product_active(request, pk):
    """فعال/غیرفعال کردن محصول"""
    try:
        product = Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return Response({'error': 'محصول یافت نشد'}, status=404)

    product.is_active = not product.is_active
    product.save()
    return Response({
        'id': product.id,
        'is_active': product.is_active,
        'message': 'محصول فعال شد' if product.is_active else 'محصول غیرفعال شد'
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_bulk_action(request):
    """عملیات گروهی روی محصولات"""
    action = request.data.get('action')
    product_ids = request.data.get('product_ids', [])

    if not product_ids:
        return Response({'error': 'محصولی انتخاب نشده'}, status=400)

    products = Product.objects.filter(id__in=product_ids)

    if action == 'activate':
        products.update(is_active=True)
        return Response({'message': f'{products.count()} محصول فعال شد'})
    elif action == 'deactivate':
        products.update(is_active=False)
        return Response({'message': f'{products.count()} محصول غیرفعال شد'})
    elif action == 'delete':
        if not request.user.profile.is_super_admin:
            return Response({'error': 'فقط مدیر اصلی اجازه حذف دارد'}, status=403)
        products.delete()
        return Response({'message': 'محصولات حذف شدند'})

    return Response({'error': 'عملیات نامعتبر'}, status=400)


# ── Phase 2: Low Stock Alerts ────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def low_stock_products(request):
    """محصولات با موجودی کم (<=5)"""
    threshold = int(request.query_params.get('threshold', 5))
    products = Product.objects.filter(
        is_active=True, stock__lte=threshold,
    ).select_related('category', 'brand').annotate(
        variants_count_value=Count('variants'),
    ).prefetch_related(
        Prefetch(
            'images',
            queryset=ProductImage.objects.only(
                'id', 'product_id', 'image', 'is_primary', 'order',
            ).order_by('order', 'id'),
            to_attr='_admin_list_images',
        )
    )
    serializer = AdminProductListSerializer(products, many=True)
    return Response(serializer.data)


# ── Phase 2: Customers ───────────────────────────────────────────────

class CustomerViewSet(viewsets.ReadOnlyModelViewSet):
    """لیست مشتریان + جزئیات"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = CustomerSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['date_joined', 'username']
    ordering = ['-date_joined']

    def get_queryset(self):
        return User.objects.filter(is_staff=False).select_related('profile').annotate(
            order_count_value=Count('orders', distinct=True),
            total_spent_value=Sum(
                'orders__total', filter=Q(orders__payment_status='paid'),
            ),
            last_order_date_value=Max('orders__created_at'),
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def customer_order_history(request, user_id):
    """تاریخچه خرید یک مشتری"""
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({'error': 'کاربر یافت نشد'}, status=404)

    orders = Order.objects.filter(user=user).select_related('shipping_address').prefetch_related('items')
    serializer = CustomerOrderHistorySerializer(orders, many=True)
    return Response({
        'customer': CustomerSerializer(user).data,
        'orders': serializer.data,
    })


# ── Phase 2: Notifications ───────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def notification_list(request):
    """لیست نوتیفیکیشن‌ها"""
    notifications = Notification.objects.filter(user=request.user)[:30]
    serializer = NotificationSerializer(notifications, many=True)
    unread = Notification.objects.filter(user=request.user, is_read=False).count()
    return Response({'notifications': serializer.data, 'unread_count': unread})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def notification_mark_read(request, pk=None):
    """علامت خوانده شده"""
    if pk:
        Notification.objects.filter(pk=pk, user=request.user).update(is_read=True)
    else:
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'message': 'انجام شد'})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def notification_delete(request, pk):
    """حذف نوتیفیکیشن"""
    try:
        n = Notification.objects.get(pk=pk, user=request.user)
        n.delete()
        return Response({'message': 'حذف شد'})
    except Notification.DoesNotExist:
        return Response({'error': 'یافت نشد'}, status=404)


# ── Phase 2: Activity Feed ───────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def activity_feed(request):
    """لاگ فعالیت اخیر"""
    logs = ActivityLog.objects.select_related('user')[:50]
    serializer = ActivityLogSerializer(logs, many=True)
    return Response(serializer.data)


def log_activity(user, action, model_name, object_id, description):
    """Helper to create activity log entries"""
    ActivityLog.objects.create(
        user=user, action=action, model_name=model_name,
        object_id=str(object_id), description=description,
    )


# ── Phase 2: Export CSV ──────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def export_products_csv(request):
    """خروجی CSV محصولات"""
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = 'attachment; filename="products.csv"'
    response.write('\ufeff')

    writer = csv.writer(response)
    writer.writerow(['نام', 'دسته', 'برند', 'قیمت', 'قیمت اصلی', 'موجودی', 'فعال', 'ویژه', 'امتیاز', 'تاریخ'])

    products = Product.objects.select_related('category', 'brand').all()
    for p in products:
        writer.writerow([
            p.name, p.category.name if p.category else '',
            p.brand.name if p.brand else '', p.price,
            p.compare_price or '', p.stock,
            'بله' if p.is_active else 'خیر',
            'بله' if p.is_featured else 'خیر',
            p.rating, jalali_date(p.created_at),
        ])

    log_activity(request.user, 'export', 'Product', '', f'خروجی CSV محصولات ({products.count()} مورد)')
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def export_orders_csv(request):
    """خروجی CSV سفارشات"""
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = 'attachment; filename="orders.csv"'
    response.write('\ufeff')

    writer = csv.writer(response)
    writer.writerow(['شماره سفارش', 'مشتری', 'مبلغ کل', 'وضعیت', 'وضعیت پرداخت', 'روش پرداخت', 'تاریخ'])

    orders = Order.objects.select_related('user').all()
    for o in orders:
        customer = o.user.username if o.user_id else (o.guest_email or 'مهمان')
        writer.writerow([
            o.order_number, customer, o.total,
            o.get_status_display(), o.get_payment_status_display(),
            o.get_payment_method_display(), jalali_date(o.created_at),
        ])

    log_activity(request.user, 'export', 'Order', '', f'خروجی CSV سفارشات ({orders.count()} مورد)')
    return response


# ── Phase 2: Todos ───────────────────────────────────────────────────

class TodoViewSet(viewsets.ModelViewSet):
    """مدیریت وظایف"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = TodoSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['is_done', 'priority']
    ordering_fields = ['created_at', 'due_date', 'priority']
    ordering = ['is_done', '-created_at']

    def get_queryset(self):
        return TodoItem.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


from .report_views import calendar_data, comparison_chart, custom_report

# ── Phase 3: Admin Notes ─────────────────────────────────────────────

class AdminNoteViewSet(viewsets.ModelViewSet):
    """مدیریت یادداشت‌های ادمین"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = AdminNoteSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['target_type', 'is_pinned']
    search_fields = ['content']
    ordering_fields = ['created_at', 'is_pinned']
    ordering = ['-is_pinned', '-created_at']

    def get_queryset(self):
        qs = AdminNote.objects.select_related('author')
        target_type = self.request.query_params.get('target_type')
        target_id = self.request.query_params.get('target_id')
        if target_type and target_id:
            qs = qs.filter(target_type=target_type, target_id=target_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


# ── Phase 3: Roles & Permissions ─────────────────────────────────────

class AdminRoleViewSet(viewsets.ModelViewSet):
    """مدیریت نقش‌های ادمین"""
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = AdminRoleSerializer
    ordering = ['name']

    def get_queryset(self):
        role_counts = UserProfile.objects.filter(role=OuterRef('slug')).values(
            'role'
        ).annotate(total=Count('id')).values('total')
        return AdminRole.objects.annotate(
            user_count_value=Coalesce(
                Subquery(role_counts, output_field=IntegerField()), 0,
            )
        ).prefetch_related('role_permissions__permission')


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def admin_permissions_list(request):
    """لیست تمام مجوزها"""
    perms = AdminPermission.objects.all()
    serializer = AdminPermissionSerializer(perms, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def admin_role_assign_permissions(request, role_id):
    """تخصیص مجوزها به نقش"""
    try:
        role = AdminRole.objects.get(pk=role_id)
    except AdminRole.DoesNotExist:
        return Response({'error': ' نقش یافت نشد'}, status=404)

    permission_ids = request.data.get('permission_ids', [])
    AdminRolePermission.objects.filter(role=role).delete()
    for pid in permission_ids:
        try:
            perm = AdminPermission.objects.get(pk=pid)
            AdminRolePermission.objects.create(role=role, permission=perm)
        except AdminPermission.DoesNotExist:
            continue

    return Response({'message': 'مجوزها بروزرسانی شدند'})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def admin_user_permissions(request, user_id):
    """مجوزهای یک کاربر بر اساس نقش"""
    try:
        user = User.objects.get(pk=user_id)
        profile = user.profile
    except (User.DoesNotExist, UserProfile.DoesNotExist):
        return Response({'error': 'کاربر یافت نشد'}, status=404)

    role_slug = profile.role
    try:
        role = AdminRole.objects.get(slug=role_slug)
        perm_ids = role.role_permissions.values_list('permission_id', flat=True)
        perms = AdminPermission.objects.filter(id__in=perm_ids)
        serializer = AdminPermissionSerializer(perms, many=True)
        return Response({'role': role.name, 'permissions': serializer.data})
    except AdminRole.DoesNotExist:
        return Response({'role': role_slug, 'permissions': []})
