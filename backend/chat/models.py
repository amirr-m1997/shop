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
        indexes = [
            models.Index(fields=['updated_at'], name='chat_conv_updated_idx'),
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

    def is_blocked(self, user):
        """True وقتی کاربر داده‌شده، طرف مقابل را بلاک کرده باشد."""
        other = self.other_user(user)
        return Block.is_blocked(user, other)

    def i_blocked(self, user):
        """True وقتی خود کاربر داده‌شده، طرف مقابل را بلاک کرده باشد."""
        other = self.other_user(user)
        return Block.objects.filter(blocker_id=user.id, blocked_id=other.id).exists()


class Block(models.Model):
    """بلاک کردن یک کاربر توسط کاربر دیگر."""
    blocker = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_blocks_made', verbose_name='بلاک‌کننده')
    blocked = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_blocks_received', verbose_name='بلاک‌شده')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ')

    class Meta:
        verbose_name = 'بلاک'
        verbose_name_plural = 'بلاک‌ها'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['blocker', 'blocked'], name='unique_block_pair'),
        ]

    def __str__(self):
        return f'{self.blocker.username} بلاک {self.blocked.username}'

    @classmethod
    def is_blocked(cls, user_a, user_b):
        """True وقتی یک طرف، طرف دیگر را بلاک کرده باشد."""
        if user_a.id > user_b.id:
            user_a, user_b = user_b, user_a
        return cls.objects.filter(
            models.Q(blocker_id=user_a.id, blocked_id=user_b.id) |
            models.Q(blocker_id=user_b.id, blocked_id=user_a.id)
        ).exists()


class Message(models.Model):
    """پیام داخل یک گفتگو. می‌تواند متن، محصول یا هر دو را شامل شود."""
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name='messages',
        null=True, blank=True, verbose_name='گفتگو'
    )
    style_room = models.ForeignKey(
        'style_rooms.StyleRoom', on_delete=models.CASCADE, related_name='messages',
        null=True, blank=True, verbose_name='ناحیه استایل'
    )
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_sent_messages', verbose_name='فرستنده')
    text = models.TextField(blank=True, verbose_name='متن')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='chat_messages', verbose_name='محصول')
    is_read = models.BooleanField(default=False, verbose_name='خوانده شده')
    reaction = models.CharField(max_length=20, blank=True, verbose_name='واکنش')
    is_favorite = models.BooleanField(default=False, verbose_name='علاقه‌مندی')
    reply_to = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='replies', verbose_name='پاسخ به',
    )
    forwarded_from = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='forwards', verbose_name='هدایت‌شده از',
    )
    deleted_at = models.DateTimeField(null=True, blank=True, verbose_name='حذف برای همه')
    deleted_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='chat_tombstones', verbose_name='حذف‌کننده',
    )
    idempotency_key = models.CharField(max_length=64, blank=True, default='', verbose_name='کلید تکرارنشدن')
    deleted_for = models.ManyToManyField(
        User, related_name='chat_deleted_messages', blank=True,
        verbose_name='حذف‌شده برای کاربران',
        help_text='کاربرانی که این پیام را از دید خود حذف کرده‌اند (حذف یک‌طرفه).',
    )
    created_at = models.DateTimeField(default=timezone.now, verbose_name='تاریخ ارسال')

    class Meta:
        verbose_name = 'پیام'
        verbose_name_plural = 'پیام‌ها'
        ordering = ['created_at', 'id']
        indexes = [
            models.Index(fields=['conversation', 'created_at'], name='chat_msg_conv_created_idx'),
            models.Index(fields=['conversation', 'is_read'], name='chat_msg_conv_read_idx'),
            models.Index(fields=['style_room', 'created_at', 'id'], name='chat_msg_room_created_id_idx'),
            models.Index(fields=['conversation', 'idempotency_key'], name='chat_msg_conv_idem_idx'),
        ]
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(conversation__isnull=False, style_room__isnull=True) |
                    models.Q(conversation__isnull=True, style_room__isnull=False)
                ),
                name='chat_msg_exactly_one_context',
            ),
            models.UniqueConstraint(
                fields=['conversation', 'sender', 'idempotency_key'],
                condition=models.Q(idempotency_key__gt=''),
                name='chat_msg_conv_sender_idem_uniq',
            ),
        ]

    def __str__(self):
        return f'{self.sender.username}: {self.text[:30]}'


class StyleRoomMessageRead(models.Model):
    """Per-user read state for messages posted in a Style Room."""

    message = models.ForeignKey(
        Message, on_delete=models.CASCADE, related_name='style_room_reads',
        verbose_name='پیام'
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='style_room_message_reads',
        verbose_name='کاربر'
    )
    read_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ خواندن')

    class Meta:
        verbose_name = 'خواندن پیام اتاق استایل'
        verbose_name_plural = 'خواندن پیام‌های اتاق استایل'
        constraints = [
            models.UniqueConstraint(
                fields=['message', 'user'], name='chat_room_read_message_user_unique'
            ),
        ]
        indexes = [
            models.Index(fields=['user', '-read_at'], name='chat_room_read_user_idx'),
        ]


class MessageReceipt(models.Model):
    """Per-recipient delivery/seen state. Opening a thread is not enough for seen."""

    message = models.ForeignKey(
        Message, on_delete=models.CASCADE, related_name='receipts', verbose_name='پیام',
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='chat_message_receipts', verbose_name='گیرنده',
    )
    delivered_at = models.DateTimeField(null=True, blank=True, verbose_name='زمان تحویل')
    seen_at = models.DateTimeField(null=True, blank=True, verbose_name='زمان مشاهده')

    class Meta:
        verbose_name = 'رسید پیام'
        verbose_name_plural = 'رسیدهای پیام'
        constraints = [
            models.UniqueConstraint(fields=['message', 'user'], name='chat_receipt_message_user_unique'),
        ]
        indexes = [
            models.Index(fields=['user', 'seen_at'], name='chat_receipt_user_seen_idx'),
        ]

    def __str__(self):
        return f'receipt {self.message_id} → {self.user_id}'


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


class MessageReport(models.Model):
    """گزارش پیام/کاربر. هویت گزارش‌دهنده فقط در ادمین دیده می‌شود."""

    REASON_SPAM = 'spam'
    REASON_ABUSE = 'abuse'
    REASON_HARASSMENT = 'harassment'
    REASON_OTHER = 'other'
    REASON_CHOICES = [
        (REASON_SPAM, 'هرزنامه'),
        (REASON_ABUSE, 'محتوای نامناسب'),
        (REASON_HARASSMENT, 'آزار'),
        (REASON_OTHER, 'سایر'),
    ]

    STATUS_OPEN = 'open'
    STATUS_REVIEWED = 'reviewed'
    STATUS_DISMISSED = 'dismissed'
    STATUS_CHOICES = [
        (STATUS_OPEN, 'باز'),
        (STATUS_REVIEWED, 'بررسی‌شده'),
        (STATUS_DISMISSED, 'رد شده'),
    ]

    reporter = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='chat_reports_made', verbose_name='گزارش‌دهنده',
    )
    target_user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='chat_reports_received', verbose_name='کاربر گزارش‌شده',
    )
    message = models.ForeignKey(
        Message, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='reports', verbose_name='پیام',
    )
    conversation = models.ForeignKey(
        Conversation, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='reports', verbose_name='گفتگو',
    )
    reason = models.CharField(max_length=20, choices=REASON_CHOICES, default=REASON_OTHER, verbose_name='دلیل')
    details = models.TextField(blank=True, verbose_name='توضیح')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN, verbose_name='وضعیت')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ')

    class Meta:
        verbose_name = 'گزارش پیام'
        verbose_name_plural = 'گزارش‌های پیام'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['reporter', 'created_at'], name='chat_report_reporter_idx'),
            models.Index(fields=['status', 'created_at'], name='chat_report_status_idx'),
        ]

    def __str__(self):
        return f'report {self.pk} → {self.target_user_id}'


class PushSubscription(models.Model):
    """Web Push subscription for a single browser/device."""

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='chat_push_subscriptions', verbose_name='کاربر',
    )
    endpoint = models.URLField(max_length=500, unique=True, verbose_name='آدرس پوش')
    p256dh = models.CharField(max_length=200, verbose_name='کلید p256dh')
    auth = models.CharField(max_length=200, verbose_name='کلید auth')
    user_agent = models.CharField(max_length=300, blank=True, verbose_name='مرورگر')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ')

    class Meta:
        verbose_name = 'اشتراک پوش'
        verbose_name_plural = 'اشتراک‌های پوش'
        indexes = [
            models.Index(fields=['user', 'created_at'], name='chat_push_user_idx'),
        ]

    def __str__(self):
        return f'push {self.user_id}'
