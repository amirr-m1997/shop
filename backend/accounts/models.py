import secrets
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('user', 'کاربر عادی'),
        ('moderator', 'ناظر'),
        ('admin', 'مدیر'),
        ('super_admin', 'مدیر اصلی'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    first_name = models.CharField(max_length=100, blank=True, verbose_name="نام")
    last_name = models.CharField(max_length=100, blank=True, verbose_name="نام خانوادگی")
    phone = models.CharField(max_length=20, blank=True, verbose_name="شماره تلفن")
    date_of_birth = models.DateField(null=True, blank=True, verbose_name="تاریخ تولد")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user', verbose_name="نقش")
    phone_verified = models.BooleanField(default=False, verbose_name="تلفن تأیید شده")
    email_verified = models.BooleanField(default=False, verbose_name="ایمیل تأیید شده")
    verification_code = models.CharField(max_length=6, blank=True, verbose_name="کد تأیید")
    code_generated_at = models.DateTimeField(null=True, blank=True, verbose_name="زمان تولید کد تأیید")
    reset_token = models.CharField(max_length=100, blank=True, default='', verbose_name="توکن بازیابی رمز")
    reset_token_created_at = models.DateTimeField(null=True, blank=True, verbose_name="زمان تولید توکن بازیابی")
    verification_type = models.CharField(
        max_length=10,
        choices=[('phone', 'تلفن'), ('email', 'ایمیل')],
        blank=True,
        verbose_name="نوع تأیید"
    )
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True, verbose_name="تصویر پروفایل")
    style_preferences = models.JSONField(default=list, blank=True, verbose_name="ترجیحات سبک پوشاک")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_admin_user(self):
        return self.role in ('admin', 'super_admin')

    @property
    def is_super_admin(self):
        return self.role == 'super_admin'

    @property
    def is_moderator(self):
        return self.role == 'moderator'

    class Meta:
        verbose_name = "پروفایل کاربر"
        verbose_name_plural = "پروفایل‌های کاربران"

    def __str__(self):
        return f"پروفایل {self.user.username}"

    def generate_verification_code(self, verify_type='phone'):
        code = str(100000 + secrets.randbelow(900000))
        self.verification_code = code
        self.verification_type = verify_type
        self.code_generated_at = timezone.now()
        self.save()
        return code

    @property
    def verification_code_expired(self):
        """True when the OTP is older than OTP_CODE_TTL_SECONDS."""
        from accounts.security import OTP_CODE_TTL_SECONDS
        if not self.verification_code or not self.code_generated_at:
            return True
        age = (timezone.now() - self.code_generated_at).total_seconds()
        return age > OTP_CODE_TTL_SECONDS

    @property
    def reset_token_expired(self):
        """True when the reset token is older than RESET_TOKEN_TTL_SECONDS."""
        from accounts.security import RESET_TOKEN_TTL_SECONDS
        if not self.reset_token:
            return True
        if not self.reset_token_created_at:
            # Legacy tokens without a timestamp are rejected.
            return True
        age = (timezone.now() - self.reset_token_created_at).total_seconds()
        return age > RESET_TOKEN_TTL_SECONDS


class LoginHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_history', verbose_name="کاربر")
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="آدرس IP")
    user_agent = models.TextField(blank=True, default='', verbose_name="مرورگر")
    login_time = models.DateTimeField(auto_now_add=True, verbose_name="زمان ورود")

    class Meta:
        verbose_name = "تاریخچه ورود"
        verbose_name_plural = "تاریخچه ورودها"
        ordering = ['-login_time']

    def __str__(self):
        return f"{self.user.username} - {self.login_time}"


class DeliveryAttempt(models.Model):
    """Persistent delivery state for security and transactional messages."""
    CHANNEL_CHOICES = [('email', 'Email'), ('sms', 'SMS')]
    STATUS_CHOICES = [
        ('queued', 'Queued'), ('sending', 'Sending'),
        ('sent', 'Sent'), ('failed', 'Failed'),
    ]

    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES)
    purpose = models.CharField(max_length=50)
    recipient = models.CharField(max_length=254)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='queued')
    attempts = models.PositiveSmallIntegerField(default=0)
    provider = models.CharField(max_length=150, blank=True)
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(
                fields=['channel', 'status', '-created_at'],
                name='accounts_de_channel_b7f34d_idx',
            ),
        ]
