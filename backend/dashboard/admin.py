from django.contrib import admin
from django.contrib.admin import ModelAdmin

from .models import (
    Notification, ActivityLog, TodoItem, AdminNote, AdminRole,
    AdminPermission, AdminRolePermission,
)
from shop.jalali import jalali_date, jalali_datetime


@admin.register(Notification, ActivityLog, TodoItem, AdminNote, AdminRole, AdminPermission, AdminRolePermission)
class DashboardModelAdmin(ModelAdmin):
    list_per_page = 30

    def get_list_display(self, request):
        columns = ['__str__']
        field_names = {field.name for field in self.model._meta.fields}
        for name in ('due_date', 'created_at', 'updated_at'):
            if name in field_names:
                columns.append(f'{name}_jalali')
        return columns

    @admin.display(description='مهلت', ordering='due_date')
    def due_date_jalali(self, obj):
        return jalali_date(getattr(obj, 'due_date', None))

    @admin.display(description='تاریخ ایجاد', ordering='created_at')
    def created_at_jalali(self, obj):
        return jalali_datetime(getattr(obj, 'created_at', None))

    @admin.display(description='آخرین به‌روزرسانی', ordering='updated_at')
    def updated_at_jalali(self, obj):
        return jalali_datetime(getattr(obj, 'updated_at', None))
