from django.contrib import admin
from django.utils.html import format_html

from .models import Block, Conversation, Message, Notification
from shop.jalali import jalali_datetime


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ('sender', 'text', 'product', 'is_read', 'reaction', 'is_favorite', 'created_at_jalali')
    fields = ('sender', 'text', 'product', 'is_read', 'reaction', 'is_favorite', 'created_at_jalali')
    show_change_link = True
    can_delete = False
    max_num = 20

    @admin.display(description='تاریخ ارسال')
    def created_at_jalali(self, obj):
        return jalali_datetime(obj.created_at)


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user1', 'user2', 'status_badge', 'requested_by', 'updated_at_jalali', 'created_at_jalali')
    list_filter = ('status', 'created_at', 'updated_at')
    search_fields = ('user1__username', 'user2__username', 'requested_by__username')
    readonly_fields = ('created_at_jalali', 'updated_at_jalali')
    inlines = (MessageInline,)

    @admin.display(description='تاریخ ایجاد', ordering='created_at')
    def created_at_jalali(self, obj):
        return jalali_datetime(obj.created_at)

    @admin.display(description='آخرین فعالیت', ordering='updated_at')
    def updated_at_jalali(self, obj):
        return jalali_datetime(obj.updated_at)

    @admin.display(description='وضعیت')
    def status_badge(self, obj):
        colors = {
            Conversation.STATUS_PENDING: '#f59e0b',
            Conversation.STATUS_ACCEPTED: '#22c55e',
            Conversation.STATUS_DECLINED: '#ef4444',
        }
        color = colors.get(obj.status, '#64748b')
        return format_html(
            '<span style="background:{}1a;color:{};border:1px solid {}55;'
            'padding:2px 10px;border-radius:999px;font-weight:700;font-size:11px">{}</span>',
            color, color, color, obj.get_status_display()
        )


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'conversation', 'sender', 'short_text', 'has_product', 'is_read', 'created_at_jalali')
    list_filter = ('is_read', 'is_favorite', 'created_at')
    search_fields = ('text', 'sender__username', 'conversation__user1__username', 'conversation__user2__username')
    readonly_fields = ('conversation', 'sender', 'product', 'created_at_jalali')

    @admin.display(description='تاریخ ارسال', ordering='created_at')
    def created_at_jalali(self, obj):
        return jalali_datetime(obj.created_at)

    @admin.display(description='متن', boolean=False)
    def short_text(self, obj):
        return obj.text[:60] if obj.text else '—'

    @admin.display(description='محصول', boolean=True)
    def has_product(self, obj):
        return bool(obj.product_id)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'recipient', 'actor', 'short_text', 'is_read', 'created_at_jalali')
    list_filter = ('is_read', 'created_at')
    search_fields = ('recipient__username', 'actor__username', 'text')
    list_editable = ('is_read',)
    actions = ['mark_as_read', 'mark_as_unread']

    @admin.display(description='تاریخ', ordering='created_at')
    def created_at_jalali(self, obj):
        return jalali_datetime(obj.created_at)

    @admin.display(description='متن')
    def short_text(self, obj):
        return obj.text[:50] if obj.text else '—'

    @admin.action(description='علامت‌گذاری به‌عنوان خوانده‌شده')
    def mark_as_read(self, request, queryset):
        queryset.update(is_read=True)

    @admin.action(description='علامت‌گذاری به‌عنوان خوانده‌نشده')
    def mark_as_unread(self, request, queryset):
        queryset.update(is_read=False)


@admin.register(Block)
class BlockAdmin(admin.ModelAdmin):
    list_display = ('id', 'blocker', 'blocked', 'created_at_jalali')
    search_fields = ('blocker__username', 'blocked__username')

    @admin.display(description='تاریخ', ordering='created_at')
    def created_at_jalali(self, obj):
        return jalali_datetime(obj.created_at)
