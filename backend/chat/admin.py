from django.contrib import admin
from .models import Conversation, Message, Notification


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ('created_at',)


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user1', 'user2', 'updated_at', 'created_at')
    search_fields = ('user1__username', 'user2__username')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'conversation', 'sender', 'short_text', 'product', 'is_read', 'created_at')
    list_filter = ('is_read', 'created_at')
    search_fields = ('text', 'sender__username', 'conversation__user1__username', 'conversation__user2__username')
    readonly_fields = ('created_at',)

    @admin.display(description='متن')
    def short_text(self, obj):
        return obj.text[:40] if obj.text else '—'


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'recipient', 'actor', 'short_text', 'is_read', 'created_at')
    list_filter = ('is_read', 'created_at')
    search_fields = ('recipient__username', 'actor__username', 'text')

    @admin.display(description='متن')
    def short_text(self, obj):
        return obj.text[:40]
