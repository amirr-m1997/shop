from django.contrib import admin
from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'first_name', 'last_name', 'phone', 'phone_verified', 'email_verified', 'created_at']
    list_filter = ['phone_verified', 'email_verified']
    search_fields = ['user__username', 'user__email', 'first_name', 'last_name', 'phone']
    readonly_fields = ['created_at', 'updated_at']
