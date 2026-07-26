import random
from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    first_name = models.CharField(max_length=100, blank=True, verbose_name="نام")
    last_name = models.CharField(max_length=100, blank=True, verbose_name="نام خانوادگی")
    phone = models.CharField(max_length=20, blank=True, verbose_name="شماره تلفن")
    date_of_birth = models.DateField(null=True, blank=True, verbose_name="تاریخ تولد")
    phone_verified = models.BooleanField(default=False, verbose_name="تلفن تأیید شده")
    email_verified = models.BooleanField(default=False, verbose_name="ایمیل تأیید شده")
    verification_code = models.CharField(max_length=6, blank=True, verbose_name="کد تأیید")
    reset_token = models.CharField(max_length=100, blank=True, default='', verbose_name="توکن بازیابی رمز")
    verification_type = models.CharField(
        max_length=10,
        choices=[('phone', 'تلفن'), ('email', 'ایمیل')],
        blank=True,
        verbose_name="نوع تأیید"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "پروفایل کاربر"
        verbose_name_plural = "پروفایل‌های کاربران"

    def __str__(self):
        return f"پروفایل {self.user.username}"

    def generate_verification_code(self, verify_type='phone'):
        code = str(random.randint(100000, 999999))
        self.verification_code = code
        self.verification_type = verify_type
        self.save()
        return code


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
