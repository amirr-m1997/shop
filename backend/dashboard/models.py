from django.db import models
from django.contrib.auth.models import User


class Notification(models.Model):
    TYPE_CHOICES = [
        ('order', 'سفارش جدید'),
        ('low_stock', 'موجودی کم'),
        ('review', 'نظر جدید'),
        ('contact', 'پیام جدید'),
        ('system', 'سیستم'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='admin_notifications', verbose_name="admin")
    title = models.CharField(max_length=200, verbose_name="عنوان")
    message = models.TextField(verbose_name="پیام")
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='system', verbose_name="نوع")
    link = models.CharField(max_length=300, blank=True, verbose_name="لینک")
    is_read = models.BooleanField(default=False, verbose_name="خوانده شده")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")

    class Meta:
        verbose_name = "نوتیفیکیشن"
        verbose_name_plural = "نوتیفیکیشن‌ها"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.user.username}"


class ActivityLog(models.Model):
    ACTION_CHOICES = [
        ('create', 'ایجاد'),
        ('update', 'بروزرسانی'),
        ('delete', 'حذف'),
        ('status_change', 'تغییر وضعیت'),
        ('login', 'ورود'),
        ('export', 'خروجی'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="کاربر")
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, verbose_name="عملیات")
    model_name = models.CharField(max_length=50, verbose_name="مدل")
    object_id = models.CharField(max_length=50, blank=True, verbose_name="شناسه")
    description = models.TextField(verbose_name="توضیحات")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ")

    class Meta:
        verbose_name = "لاگ فعالیت"
        verbose_name_plural = "لاگ‌های فعالیت"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user} - {self.action} - {self.model_name}"


class TodoItem(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'کم'),
        ('medium', 'متوسط'),
        ('high', 'زیاد'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='todos', verbose_name="کاربر")
    title = models.CharField(max_length=300, verbose_name="عنوان")
    description = models.TextField(blank=True, verbose_name="توضیحات")
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium', verbose_name="اولویت")
    is_done = models.BooleanField(default=False, verbose_name="انجام شده")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    due_date = models.DateField(null=True, blank=True, verbose_name="مهلت")

    class Meta:
        verbose_name = "وظیفه"
        verbose_name_plural = "وظایف"
        ordering = ['is_done', '-priority', '-created_at']

    def __str__(self):
        return self.title


class AdminNote(models.Model):
    TARGET_CHOICES = [
        ('order', 'سفارش'),
        ('product', 'محصول'),
        ('customer', 'مشتری'),
        ('general', 'عمومی'),
    ]

    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='admin_notes', verbose_name="نویسنده")
    content = models.TextField(verbose_name="محتوا")
    target_type = models.CharField(max_length=20, choices=TARGET_CHOICES, default='general', verbose_name="نوع هدف")
    target_id = models.PositiveIntegerField(null=True, blank=True, verbose_name="شناسه هدف")
    is_pinned = models.BooleanField(default=False, verbose_name="سنجاق شده")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاریخ بروزرسانی")

    class Meta:
        verbose_name = "یادداشت ادمین"
        verbose_name_plural = "یادداشت‌های ادمین"
        ordering = ['-is_pinned', '-created_at']

    def __str__(self):
        return f"{self.content[:50]} - {self.author.username}"


class AdminRole(models.Model):
    name = models.CharField(max_length=50, unique=True, verbose_name="نام نقش")
    slug = models.SlugField(unique=True, verbose_name="اسلاگ")
    description = models.TextField(blank=True, verbose_name="توضیحات")
    is_default = models.BooleanField(default=False, verbose_name="پیش‌فرض")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")

    class Meta:
        verbose_name = "نقش ادمین"
        verbose_name_plural = "نقش‌های ادمین"
        ordering = ['name']

    def __str__(self):
        return self.name


class AdminPermission(models.Model):
    CATEGORY_CHOICES = [
        ('products', 'محصولات'),
        ('orders', 'سفارشات'),
        ('customers', 'مشتریان'),
        ('reports', 'گزارشات'),
        ('settings', 'تنظیمات'),
        ('users', 'کاربران'),
    ]

    name = models.CharField(max_length=100, verbose_name="نام مجوز")
    slug = models.SlugField(unique=True, verbose_name="اسلاگ")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, verbose_name="دسته‌بندی")
    description = models.TextField(blank=True, verbose_name="توضیحات")

    class Meta:
        verbose_name = "مجوز ادمین"
        verbose_name_plural = "مجوزهای ادمین"
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.get_category_display()} - {self.name}"


class AdminRolePermission(models.Model):
    role = models.ForeignKey(AdminRole, on_delete=models.CASCADE, related_name='role_permissions', verbose_name="نقش")
    permission = models.ForeignKey(AdminPermission, on_delete=models.CASCADE, related_name='role_permissions', verbose_name="مجوز")

    class Meta:
        verbose_name = "مجوز نقش"
        verbose_name_plural = "مجوزهای نقش"
        unique_together = ['role', 'permission']

    def __str__(self):
        return f"{self.role} - {self.permission}"
