from django.db import models
from django.contrib.auth.models import User
from products.models import Product


class ShippingAddress(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='shipping_addresses',
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
        ('pending', 'در انتظار بررسی'),
        ('processing', 'در حال پردازش'),
        ('shipped', 'ارسال شده'),
        ('delivered', 'تحویل داده شده'),
        ('cancelled', 'لغو شده'),
        ('returned', 'مرجوع شده'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('unpaid', 'پرداخت نشده'),
        ('paid', 'پرداخت شده'),
        ('refunded', 'بازپرداخت شده'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('online', 'پرداخت آنلاین'),
        ('cash_on_delivery', 'پرداخت در محل'),
        ('card', 'کارت به کارت'),
    ]

    order_number = models.CharField(
        max_length=50, unique=True, verbose_name="شماره سفارش"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='orders',
        verbose_name="کاربر"
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
        default='pending',
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
        max_length=100, blank=True, null=True, verbose_name="شماره پیگیری"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ثبت سفارش")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاریخ آخرین به‌روزرسانی")

    class Meta:
        verbose_name = "سفارش"
        verbose_name_plural = "سفارش‌ها"
        ordering = ['-created_at']

    def __str__(self):
        return f"سفارش {self.order_number} - {self.user.username}"

    def save(self, *args, **kwargs):
        if not self.order_number:
            import uuid
            self.order_number = f"ORD-{uuid.uuid4().hex[:8].upper()}"
        if not self.total:
            self.total = self.subtotal + self.shipping_cost + self.tax - self.discount
        super().save(*args, **kwargs)


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name="سفارش"
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.CASCADE,
        null=True,  # این را اضافه کنید
        blank=True  # این را هم اضافه کنید
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