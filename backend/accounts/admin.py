from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from .models import UserProfile, LoginHistory


@admin.register(UserProfile)
class UserProfileAdmin(ModelAdmin):
    list_display = ['user', 'first_name', 'last_name', 'phone', 'phone_verified', 'email_verified', 'created_at']
    list_filter = ['phone_verified', 'email_verified']
    search_fields = ['user__username', 'user__email', 'first_name', 'last_name', 'phone']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(LoginHistory)
class LoginHistoryAdmin(ModelAdmin):
    list_display = ['user', 'ip_address', 'short_user_agent', 'login_time']
    list_filter = ['login_time']
    search_fields = ['user__username', 'ip_address']
    readonly_fields = ['user', 'ip_address', 'user_agent', 'login_time']
    ordering = ['-login_time']

    def short_user_agent(self, obj):
        ua = obj.user_agent or ''
        if len(ua) > 60:
            return ua[:60] + '...'
        return ua
    short_user_agent.short_description = 'مرورگر'

    def has_add_permission(self, request):
        return False
