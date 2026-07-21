from django.db import models
from django.contrib.auth.models import User


class Testimonial(models.Model):
    RATING_CHOICES = [(i, str(i)) for i in range(1, 6)]

    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        verbose_name="کاربر"
    )
    name = models.CharField(max_length=100, verbose_name="نام")
    role = models.CharField(max_length=100, blank=True, default="خریدار", verbose_name="سمت")
    text = models.TextField(verbose_name="متن نظر")
    rating = models.PositiveSmallIntegerField(
        choices=RATING_CHOICES, default=5,
        verbose_name="امتیاز"
    )
    is_approved = models.BooleanField(default=False, verbose_name="تایید شده")
    is_featured = models.BooleanField(default=False, verbose_name="نمایش در صفحه اصلی")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")

    class Meta:
        verbose_name = "نظر مشتری"
        verbose_name_plural = "نظرات مشتریان"
        ordering = ['-is_approved', '-created_at']

    def __str__(self):
        return f"{self.name} - {self.rating} ستاره"


class FAQ(models.Model):
    question = models.CharField(max_length=300, verbose_name="سوال")
    answer = models.TextField(verbose_name="پاسخ")
    order = models.PositiveIntegerField(default=0, verbose_name="ترتیب")
    is_active = models.BooleanField(default=True, verbose_name="فعال")

    class Meta:
        verbose_name = "سوال متداول"
        verbose_name_plural = "سوالات متداول"
        ordering = ['order']

    def __str__(self):
        return self.question


class ContactInfo(models.Model):
    site_name = models.CharField(max_length=200, default='فروشگاه مد', verbose_name="نام سایت")
    site_description = models.TextField(blank=True, default='مقصد شما برای کشف جدیدترین مد‌ها و استایل‌های روز دنیا.', verbose_name="توضیحات سایت")
    phone1 = models.CharField(max_length=20, verbose_name="تلفن ۱")
    phone2 = models.CharField(max_length=20, blank=True, verbose_name="تلفن ۲")
    email1 = models.EmailField(verbose_name="ایمیل ۱")
    email2 = models.EmailField(blank=True, verbose_name="ایمیل ۲")
    address = models.TextField(verbose_name="آدرس")
    working_hours = models.CharField(max_length=200, verbose_name="ساعات کاری")
    working_hours_closed = models.CharField(max_length=100, blank=True, verbose_name="روزهای تعطیل")
    instagram_url = models.URLField(blank=True, default='#', verbose_name="لینک اینستاگرام")
    telegram_url = models.URLField(blank=True, default='#', verbose_name="لینک تلگرام")
    twitter_url = models.URLField(blank=True, default='#', verbose_name="لینک توییتر")

    class Meta:
        verbose_name = "اطلاعات تماس"
        verbose_name_plural = "اطلاعات تماس"

    def __str__(self):
        return "اطلاعات تماس"


class ContactMessage(models.Model):
    name = models.CharField(max_length=100, verbose_name="نام")
    email = models.EmailField(verbose_name="ایمیل")
    message = models.TextField(verbose_name="پیام")
    is_read = models.BooleanField(default=False, verbose_name="خوانده شده")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")

    class Meta:
        verbose_name = "پیام تماس"
        verbose_name_plural = "پیام‌های تماس"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.email}"


class LookbookItem(models.Model):
    title = models.CharField(max_length=200, verbose_name="عنوان")
    description = models.TextField(verbose_name="توضیحات")
    image = models.ImageField(upload_to='lookbook/', null=True, blank=True, verbose_name="تصویر")
    image_url = models.URLField(blank=True, verbose_name="آدرس تصویر (جایگزین)")
    order = models.PositiveIntegerField(default=0, verbose_name="ترتیب")
    is_active = models.BooleanField(default=True, verbose_name="فعال")

    class Meta:
        verbose_name = "آیتم کتاب استایل"
        verbose_name_plural = "آیتم‌های کتاب استایل"
        ordering = ['order']

    def __str__(self):
        return self.title

    @property
    def display_image(self):
        if self.image:
            return self.image.url
        return self.image_url or ''


class SiteSettings(models.Model):
    hero_title = models.CharField(max_length=200, default="استایل خود را کشف کنید", verbose_name="عنوان اصلی")
    hero_subtitle = models.CharField(max_length=400, default="مد و فشن با کیفیت برای مردان، زنان و کودکان", verbose_name="زیرعنوان")
    hero_image = models.URLField(blank=True, verbose_name="تصویر هدر")
    about_title = models.CharField(max_length=200, default="درباره ما", verbose_name="عنوان درباره ما")
    about_content = models.TextField(blank=True, verbose_name="محتوای درباره ما")
    about_image = models.URLField(blank=True, verbose_name="تصویر درباره ما")
    shipping_title = models.CharField(max_length=200, default="ارسال و تحویل", verbose_name="عنوان ارسال")
    shipping_content = models.TextField(blank=True, verbose_name="محتوای ارسال")
    returns_title = models.CharField(max_length=200, default="بازگشت کالا", verbose_name="عنوان بازگشت")
    returns_content = models.TextField(blank=True, verbose_name="محتوای بازگشت")

    # هزینه ارسال — از ادمین قابل تغییر (منبع حقیقت برای سبد/تسویه/سفارش)
    free_shipping_threshold = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        default=500000,
        verbose_name="آستانه ارسال رایگان (تومان)",
        help_text="سفارش‌های بالاتر یا مساوی این مبلغ، ارسال رایگان می‌گیرند. مثال: ۵۰۰۰۰۰",
    )
    shipping_cost = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        default=45000,
        verbose_name="هزینه ارسال (تومان)",
        help_text="هزینه ارسال وقتی سفارش به آستانه ارسال رایگان نرسیده باشد.",
    )

    class Meta:
        verbose_name = "تنظیمات سایت"
        verbose_name_plural = "تنظیمات سایت"

    def __str__(self):
        return "تنظیمات سایت"

    def save(self, *args, **kwargs):
        # Only allow one instance
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def calculate_shipping(self, subtotal):
        """هزینه ارسال بر اساس جمع سفارش."""
        from decimal import Decimal
        subtotal = Decimal(str(subtotal or 0))
        if subtotal >= self.free_shipping_threshold:
            return Decimal('0')
        return Decimal(self.shipping_cost)


class SiteFeature(models.Model):
    ICON_CHOICES = [
        ('Truck', 'ارسال'),
        ('Shield', 'ضمانت'),
        ('RotateCcw', 'بازگشت'),
        ('Headphones', 'پشتیبانی'),
        ('Star', 'ستاره'),
        ('Heart', 'علاقه'),
        ('Clock', 'زمان'),
        ('CheckCircle', 'تایید'),
    ]

    title = models.CharField(max_length=100, verbose_name="عنوان")
    description = models.CharField(max_length=300, verbose_name="توضیحات")
    icon = models.CharField(max_length=50, choices=ICON_CHOICES, default='Truck', verbose_name="آیکون")
    color = models.CharField(max_length=50, default='text-blue-500', verbose_name="رنگ آیکون")
    bg_color = models.CharField(max_length=50, default='bg-blue-500/10', verbose_name="رنگ پس‌زمینه")
    order = models.PositiveIntegerField(default=0, verbose_name="ترتیب نمایش")
    is_active = models.BooleanField(default=True, verbose_name="فعال")

    class Meta:
        verbose_name = "ویژگی سایت"
        verbose_name_plural = "ویژگی‌های سایت"
        ordering = ['order']

    def __str__(self):
        return self.title
