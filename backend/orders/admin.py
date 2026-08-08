from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from unfold.decorators import display

from .models import ShippingAddress, Order, OrderItem, Coupon, CouponUsage, WelcomeClaim

try:
    import jdatetime
    HAS_JALALI = True
except ImportError:
    HAS_JALALI = False


def to_jalali(dt):
    if not dt or not HAS_JALALI:
        return dt
    return jdatetime.datetime.fromgregorian(datetime=dt).strftime('%Y/%m/%d - %H:%M')


# ──────────────── آدرس ارسال ────────────────

@admin.register(ShippingAddress)
class ShippingAddressAdmin(ModelAdmin):
    list_display = [
        'full_name', 'user', 'phone', 'city', 'state',
        'is_default', 'created_at_jalali'
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

    @display(description='تاریخ ایجاد')
    def created_at_jalali(self, obj):
        return to_jalali(obj.created_at)


# ──────────────── سفارش ────────────────

class OrderItemInline(TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['product', 'quantity', 'price', 'total_price']

    def has_add_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


STATUS_LABELS = {
    'pending_payment': 'warning',
    'pending': 'warning',
    'processing': 'info',
    'shipped': 'primary',
    'delivered': 'success',
    'cancelled': 'danger',
    'expired': 'danger',
    'returned': 'danger',
}

PAYMENT_STATUS_LABELS = {
    'unpaid': 'danger',
    'paid': 'success',
    'refunded': 'warning',
}


@admin.register(Order)
class OrderAdmin(ModelAdmin):
    list_display = [
        'order_number', 'customer_cell', 'status_badge',
        'payment_status_badge', 'payment_method_display',
        'total_display', 'created_at_jalali'
    ]
    list_filter = ['status', 'payment_status', 'payment_method', 'created_at']
    list_filter_submit = True
    search_fields = ['order_number', 'user__username', 'user__email', 'guest_email', 'guest_phone', 'shipping_address__full_name', 'shipping_address__phone']
    readonly_fields = [
        'order_number', 'subtotal', 'shipping_cost', 'tax', 'total',
        'created_at', 'updated_at'
    ]
    inlines = [OrderItemInline]
    date_hierarchy = 'created_at'
    actions = ['mark_processing', 'mark_shipped', 'mark_delivered', 'mark_paid']

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
            'fields': ('notes', 'tracking_number', 'postal_tracking_code', 'created_at', 'updated_at')
        }),
    )

    @display(description='مشتری')
    def customer_cell(self, obj):
        from django.utils.html import format_html
        name = obj.user.get_full_name() or obj.user.username if obj.user else 'مهمان'
        email = obj.user.email if obj.user else (obj.guest_email or obj.guest_phone or '')
        return format_html('<div class="admin-customer-cell"><strong>{}</strong><span>{}</span></div>', name, email)

    @display(description='وضعیت سفارش', label=STATUS_LABELS)
    def status_badge(self, obj):
        return obj.status, obj.get_status_display()

    @display(description='وضعیت پرداخت', label=PAYMENT_STATUS_LABELS)
    def payment_status_badge(self, obj):
        return obj.payment_status, obj.get_payment_status_display()

    @display(description='روش پرداخت')
    def payment_method_display(self, obj):
        return obj.get_payment_method_display()

    @display(description='مبلغ کل', ordering='total')
    def total_display(self, obj):
        return f"{obj.total:,.0f} تومان"

    @display(description='تاریخ ثبت', ordering='created_at')
    def created_at_jalali(self, obj):
        return to_jalali(obj.created_at)

    # ── Bulk Actions ──
    @admin.action(description='تغییر وضعیت به "در حال پردازش"')
    def mark_processing(self, request, queryset):
        count = queryset.update(status='processing')
        self.message_user(request, f'{count} سفارش به "در حال پردازش" تغییر کرد.')

    @admin.action(description='تغییر وضعیت به "ارسال شده"')
    def mark_shipped(self, request, queryset):
        count = queryset.update(status='shipped')
        self.message_user(request, f'{count} سفارش به "ارسال شده" تغییر کرد.')

    @admin.action(description='تغییر وضعیت به "تحویل داده شده"')
    def mark_delivered(self, request, queryset):
        count = queryset.update(status='delivered')
        self.message_user(request, f'{count} سفارش به "تحویل داده شده" تغییر کرد.')

    @admin.action(description='تغییر وضعیت پرداخت به "پرداخت شده"')
    def mark_paid(self, request, queryset):
        count = queryset.update(payment_status='paid', status='processing')
        self.message_user(request, f'{count} سفارش به "پرداخت شده" تغییر کرد.')


@admin.register(OrderItem)
class OrderItemAdmin(ModelAdmin):
    list_display = ['order', 'product', 'quantity', 'price', 'total_price']
    list_filter = ['order__status', 'order__created_at']
    search_fields = ['order__order_number', 'product__name']
    readonly_fields = ['total_price']


# ──────────────── کوپن تخفیف ────────────────

class CouponUsageInline(TabularInline):
    model = CouponUsage
    extra = 0
    readonly_fields = ['user', 'used_at', 'order']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Coupon)
class CouponAdmin(ModelAdmin):
    list_display = [
        'code', 'discount_type', 'value_display', 'min_amount_display',
        'is_welcome_offer', 'is_active', 'usage_progress',
        'valid_from_jalali', 'valid_until_jalali'
    ]
    list_filter = ['is_active', 'is_welcome_offer', 'discount_type', 'valid_from', 'valid_until']
    list_filter_submit = True
    search_fields = ['code']
    inlines = [CouponUsageInline]
    fieldsets = (
        ('کد تخفیف', {
            'fields': ('code', 'discount_type', 'value')
        }),
        ('محدودیت‌ها', {
            'fields': ('min_amount', 'max_uses', 'is_active', 'is_welcome_offer')
        }),
        ('مدت اعتبار', {
            'fields': ('valid_from', 'valid_until')
        }),
    )

    @display(description='مقدار')
    def value_display(self, obj):
        if obj.discount_type == 'percentage':
            return f"{obj.value:,.0f}٪"
        return f"{obj.value:,.0f} تومان"

    @display(description='حداقل خرید')
    def min_amount_display(self, obj):
        return f"{obj.min_amount:,.0f} تومان" if obj.min_amount else '—'

    @display(description='میزان استفاده')
    def usage_progress(self, obj):
        max_uses = obj.max_uses or '∞'
        return f"{obj.used_count} / {max_uses}"

    @display(description='اعتبار از')
    def valid_from_jalali(self, obj):
        return to_jalali(obj.valid_from)

    @display(description='اعتبار تا')
    def valid_until_jalali(self, obj):
        return to_jalali(obj.valid_until)


@admin.register(CouponUsage)
class CouponUsageAdmin(ModelAdmin):
    list_display = ['coupon', 'user', 'used_at_jalali', 'order']
    list_filter = ['used_at', 'coupon']
    search_fields = ['coupon__code', 'user__username']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    @display(description='تاریخ استفاده')
    def used_at_jalali(self, obj):
        return to_jalali(obj.used_at)


@admin.register(WelcomeClaim)
class WelcomeClaimAdmin(ModelAdmin):
    list_display = ['user', 'coupon', 'claimed_at_jalali']
    list_filter = ['claimed_at', 'coupon']
    search_fields = ['user__username', 'user__email', 'coupon__code']
    readonly_fields = ['user', 'coupon', 'claimed_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    @display(description='تاریخ دریافت')
    def claimed_at_jalali(self, obj):
        return to_jalali(obj.claimed_at)
