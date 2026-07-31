from rest_framework import serializers
from django.contrib.auth.models import User
from products.models import (
    Product, ProductImage, ProductVariant, Category, Brand,
    Size, Color, Fabric
)
from orders.models import Order, OrderItem


class AdminUserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    order_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'role', 'order_count', 'date_joined']

    def get_role(self, obj):
        try:
            return obj.profile.role
        except Exception:
            return 'user'

    def get_order_count(self, obj):
        return obj.orders.count()


class CategoryBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']


class BrandBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ['id', 'name', 'slug']


class AdminProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'alt_text', 'order', 'is_primary']


class AdminProductVariantSerializer(serializers.ModelSerializer):
    size_name = serializers.CharField(source='size.name', read_only=True)
    color_name = serializers.CharField(source='color.name', read_only=True)
    color_hex = serializers.CharField(source='color.hex_code', read_only=True)

    class Meta:
        model = ProductVariant
        fields = ['id', 'size', 'size_name', 'color', 'color_name', 'color_hex',
                  'stock', 'price_adjustment', 'sku']


class AdminProductListSerializer(serializers.ModelSerializer):
    primary_image = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    brand_name = serializers.SerializerMethodField()
    variants_count = serializers.SerializerMethodField()
    discount_percentage = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'category', 'category_name',
            'brand', 'brand_name', 'main_category',
            'price', 'compare_price', 'discount_percentage',
            'stock', 'sku', 'is_active', 'is_featured',
            'is_new_arrival', 'is_trending',
            'rating', 'review_count', 'variants_count',
            'primary_image', 'created_at', 'updated_at',
        ]

    def get_brand_name(self, obj):
        return obj.brand.name if obj.brand else None

    def get_primary_image(self, obj):
        primary = obj.images.filter(is_primary=True).first()
        if primary:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(primary.image.url)
            return primary.image.url
        image = obj.images.first()
        if image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(image.image.url)
            return image.image.url
        return None

    def get_variants_count(self, obj):
        return obj.variants.count()


class AdminProductDetailSerializer(serializers.ModelSerializer):
    images = AdminProductImageSerializer(many=True, read_only=True)
    variants = AdminProductVariantSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    brand_name = serializers.SerializerMethodField()
    fabric_name = serializers.SerializerMethodField()
    discount_percentage = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description', 'category', 'category_name',
            'brand', 'brand_name', 'main_category', 'fabric', 'fabric_name',
            'price', 'compare_price', 'cost_price', 'discount_percentage',
            'sku', 'stock', 'is_active', 'is_featured',
            'is_new_arrival', 'is_trending',
            'rating', 'review_count', 'images', 'variants',
            'created_at', 'updated_at',
        ]

    def get_brand_name(self, obj):
        return obj.brand.name if obj.brand else None

    def get_fabric_name(self, obj):
        return obj.fabric.name if obj.fabric else None


class AdminOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()
    variant_info = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'variant', 'variant_info',
                  'quantity', 'price', 'total_price']

    def get_product_name(self, obj):
        return obj.product.name if obj.product else "محصول حذف شده"

    def get_variant_info(self, obj):
        if obj.variant:
            return f"{obj.variant.size.name} / {obj.variant.color.name}"
        return None


class AdminOrderListSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    items_count = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'user', 'user_username',
            'status', 'status_display',
            'payment_status', 'payment_status_display',
            'payment_method', 'subtotal', 'shipping_cost',
            'total', 'items_count', 'created_at', 'updated_at',
        ]

    def get_items_count(self, obj):
        return obj.items.count()


class AdminOrderDetailSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    items = AdminOrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    shipping_address_detail = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'user', 'user_username',
            'shipping_address', 'shipping_address_detail',
            'status', 'status_display',
            'payment_status', 'payment_status_display',
            'payment_method', 'subtotal', 'shipping_cost',
            'tax', 'discount', 'total',
            'notes', 'tracking_number', 'postal_tracking_code',
            'items', 'created_at', 'updated_at',
        ]

    def get_shipping_address_detail(self, obj):
        if obj.shipping_address:
            addr = obj.shipping_address
            return {
                'full_name': addr.full_name,
                'phone': addr.phone,
                'address': addr.address_line1,
                'city': addr.city,
                'state': addr.state,
                'postal_code': addr.postal_code,
            }
        return None


class DashboardStatsSerializer(serializers.Serializer):
    total_products = serializers.IntegerField()
    total_orders = serializers.IntegerField()
    total_users = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    orders_this_month = serializers.IntegerField()
    revenue_this_month = serializers.DecimalField(max_digits=15, decimal_places=2)
    pending_orders = serializers.IntegerField()
    low_stock_products = serializers.IntegerField()


class NotificationSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        from .models import Notification
        model = Notification
        fields = ['id', 'title', 'message', 'type', 'type_display', 'link', 'is_read', 'created_at']
        read_only_fields = ['created_at']


class ActivityLogSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        from .models import ActivityLog
        model = ActivityLog
        fields = ['id', 'user', 'user_username', 'action', 'action_display',
                  'model_name', 'object_id', 'description', 'created_at']


class TodoSerializer(serializers.ModelSerializer):
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)

    class Meta:
        from .models import TodoItem
        model = TodoItem
        fields = ['id', 'title', 'description', 'priority', 'priority_display',
                  'is_done', 'due_date', 'created_at']
        read_only_fields = ['created_at']


class CustomerSerializer(serializers.ModelSerializer):
    order_count = serializers.SerializerMethodField()
    total_spent = serializers.SerializerMethodField()
    last_order_date = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'is_active', 'role', 'order_count', 'total_spent',
                  'last_order_date', 'date_joined']

    def get_role(self, obj):
        try:
            return obj.profile.role
        except Exception:
            return 'user'

    def get_order_count(self, obj):
        return obj.orders.count()

    def get_total_spent(self, obj):
        from django.db.models import Sum
        total = obj.orders.filter(payment_status='paid').aggregate(t=Sum('total'))['t']
        return float(total or 0)

    def get_last_order_date(self, obj):
        order = obj.orders.order_by('-created_at').first()
        return order.created_at if order else None


class CustomerOrderHistorySerializer(serializers.ModelSerializer):
    items_count = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'order_number', 'status', 'status_display',
                  'total', 'items_count', 'created_at']

    def get_items_count(self, obj):
        return obj.items.count()


class AdminNoteSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='author.username', read_only=True)
    target_type_display = serializers.CharField(source='get_target_type_display', read_only=True)

    class Meta:
        from .models import AdminNote
        model = AdminNote
        fields = ['id', 'author', 'author_username', 'content', 'target_type',
                  'target_type_display', 'target_id', 'is_pinned', 'created_at', 'updated_at']
        read_only_fields = ['author', 'created_at', 'updated_at']


class AdminPermissionSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        from .models import AdminPermission
        model = AdminPermission
        fields = ['id', 'name', 'slug', 'category', 'category_display', 'description']


class AdminRoleSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()
    user_count = serializers.SerializerMethodField()

    class Meta:
        from .models import AdminRole
        model = AdminRole
        fields = ['id', 'name', 'slug', 'description', 'is_default', 'permissions', 'user_count', 'created_at']
        read_only_fields = ['created_at']

    def get_permissions(self, obj):
        perm_ids = obj.role_permissions.values_list('permission_id', flat=True)
        return list(perm_ids)

    def get_user_count(self, obj):
        from accounts.models import UserProfile
        return UserProfile.objects.filter(role=obj.slug).count()
