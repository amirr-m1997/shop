from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from unfold.admin import ModelAdmin, TabularInline
from .models import UserProfile, LoginHistory
from shop.jalali import jalali_date, jalali_datetime


admin.site.unregister(User)


@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    list_display = (
        'username', 'email', 'first_name', 'last_name', 'is_staff',
        'date_joined_jalali',
    )
    readonly_fields = ('last_login_jalali', 'date_joined_jalali')
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('اطلاعات شخصی', {'fields': ('first_name', 'last_name', 'email')}),
        ('دسترسی‌ها', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        ('تاریخ‌های شمسی', {'fields': ('last_login_jalali', 'date_joined_jalali')}),
    )

    @admin.display(description='آخرین ورود', ordering='last_login')
    def last_login_jalali(self, obj):
        return jalali_datetime(getattr(obj, 'last_login', None))

    @admin.display(description='تاریخ عضویت', ordering='date_joined')
    def date_joined_jalali(self, obj):
        return jalali_datetime(getattr(obj, 'date_joined', None))


@admin.register(UserProfile)
class UserProfileAdmin(ModelAdmin):
    list_display = ['user', 'first_name', 'last_name', 'phone', 'phone_verified', 'email_verified', 'created_at_jalali']
    list_filter = ['phone_verified', 'email_verified']
    search_fields = ['user__username', 'user__email', 'first_name', 'last_name', 'phone']
    readonly_fields = ['created_at_jalali', 'updated_at_jalali']

    @admin.display(description='تاریخ تولد')
    def date_of_birth_jalali(self, obj):
        return jalali_date(obj.date_of_birth)

    @admin.display(description='تاریخ ایجاد', ordering='created_at')
    def created_at_jalali(self, obj):
        return jalali_datetime(obj.created_at)

    @admin.display(description='آخرین به‌روزرسانی', ordering='updated_at')
    def updated_at_jalali(self, obj):
        return jalali_datetime(obj.updated_at)


@admin.register(LoginHistory)
class LoginHistoryAdmin(ModelAdmin):
    list_display = ['user', 'ip_address', 'short_user_agent', 'login_time_jalali']
    list_filter = ['login_time']
    search_fields = ['user__username', 'ip_address']
    readonly_fields = ['user', 'ip_address', 'user_agent', 'login_time_jalali']
    ordering = ['-login_time']

    @admin.display(description='زمان ورود', ordering='login_time')
    def login_time_jalali(self, obj):
        return jalali_datetime(obj.login_time)

    def short_user_agent(self, obj):
        ua = obj.user_agent or ''
        if len(ua) > 60:
            return ua[:60] + '...'
        return ua
    short_user_agent.short_description = 'مرورگر'

    def has_add_permission(self, request):
        return False
