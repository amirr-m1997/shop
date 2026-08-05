from django.db import models
from django.contrib.auth.models import User
from orders.models import Order


class Payment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'در انتظار پرداخت'),
        ('processing', 'در حال پردازش'),
        ('success', 'موفق'),
        ('failed', 'ناموفق'),
        ('refunded', 'بازپرداخت شده'),
    ]

    order = models.OneToOneField(
        Order, on_delete=models.CASCADE, related_name='payment', verbose_name="سفارش"
    )
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, related_name='payments',
        null=True, blank=True, verbose_name="کاربر"
    )
    authority = models.CharField(
        max_length=100, blank=True, null=True, verbose_name="کد احراز هویت"
    )
    ref_id = models.CharField(
        max_length=100, blank=True, null=True, verbose_name="شماره مرجع"
    )
    amount = models.DecimalField(
        max_digits=12, decimal_places=2, verbose_name="مبلغ (تومان)"
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name="وضعیت"
    )
    card_pan = models.CharField(
        max_length=50, blank=True, null=True, verbose_name="شماره کارت"
    )
    fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, verbose_name="کارمزد"
    )
    error_code = models.IntegerField(default=0, verbose_name="کد خطا")
    error_message = models.TextField(blank=True, default='', verbose_name="پیام خطا")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاریخ بروزرسانی")

    class Meta:
        verbose_name = "پرداخت"
        verbose_name_plural = "پرداخت‌ها"
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment #{self.id} - Order {self.order.order_number} - {self.status}"
