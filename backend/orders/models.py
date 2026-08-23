from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from products.models import Product

RESERVATION_MINUTES = 10


class ShippingAddress(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='shipping_addresses',
        null=True,
        blank=True,
        verbose_name="کاربر"
    )
    full_name = models.CharField(max_length=255, verbose_name="نام و نام خانوادگی")
    phone = models.CharField(max_length=20, verbose_name="شماره تماس")
    address_line1 = models.CharField(max_length=500, verbose_name="آدرس (خط اول)")
    address_line2 = models.CharField(
        max_length=500, blank=True, null=True, verbose_name="آدرس (خط دوم)"
    )
    city = models.CharField(max_length=100, verbose_name="شهر")
    state = models.CharField(max_length=100, verbose_name="استان")
    postal_code = models.CharField(max_length=20, verbose_name="کد پستی")
    country = models.CharField(max_length=100, default='Iran', verbose_name="کشور")
    is_default = models.BooleanField(default=False, verbose_name="آدرس پیش‌فرض")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاریخ آخرین ویرایش")

    class Meta:
        verbose_name = "آدرس ارسال"
        verbose_name_plural = "آدرس‌های ارسال"
        ordering = ['-is_default', '-created_at']

    def __str__(self):
        return f"{self.full_name} - {self.city}, {self.address_line1[:30]}"


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending_payment', 'در انتظار پرداخت'),
        ('pending', 'در انتظار بررسی'),
        ('processing', 'در حال پردازش'),
        ('shipped', 'ارسال شده'),
        ('delivered', 'تحویل داده شده'),
        ('cancelled', 'لغو شده'),
        ('expired', 'منقضی شده'),
        ('paid_inventory_issue', 'پرداخت شده — نیازمند بررسی موجودی'),
        ('returned', 'مرجوع شده'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('unpaid', 'پرداخت نشده'),
        ('paid', 'پرداخت شده'),
        ('refunded', 'بازپرداخت شده'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('online', 'پرداخت آنلاین'),
    ]

    order_number = models.CharField(
        max_length=50, unique=True, verbose_name="شماره سفارش"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='orders',
        null=True,
        blank=True,
        verbose_name="کاربر"
    )
    guest_email = models.EmailField(
        max_length=254,
        null=True,
        blank=True,
        verbose_name="ایمیل مهمان"
    )
    guest_phone = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        verbose_name="تلفن مهمان"
    )
    guest_session_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        db_index=True,
        verbose_name="شناسه نشست مهمان"
    )
    shipping_address = models.ForeignKey(
        ShippingAddress,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name="آدرس ارسال"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending_payment',
        verbose_name="وضعیت سفارش"
    )
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default='unpaid',
        verbose_name="وضعیت پرداخت"
    )
    payment_method = models.CharField(
        max_length=30,
        choices=PAYMENT_METHOD_CHOICES,
        default='online',
        verbose_name="روش پرداخت"
    )
    subtotal = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, verbose_name="جمع کل کالاها"
    )
    shipping_cost = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, verbose_name="هزینه ارسال"
    )
    tax = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, verbose_name="مالیات"
    )
    discount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, verbose_name="تخفیف"
    )
    total = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, verbose_name="مبلغ قابل پرداخت"
    )
    notes = models.TextField(blank=True, null=True, verbose_name="یادداشت")
    tracking_number = models.CharField(
        max_length=100, blank=True, null=True, verbose_name="شماره پیگیری پرداخت"
    )
    postal_tracking_code = models.CharField(
        max_length=100, blank=True, null=True, verbose_name="کد رهگیری پستی"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ثبت سفارش")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاریخ آخرین به‌روزرسانی")
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name="زمان انقضای رزرو")
    inventory_reserved_at = models.DateTimeField(null=True, blank=True, editable=False)
    inventory_released_at = models.DateTimeField(null=True, blank=True, editable=False)
    coupon = models.ForeignKey(
        'orders.Coupon',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders',
        verbose_name="کوپن استفاده‌شده"
    )

    class Meta:
        verbose_name = "سفارش"
        verbose_name_plural = "سفارش‌ها"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at'], name='order_status_created_idx'),
            models.Index(
                fields=['payment_status', '-created_at'],
                name='order_payment_created_idx',
            ),
        ]

    def __str__(self):
        customer = self.user.username if self.user_id else (self.guest_email or 'مهمان')
        return f"سفارش {self.order_number} - {customer}"

    def save(self, *args, **kwargs):
        if not self.order_number:
            import uuid
            self.order_number = f"ORD-{uuid.uuid4().hex[:8].upper()}"
        if self.total == 0 and (self.subtotal or self.shipping_cost or self.tax or self.discount):
            self.total = self.subtotal + self.shipping_cost + self.tax - self.discount
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        if not self.expires_at:
            return False
        return timezone.now() > self.expires_at

    @property
    def reservation_remaining_seconds(self):
        """Seconds remaining until reservation expires. 0 if expired or no timer."""
        if not self.expires_at or self.status != 'pending_payment':
            return 0
        delta = self.expires_at - timezone.now()
        seconds = int(delta.total_seconds())
        return max(seconds, 0)

    @property
    def can_pay(self):
        """Whether the customer can still initiate/continue payment."""
        return (
            self.status == 'pending_payment'
            and self.payment_status == 'unpaid'
            and not self.is_expired
        )


class OrderItem(models.Model):
    INVENTORY_SOURCE_PRODUCT = 'PRODUCT'
    INVENTORY_SOURCE_VARIANT = 'VARIANT'
    INVENTORY_SOURCE_LEGACY_UNKNOWN = 'LEGACY_UNKNOWN'
    INVENTORY_SOURCE_CHOICES = [
        (INVENTORY_SOURCE_PRODUCT, 'Product inventory'),
        (INVENTORY_SOURCE_VARIANT, 'Variant inventory'),
        (INVENTORY_SOURCE_LEGACY_UNKNOWN, 'Legacy source unresolved'),
    ]

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name="سفارش"
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    variant = models.ForeignKey(
        'products.ProductVariant',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="واریانت"
    )
    # Nullable for historical rows whose original inventory bucket cannot be
    # reconstructed safely. New reservations always persist both fields.
    inventory_source = models.CharField(
        max_length=14,
        choices=INVENTORY_SOURCE_CHOICES,
        null=True,
        blank=True,
        editable=False,
    )
    inventory_reserved_quantity = models.PositiveIntegerField(
        null=True,
        blank=True,
        editable=False,
    )
    quantity = models.PositiveIntegerField(default=1, verbose_name="تعداد")
    price = models.DecimalField(
        max_digits=10, decimal_places=2, verbose_name="قیمت واحد"
    )

    class Meta:
        verbose_name = "آیتم سفارش"
        verbose_name_plural = "آیتم‌های سفارش"

    def __str__(self):
        product_name = self.product.name if self.product else "محصول حذف شده"
        return f"{product_name} × {self.quantity}"

    @property
    def total_price(self):
        return self.price * self.quantity


class LegacyInventoryReconciliation(models.Model):
    """Immutable operator decision for a legacy reservation source."""

    DECISION_PRODUCT = OrderItem.INVENTORY_SOURCE_PRODUCT
    DECISION_VARIANT = OrderItem.INVENTORY_SOURCE_VARIANT
    DECISION_UNKNOWN = OrderItem.INVENTORY_SOURCE_LEGACY_UNKNOWN
    DECISION_CHOICES = [
        (DECISION_PRODUCT, 'PRODUCT'),
        (DECISION_VARIANT, 'VARIANT'),
        (DECISION_UNKNOWN, 'UNKNOWN / remain unresolved'),
    ]

    order_item = models.ForeignKey(
        OrderItem, on_delete=models.PROTECT, related_name='legacy_reconciliations',
    )
    decision = models.CharField(max_length=14, choices=DECISION_CHOICES)
    operator = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name='legacy_inventory_reconciliations',
    )
    reason = models.TextField()
    evidence_reference = models.CharField(max_length=300)
    order_id_snapshot = models.PositiveBigIntegerField()
    product_id_snapshot = models.PositiveBigIntegerField(null=True, blank=True)
    variant_id_snapshot = models.PositiveBigIntegerField(null=True, blank=True)
    quantity_snapshot = models.PositiveIntegerField()
    reservation_started_at_snapshot = models.DateTimeField(null=True, blank=True)
    reservation_released_at_snapshot = models.DateTimeField(null=True, blank=True)
    order_status_snapshot = models.CharField(max_length=20)
    payment_status_snapshot = models.CharField(max_length=20)
    reconciled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-reconciled_at', '-id']
        indexes = [
            models.Index(fields=['order_item', '-reconciled_at'], name='legacy_recon_item_created_idx'),
            models.Index(fields=['decision', '-reconciled_at'], name='legacy_recon_decision_idx'),
        ]

    def __str__(self):
        return f'{self.order_item_id}: {self.decision} by {self.operator}'


class Coupon(models.Model):
    DISCOUNT_TYPE_CHOICES = [
        ('percentage', 'درصدی'),
        ('fixed', 'مبلغ ثابت'),
    ]

    code = models.CharField(max_length=50, unique=True, verbose_name="کد تخفیف", db_index=True)
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES, verbose_name="نوع تخفیف")
    value = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="مقدار تخفیف")
    min_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="حداقل مبلغ سفارش")
    max_uses = models.PositiveIntegerField(null=True, blank=True, verbose_name="حداکثر تعداد استفاده")
    used_count = models.PositiveIntegerField(default=0, verbose_name="تعداد استفاده شده")
    is_active = models.BooleanField(default=True, verbose_name="فعال")
    is_welcome_offer = models.BooleanField(default=False, verbose_name="هدیه خوش‌آمدگویی")
    valid_from = models.DateTimeField(default=timezone.now, verbose_name="اعتبار از")
    valid_until = models.DateTimeField(verbose_name="اعتبار تا")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")

    class Meta:
        verbose_name = "کوپن تخفیف"
        verbose_name_plural = "کوپن‌های تخفیف"
        ordering = ['-created_at']

    def __str__(self):
        return self.code

    def is_valid(self, user=None, subtotal=None, guest_email=None):
        if not self.is_active:
            return False, "کوپن غیرفعال است"
        now = timezone.now()
        if now < self.valid_from:
            return False, "کوپن هنوز فعال نشده است"
        if now > self.valid_until:
            return False, "کوپن منقضی شده است"
        if self.max_uses is not None and self.used_count >= self.max_uses:
            return False, "تعداد استفاده از این کوپن به حداکثر رسیده است"
        if self.is_welcome_offer:
            if not user or not getattr(user, 'is_authenticated', False):
                return False, "این کد تخفیف فقط برای کاربران واجد شرایط است"
            if not WelcomeClaim.objects.filter(user=user, coupon=self).exists():
                return False, "ابتدا هدیه خوش‌آمدگویی را دریافت کنید"
        if user and CouponUsage.objects.filter(coupon=self, user=user).exists():
            return False, "شما قبلاً از این کوپن استفاده کرده‌اید"
        if not user and guest_email:
            # Guest reuse: same email cannot reuse same coupon (even with different session).
            # Prevents trivial bypass of "once per user" via guest checkout.
            if Order.objects.filter(
                guest_email=guest_email, coupon=self
            ).exclude(status__in=['cancelled', 'expired', 'returned']).exists():
                return False, "این کوپن قبلاً با این ایمیل استفاده شده است"
        if subtotal is not None and self.min_amount is not None and subtotal < self.min_amount:
            return False, f"حداقل مبلغ سفارش برای این کوپن {self.min_amount:,} تومان است"
        return True, ""

    def apply_discount(self, subtotal):
        if self.discount_type == 'percentage':
            amount = (subtotal * self.value) / Decimal('100')
            if self.value > 100:
                amount = subtotal
            return min(amount, subtotal)
        return min(self.value, subtotal)


class CouponUsage(models.Model):
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name='usages', verbose_name="کوپن")
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="کاربر")
    used_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ استفاده")
    order = models.ForeignKey('Order', on_delete=models.SET_NULL, null=True, blank=True, related_name='coupon_usages', verbose_name="سفارش")

    class Meta:
        verbose_name = "استفاده از کوپن"
        verbose_name_plural = "استفاده‌های کوپن"
        unique_together = ['coupon', 'user']
        ordering = ['-used_at']

    def __str__(self):
        return f"{self.coupon.code} - {self.user.username}"


class WelcomeClaim(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='welcome_claims', verbose_name="کاربر")
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name='welcome_claims', verbose_name="کوپن")
    claimed_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ دریافت")

    class Meta:
        verbose_name = "دریافت هدیه خوش‌آمدگویی"
        verbose_name_plural = "دریافت‌های هدیه خوش‌آمدگویی"
        unique_together = ['user', 'coupon']
        ordering = ['-claimed_at']

    def __str__(self):
        return f"{self.user.username} ← {self.coupon.code}"
