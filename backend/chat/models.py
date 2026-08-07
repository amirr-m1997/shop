from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from products.models import Product


class Conversation(models.Model):
    """گفتگوی خصوصی بین دو کاربر. ابتدا باید درخواست پذیرفته شود تا پیام‌رسانی فعال شود."""

    STATUS_PENDING = 'pending'
    STATUS_ACCEPTED = 'accepted'
    STATUS_DECLINED = 'declined'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'در انتظار تایید'),
        (STATUS_ACCEPTED, 'تایید شده'),
        (STATUS_DECLINED, 'رد شده'),
    ]

    user1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_conversations_1', verbose_name='کاربر ۱')
    user2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_conversations_2', verbose_name='کاربر ۲')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING, verbose_name='وضعیت')
    requested_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='chat_requests_sent',
        null=True, blank=True, verbose_name='درخواست‌دهنده'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='آخرین فعالیت')

    class Meta:
        verbose_name = 'گفتگو'
        verbose_name_plural = 'گفتگوها'
        ordering = ['-updated_at']
        constraints = [
            models.UniqueConstraint(fields=['user1', 'user2'], name='unique_conversation_pair'),
        ]

    def __str__(self):
        return f'{self.user1.username} ↔ {self.user2.username}'

    @classmethod
    def get_or_create_pair(cls, user_a, user_b, requester=None):
        """برگرداندن یا ساخت گفتگو با ترتیب نرمال‌شده کاربران (بدون تکرار).
        در صورت ایجاد گفتگوی جدید، وضعیت آن «در انتظار تایید» خواهد بود."""
        if user_a.id > user_b.id:
            user_a, user_b = user_b, user_a
        conversation, created = cls.objects.get_or_create(
            user1=user_a, user2=user_b,
            defaults={'status': cls.STATUS_PENDING, 'requested_by': requester},
        )
        return conversation, created

    def other_user(self, user):
        """برگرداندن طرف مقابل گفتگو نسبت به کاربر داده‌شده."""
        if self.user1_id == user.id:
            return self.user2
        return self.user1

    def is_member(self, user):
        return user.id in (self.user1_id, self.user2_id)

    @property
    def is_pending(self):
        return self.status == self.STATUS_PENDING

    @property
    def is_accepted(self):
        return self.status == self.STATUS_ACCEPTED

    def is_requester(self, user):
        return self.requested_by_id == user.id


class Message(models.Model):
    """پیام داخل یک گفتگو. می‌تواند متن، محصول یا هر دو را شامل شود."""
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages', verbose_name='گفتگو')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_sent_messages', verbose_name='فرستنده')
    text = models.TextField(blank=True, verbose_name='متن')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='chat_messages', verbose_name='محصول')
    is_read = models.BooleanField(default=False, verbose_name='خوانده شده')
    reaction = models.CharField(max_length=20, blank=True, verbose_name='واکنش')
    is_favorite = models.BooleanField(default=False, verbose_name='علاقه‌مندی')
    created_at = models.DateTimeField(default=timezone.now, verbose_name='تاریخ ارسال')

    class Meta:
        verbose_name = 'پیام'
        verbose_name_plural = 'پیام‌ها'
        ordering = ['created_at', 'id']

    def __str__(self):
        return f'{self.sender.username}: {self.text[:30]}'


class Notification(models.Model):
    """اعلان‌های داخل برنامه (مثل ارسال محصول برای کاربر)."""
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_notifications', verbose_name='گیرنده')
    actor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_notifications_sent', null=True, blank=True, verbose_name='فرستنده')
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True, verbose_name='گفتگو')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='chat_notifications', verbose_name='محصول')
    text = models.CharField(max_length=300, blank=True, verbose_name='متن')
    is_read = models.BooleanField(default=False, verbose_name='خوانده شده')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ')

    class Meta:
        verbose_name = 'اعلان'
        verbose_name_plural = 'اعلان‌ها'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.actor.username if self.actor else "?"} → {self.recipient.username}: {self.text}'
