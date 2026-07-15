from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator


class Category(models.Model):
    name = models.CharField(max_length=100, verbose_name="نام دسته‌بندی")
    slug = models.SlugField(unique=True, verbose_name="نامک")
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        verbose_name="دسته‌بندی والد"
    )
    image = models.ImageField(
        upload_to='categories/',
        null=True,
        blank=True,
        verbose_name="تصویر"
    )
    description = models.TextField(blank=True, verbose_name="توضیحات")
    order = models.IntegerField(default=0, verbose_name="ترتیب نمایش")

    class Meta:
        verbose_name = 'دسته‌بندی'
        verbose_name_plural = 'دسته‌بندی‌ها'
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class Brand(models.Model):
    name = models.CharField(max_length=100, verbose_name="نام برند")
    slug = models.SlugField(unique=True, verbose_name="نامک")
    logo = models.ImageField(
        upload_to='brands/',
        null=True,
        blank=True,
        verbose_name="لوگو"
    )
    description = models.TextField(blank=True, verbose_name="توضیحات")

    class Meta:
        verbose_name = 'برند'
        verbose_name_plural = 'برندها'

    def __str__(self):
        return self.name


class Size(models.Model):
    name = models.CharField(max_length=10, verbose_name="نام سایز")
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name='sizes',
        verbose_name="دسته‌بندی"
    )

    class Meta:
        verbose_name = 'سایز'
        verbose_name_plural = 'سایزها'

    def __str__(self):
        return f"{self.category.name} - {self.name}"


class Color(models.Model):
    name = models.CharField(max_length=50, verbose_name="نام رنگ")
    hex_code = models.CharField(max_length=7, verbose_name="کد رنگ")

    class Meta:
        verbose_name = 'رنگ'
        verbose_name_plural = 'رنگ‌ها'

    def __str__(self):
        return self.name


class Fabric(models.Model):
    name = models.CharField(max_length=100, verbose_name="نام جنس")
    description = models.TextField(blank=True, verbose_name="توضیحات")

    class Meta:
        verbose_name = 'جنس پارچه'
        verbose_name_plural = 'جنس‌های پارچه'

    def __str__(self):
        return self.name


class Product(models.Model):
    CATEGORY_CHOICES = [
        ('men', 'مردانه'),
        ('women', 'زنانه'),
        ('kids', 'بچگانه'),
    ]

    name = models.CharField(max_length=200, verbose_name="نام محصول")
    slug = models.SlugField(unique=True, verbose_name="نامک")
    description = models.TextField(verbose_name="توضیحات")
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name='products',
        verbose_name="دسته‌بندی"
    )
    brand = models.ForeignKey(
        Brand,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="برند"
    )
    main_category = models.CharField(
        max_length=10,
        choices=CATEGORY_CHOICES,
        verbose_name="دسته‌بندی اصلی"
    )
    fabric = models.ForeignKey(
        Fabric,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="جنس پارچه"
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="قیمت"
    )
    compare_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="قیمت مقایسه‌ای"
    )
    cost_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="قیمت تمام‌شده"
    )
    sku = models.CharField(max_length=50, unique=True, verbose_name="کد محصول")
    stock = models.IntegerField(default=0, verbose_name="موجودی")
    is_active = models.BooleanField(default=True, verbose_name="فعال")
    is_featured = models.BooleanField(default=False, verbose_name="ویژه")
    is_new_arrival = models.BooleanField(default=False, verbose_name="جدید")
    is_trending = models.BooleanField(default=False, verbose_name="پرطرفدار")
    rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        verbose_name="امتیاز"
    )
    review_count = models.IntegerField(default=0, verbose_name="تعداد نظرات")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاریخ آخرین به‌روزرسانی")

    class Meta:
        verbose_name = 'محصول'
        verbose_name_plural = 'محصولات'
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    @property
    def discount_percentage(self):
        if self.compare_price:
            return int(((self.compare_price - self.price) / self.compare_price) * 100)
        return 0


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='images',
        verbose_name="محصول"
    )
    image = models.ImageField(upload_to='products/', verbose_name="تصویر")
    alt_text = models.CharField(max_length=200, blank=True, verbose_name="متن جایگزین")
    order = models.IntegerField(default=0, verbose_name="ترتیب")
    is_primary = models.BooleanField(default=False, verbose_name="تصویر اصلی")

    class Meta:
        verbose_name = 'تصویر محصول'
        verbose_name_plural = 'تصاویر محصول'
        ordering = ['order']

    def __str__(self):
        return f"{self.product.name} - تصویر {self.order}"


class ProductVariant(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='variants',
        verbose_name="محصول"
    )
    size = models.ForeignKey(Size, on_delete=models.CASCADE, verbose_name="سایز")
    color = models.ForeignKey(Color, on_delete=models.CASCADE, verbose_name="رنگ")
    stock = models.IntegerField(default=0, verbose_name="موجودی")
    price_adjustment = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="تعدیل قیمت"
    )
    sku = models.CharField(max_length=50, unique=True, verbose_name="کد محصول")

    class Meta:
        verbose_name = 'واریانت محصول'
        verbose_name_plural = 'واریانت‌های محصول'
        unique_together = ['product', 'size', 'color']

    def __str__(self):
        return f"{self.product.name} - {self.size.name} - {self.color.name}"


class Review(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='reviews',
        verbose_name="محصول"
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="کاربر")
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name="امتیاز"
    )
    title = models.CharField(max_length=200, verbose_name="عنوان")
    comment = models.TextField(verbose_name="نظر")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ثبت")
    is_verified_purchase = models.BooleanField(default=False, verbose_name="خرید تأیید شده")

    class Meta:
        verbose_name = 'نظر'
        verbose_name_plural = 'نظرات'
        unique_together = ['product', 'user']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.product.name} - {self.rating} ستاره"


class SizeGuide(models.Model):
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name='size_guides',
        verbose_name="دسته‌بندی"
    )
    size = models.ForeignKey(Size, on_delete=models.CASCADE, verbose_name="سایز")
    chest = models.CharField(max_length=20, blank=True, verbose_name="سینه")
    waist = models.CharField(max_length=20, blank=True, verbose_name="کمر")
    hips = models.CharField(max_length=20, blank=True, verbose_name="باسن")
    length = models.CharField(max_length=20, blank=True, verbose_name="قد")

    class Meta:
        verbose_name = 'راهنمای سایز'
        verbose_name_plural = 'راهنماهای سایز'

    def __str__(self):
        return f"{self.category.name} - {self.size.name}"