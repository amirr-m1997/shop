import uuid
from datetime import timedelta

from django.contrib.auth.models import User
from django.db import models

from products.models import Product


INVITE_TOKEN_TTL = timedelta(days=7)
MAX_ROOM_MEMBERS = 20


# ─── Event types (append-only activity log) ─────────────────
EVENT_ROOM_CREATED = 'room.created'
EVENT_ROOM_UPDATED = 'room.updated'
EVENT_ROOM_MEMBER_INVITED = 'room.member_invited'
EVENT_ROOM_MEMBER_JOINED = 'room.member_joined'
EVENT_ROOM_MEMBER_LEFT = 'room.member_left'
EVENT_ROOM_MEMBER_REMOVED = 'room.member_removed'
EVENT_ROOM_ITEM_ADDED = 'room.item_added'
EVENT_ROOM_ITEM_REMOVED = 'room.item_removed'


class StyleRoom(models.Model):
    VISIBILITY_PRIVATE = 'private'
    VISIBILITY_INVITE_ONLY = 'invite_only'
    VISIBILITY_CHOICES = [
        (VISIBILITY_PRIVATE, 'خصوصی'),
        (VISIBILITY_INVITE_ONLY, 'فقط با دعوت'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, verbose_name='شناسه')
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='style_rooms', verbose_name='مالک'
    )
    title = models.CharField(max_length=120, verbose_name='عنوان')
    description = models.TextField(blank=True, verbose_name='توضیحات')
    cover = models.ImageField(upload_to='rooms/', null=True, blank=True, verbose_name='کاور')
    # NOTE ON SEMANTICS: this field is descriptive today. Room access is
    # enforced purely by membership — the room list/retrieve querysets only
    # return rooms the requesting user is a member of, and joining always
    # requires a valid, unexpired invite token (regardless of visibility).
    # There is no public room directory yet, so 'invite_only' does NOT
    # currently gate join/access differently from 'private'; it records the
    # owner's intent for future listing/browsing features. If a public
    # directory is ever added, enforce this flag there rather than weakening
    # membership checks.
    visibility = models.CharField(
        max_length=20, choices=VISIBILITY_CHOICES,
        default=VISIBILITY_PRIVATE, verbose_name='حریم خصوصی',
        help_text=(
            'خصوصی: فقط اعضای اتاق می‌توانند آن را ببینند. '
            'فقط با دعوت: قصد مالک مبنی بر ورود فقط از طریق دعوتنامه است؛ '
            'در حال حاضر دسترسی همچنان فقط بر اساس عضویت است و با توکن معتبر '
            'می‌توان در هر دو حالت پیوست.'
        ),
    )

    # Invitation token — only the SHA-256 hash is ever stored.
    invite_token_hash = models.CharField(max_length=64, blank=True, editable=False)
    invite_expires_at = models.DateTimeField(null=True, blank=True, editable=False)
    invite_revoked = models.BooleanField(default=True, editable=False)

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='آخرین فعالیت')

    class Meta:
        verbose_name = 'اتاق استایل'
        verbose_name_plural = 'اتاق‌های استایل'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['owner', '-updated_at'], name='sr_owner_updated_idx'),
            models.Index(fields=['visibility'], name='sr_visibility_idx'),
        ]

    def __str__(self):
        return self.title

    def is_member(self, user):
        return self.members.filter(user_id=user.id).exists()

    def is_owner(self, user):
        return self.owner_id == user.id


class StyleRoomMember(models.Model):
    ROLE_OWNER = 'owner'
    ROLE_MEMBER = 'member'
    ROLE_CHOICES = [
        (ROLE_OWNER, 'مالک'),
        (ROLE_MEMBER, 'عضو'),
    ]

    room = models.ForeignKey(StyleRoom, on_delete=models.CASCADE, related_name='members', verbose_name='اتاق')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='style_room_memberships', verbose_name='کاربر')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=ROLE_MEMBER, verbose_name='نقش')
    added_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name='دعوت‌کننده'
    )
    joined_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ عضویت')

    class Meta:
        verbose_name = 'عضو اتاق'
        verbose_name_plural = 'اعضای اتاق'
        constraints = [
            models.UniqueConstraint(fields=['room', 'user'], name='sr_member_room_user_unique'),
        ]
        indexes = [
            models.Index(fields=['user', '-joined_at'], name='sr_member_user_joined_idx'),
        ]

    def __str__(self):
        return f'{self.user.username} → {self.room.title} ({self.role})'


class StyleRoomItem(models.Model):
    room = models.ForeignKey(StyleRoom, on_delete=models.CASCADE, related_name='items', verbose_name='اتاق')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='style_room_items', verbose_name='محصول')
    added_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name='افزوده‌شده توسط'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ افزودن')

    class Meta:
        verbose_name = 'آیتم اتاق'
        verbose_name_plural = 'آیتم‌های اتاق'
        constraints = [
            models.UniqueConstraint(fields=['room', 'product'], name='sr_item_room_product_unique'),
        ]
        indexes = [
            models.Index(fields=['room', '-created_at'], name='sr_item_room_created_idx'),
        ]

    def __str__(self):
        return f'{self.product.name} → {self.room.title}'


class StyleRoomEvent(models.Model):
    """فعالیت‌های اتاق — رکورد append-only برای فید، ریالتایم آینده و Loyalty."""
    room = models.ForeignKey(StyleRoom, on_delete=models.CASCADE, related_name='events', verbose_name='اتاق')
    actor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name='انجام‌دهنده'
    )
    type = models.CharField(max_length=40, verbose_name='نوع رویداد')
    payload = models.JSONField(default=dict, blank=True, verbose_name='جزئیات')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ')

    class Meta:
        verbose_name = 'رویداد اتاق'
        verbose_name_plural = 'رویدادهای اتاق'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['room', '-created_at'], name='sr_event_room_created_idx'),
            models.Index(fields=['actor', '-created_at'], name='sr_event_actor_created_idx'),
        ]

    def __str__(self):
        return f'{self.type} → {self.room.title}'
