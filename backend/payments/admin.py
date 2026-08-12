from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Payment
from shop.jalali import jalali_datetime


@admin.register(Payment)
class PaymentAdmin(ModelAdmin):
    list_display = ('id', 'order', 'amount', 'status', 'ref_id', 'created_at_jalali')
    list_filter = ('status', 'created_at')
    search_fields = ('order__order_number', 'authority', 'ref_id', 'user__username')
    readonly_fields = ('authority', 'ref_id', 'card_pan', 'fee', 'created_at_jalali', 'updated_at_jalali')

    @admin.display(description='تاریخ ایجاد', ordering='created_at')
    def created_at_jalali(self, obj):
        return jalali_datetime(obj.created_at)

    @admin.display(description='آخرین به‌روزرسانی', ordering='updated_at')
    def updated_at_jalali(self, obj):
        return jalali_datetime(obj.updated_at)
