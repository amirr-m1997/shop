from django.db import models
from django.db.models import F, ExpressionWrapper, DecimalField, Sum, IntegerField, Value, Q
from django.db.models.functions import Coalesce
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator


class Category(models.Model):
    name = models.CharField(max_length=100, verbose_name="نام دسته‌بندی")
    slug = models.SlugField(unique=True, allow_unicode=True, verbose_name="نامک")
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
    slug = models.SlugField(unique=True, allow_unicode=True, verbose_name="نامک")
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
        ('مردانه', 'مردانه'),
        ('زنانه', 'زنانه'),
        ('بچگانه', 'بچگانه'),
        ('اکسسوری', 'اکسسوری'),
    ]

    name = models.CharField(max_length=200, verbose_name="نام محصول")
    slug = models.SlugField(unique=True, allow_unicode=True, verbose_name="نامک")
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
        max_length=25,
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
        verbose_name="قیمت فروش (تومان)"
    )
    compare_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="قیمت اصلی قبل از تخفیف (تومان)"
    )
    cost_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="قیمت تمام‌شده (تومان)"
    )
    sku = models.CharField(max_length=50, default='', blank=True, verbose_name="کد محصول (اختیاری)")
    stock = models.IntegerField(default=0, verbose_name="موجودی کل")
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
        if self.compare_price and self.compare_price > self.price:
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
    stock = models.IntegerField(default=0, verbose_name="موجودی واریانت (خالی = از محصول ارث‌بری)")
    price_adjustment = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="تعدیل قیمت (تومان)"
    )
    sku = models.CharField(max_length=50, default='', blank=True, verbose_name="کد واریانت (خالی = خودکار)")


    class Meta:
        verbose_name = 'واریانت محصول'
        verbose_name_plural = 'واریانت‌های محصول'
        unique_together = ['product', 'size', 'color']

    def __str__(self):
        return f"{self.product.name} - {self.size.name} - {self.color.name}"

    def save(self, *args, **kwargs):
        if not self.sku:
            base = self.product.sku or f"P{self.product.id}"
            self.sku = f"{base}-{self.size.name}-{self.color.name}"
        super().save(*args, **kwargs)

    @property
    def effective_stock(self):
        if self.stock > 0:
            return self.stock
        return self.product.stock

    @property
    def effective_price(self):
        return self.product.price + self.price_adjustment


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
    GENDER_CHOICES = [
        ('مردانه', 'مردانه'),
        ('زنانه', 'زنانه'),
        ('بچگانه', 'بچگانه'),
        ('unisex', 'یونیسکس'),
    ]

    PRODUCT_TYPE_CHOICES = [
        ('clothing', 'لباس'),
        ('shoes', 'کفش'),
        ('underwear', 'لباس زیر'),
        ('accessories', 'اکسسواری'),
    ]

    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name='size_guides',
        verbose_name="دسته‌بندی"
    )
    size = models.ForeignKey(Size, on_delete=models.CASCADE, verbose_name="سایز")
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default='unisex', verbose_name="جنسیت")
    product_type = models.CharField(max_length=15, choices=PRODUCT_TYPE_CHOICES, default='clothing', verbose_name="نوع محصول")
    chest = models.CharField(max_length=20, blank=True, verbose_name="سینه")
    waist = models.CharField(max_length=20, blank=True, verbose_name="کمر")
    hips = models.CharField(max_length=20, blank=True, verbose_name="باسن")
    length = models.CharField(max_length=20, blank=True, verbose_name="قد")
    shoulder = models.CharField(max_length=20, blank=True, verbose_name="شانه")
    sleeve = models.CharField(max_length=20, blank=True, verbose_name="آستین")
    foot_length = models.CharField(max_length=20, blank=True, verbose_name="طول پا")
    inseam = models.CharField(max_length=20, blank=True, verbose_name="فاق")
    height_min = models.PositiveIntegerField(null=True, blank=True, verbose_name="حداقل قد (سانتی‌متر)")
    height_max = models.PositiveIntegerField(null=True, blank=True, verbose_name="حداکثر قد (سانتی‌متر)")
    weight_min = models.PositiveIntegerField(null=True, blank=True, verbose_name="حداقل وزن (کیلوگرم)")
    weight_max = models.PositiveIntegerField(null=True, blank=True, verbose_name="حداکثر وزن (کیلوگرم)")
    measurement_guide = models.TextField(blank=True, verbose_name="راهنمای اندازه‌گیری")

    class Meta:
        verbose_name = 'راهنمای سایز'
        verbose_name_plural = 'راهنماهای سایز'
        ordering = ['category', 'size']

    def __str__(self):
        return f"{self.category.name} - {self.size.name}"


class HomepageSection(models.Model):
    FILTER_TYPE_CHOICES = [
        ('discount', 'بیشترین تخفیف'),
        ('new', 'جدیدترین‌ها'),
        ('trending', 'محبوب‌ترین‌ها'),
        ('bestseller', 'پرفروش‌ترین‌ها'),
        ('featured', 'ویژه'),
        ('category', 'دسته‌بندی'),
        ('brand', 'برند'),
        ('name', 'جستجوی نام'),
    ]

    title = models.CharField(max_length=100, verbose_name="عنوان")
    filter_type = models.CharField(max_length=20, choices=FILTER_TYPE_CHOICES, verbose_name="نوع فیلتر")
    filter_value = models.CharField(
        max_length=200, blank=True, verbose_name="مقدار فیلتر",
        help_text="برای دسته‌بندی: slug دسته‌ها با کاما (مثلاً men,women). برای برند: slug برند. برای تخفیف/جدید/محبوب: خالی"
    )
    order = models.PositiveIntegerField(default=0, verbose_name="ترتیب نمایش")
    is_active = models.BooleanField(default=True, verbose_name="فعال")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "بخش صفحه اصلی"
        verbose_name_plural = "بخش‌های صفحه اصلی"
        ordering = ['order']

    def __str__(self):
        return f"{self.title} ({self.get_filter_type_display()})"

    def get_products(self):
        qs = Product.objects.filter(is_active=True)

        if self.filter_type == 'discount':
            qs = qs.filter(compare_price__isnull=False).annotate(
                discount_pct=ExpressionWrapper(
                    (F('compare_price') - F('price')) / F('compare_price') * 100,
                    output_field=DecimalField(max_digits=5, decimal_places=1)
                )
            ).order_by('-discount_pct')
        elif self.filter_type == 'new':
            qs = qs.order_by('-created_at')
        elif self.filter_type == 'trending':
            qs = qs.filter(is_trending=True).order_by('-rating')
        elif self.filter_type == 'bestseller':
            # Sort by total sold quantity from order items; fallback to rating
            qs = qs.annotate(
                sold_count=Coalesce(
                    Sum('orderitem__quantity'),
                    Value(0),
                    output_field=IntegerField(),
                )
            ).order_by('-sold_count', '-rating', '-created_at')
        elif self.filter_type == 'featured':
            qs = qs.filter(is_featured=True).order_by('-created_at')
        elif self.filter_type == 'category' and self.filter_value:
            categories = [c.strip() for c in self.filter_value.split(',') if c.strip()]
            if len(categories) == 1:
                qs = qs.filter(main_category=categories[0])
            elif len(categories) > 1:
                qs = qs.filter(main_category__in=categories)
            qs = qs.order_by('-created_at')
        elif self.filter_type == 'brand' and self.filter_value:
            brands = [b.strip() for b in self.filter_value.split(',') if b.strip()]
            if len(brands) == 1:
                qs = qs.filter(brand__slug=brands[0])
            elif len(brands) > 1:
                qs = qs.filter(brand__slug__in=brands)
            qs = qs.order_by('-created_at')
        elif self.filter_type == 'name' and self.filter_value:
            names = [n.strip() for n in self.filter_value.split(',') if n.strip()]
            q = Q()
            for name in names:
                q |= Q(name__icontains=name) | Q(description__icontains=name)
            qs = qs.filter(q).order_by('-created_at')
        else:
            qs = qs.order_by('-created_at')

        return qs[:15]


class Banner(models.Model):
    """بنر اسلایدر صفحه اصلی"""
    title = models.CharField(max_length=200, verbose_name="عنوان")
    subtitle = models.CharField(max_length=300, blank=True, verbose_name="زیرعنوان")
    image = models.ImageField(upload_to='banners/', null=True, blank=True, verbose_name="تصویر")
    image_url = models.URLField(blank=True, verbose_name="آدرس تصویر (جایگزین)")
    link = models.CharField(max_length=300, blank=True, default='/products', verbose_name="لینک")
    button_text = models.CharField(max_length=100, blank=True, default='خرید کنید', verbose_name="متن دکمه")
    order = models.PositiveIntegerField(default=0, verbose_name="ترتیب نمایش")
    is_active = models.BooleanField(default=True, verbose_name="فعال")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "بنر"
        verbose_name_plural = "بنرها"
        ordering = ['order', '-created_at']

    def __str__(self):
        return self.title

    @property
    def display_image(self):
        if self.image:
            return self.image.url
        return self.image_url or ''


class StyleLook(models.Model):
    """استایل‌های روز / لوک‌بوک صفحه اصلی"""
    title = models.CharField(max_length=150, verbose_name="عنوان")
    slug = models.SlugField(max_length=150, unique=True, blank=True, verbose_name="اسلاگ")
    description = models.CharField(max_length=300, blank=True, verbose_name="توضیح کوتاه")
    image = models.ImageField(upload_to='styles/', null=True, blank=True, verbose_name="تصویر")
    image_url = models.URLField(blank=True, verbose_name="آدرس تصویر (جایگزین)")
    link = models.CharField(max_length=300, blank=True, default='/products', verbose_name="لینک")
    order = models.PositiveIntegerField(default=0, verbose_name="ترتیب نمایش")
    is_active = models.BooleanField(default=True, verbose_name="فعال")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "استایل روز"
        verbose_name_plural = "استایل‌های روز"
        ordering = ['order', '-created_at']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            import uuid
            self.slug = f"style-{uuid.uuid4().hex[:8]}"
        super().save(*args, **kwargs)

    @property
    def display_image(self):
        if self.image:
            return self.image.url
        return self.image_url or ''


class Wishlist(models.Model):
    """علاقه‌مندی‌های کاربر"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='wishlist',
        verbose_name="کاربر"
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='wishlisted_by',
        verbose_name="محصول"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ افزودن")

    class Meta:
        verbose_name = 'علاقه‌مندی'
        verbose_name_plural = 'علاقه‌مندی‌ها'
        unique_together = ['user', 'product']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.product.name}"