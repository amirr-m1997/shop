from django.contrib import admin
from django.utils.html import format_html
from .models import ShippingAddress, Order, OrderItem


# ──────────────── آدرس ارسال ────────────────

@admin.register(ShippingAddress)
class ShippingAddressAdmin(admin.ModelAdmin):
    list_display = [
        'full_name', 'user', 'phone', 'city', 'state',
        'is_default_badge', 'created_at'
    ]
    list_filter = ['is_default', 'city', 'state', 'created_at']
    search_fields = ['full_name', 'phone', 'user__username', 'city']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('اطلاعات کاربر', {
            'fields': ('user', 'full_name', 'phone')
        }),
        ('آدرس', {
            'fields': (
                'address_line1', 'address_line2',
                'city', 'state', 'postal_code', 'country'
            )
        }),
        ('تنظیمات', {
            'fields': ('is_default', 'created_at', 'updated_at')
        }),
    )

    @admin.display(description='پیش‌فرض', boolean=True)
    def is_default_badge(self, obj):
        return obj.is_default


# ──────────────── سفارش ────────────────

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['product', 'quantity', 'price', 'total_price']

    def has_add_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        'order_number', 'user', 'status_badge',
        'payment_status_badge', 'payment_method_display',
        'total_display', 'created_at'
    ]
    list_filter = ['status', 'payment_status', 'payment_method', 'created_at']
    search_fields = ['order_number', 'user__username', 'user__email']
    readonly_fields = [
        'order_number', 'subtotal', 'shipping_cost', 'tax', 'total',
        'created_at', 'updated_at'
    ]
    inlines = [OrderItemInline]
    date_hierarchy = 'created_at'

    fieldsets = (
        ('اطلاعات سفارش', {
            'fields': ('order_number', 'user', 'shipping_address')
        }),
        ('وضعیت', {
            'fields': ('status', 'payment_status', 'payment_method')
        }),
        ('مبالغ', {
            'fields': ('subtotal', 'shipping_cost', 'tax', 'discount', 'total')
        }),
        ('سایر', {
            'fields': ('notes', 'tracking_number', 'created_at', 'updated_at')
        }),
    )

    @admin.display(description='وضعیت سفارش')
    def status_badge(self, obj):
        colors = {
            'pending': '#f59e0b',
            'processing': '#3b82f6',
            'shipped': '#8b5cf6',
            'delivered': '#10b981',
            'cancelled': '#ef4444',
            'returned': '#6b7280',
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background:{}; color:white; padding:4px 12px; '
            'border-radius:12px; font-size:12px;">{}</span>',
            color, obj.get_status_display()
        )

    @admin.display(description='وضعیت پرداخت')
    def payment_status_badge(self, obj):
        colors = {
            'unpaid': '#ef4444',
            'paid': '#10b981',
            'refunded': '#f59e0b',
        }
        color = colors.get(obj.payment_status, '#6b7280')
        return format_html(
            '<span style="background:{}; color:white; padding:4px 12px; '
            'border-radius:12px; font-size:12px;">{}</span>',
            color, obj.get_payment_status_display()
        )

    @admin.display(description='روش پرداخت')
    def payment_method_display(self, obj):
        return obj.get_payment_method_display()

    @admin.display(description='مبلغ کل')
    def total_display(self, obj):
        return f"{obj.total:,.0f} تومان"


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['order', 'product', 'quantity', 'price', 'total_price']
    list_filter = ['order__status', 'order__created_at']
    search_fields = ['order__order_number', 'product__name']
    readonly_fields = ['total_price']