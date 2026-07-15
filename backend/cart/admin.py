from django.contrib import admin
from .models import Cart, CartItem

class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    verbose_name = "آیتم سبد خرید"
    verbose_name_plural = "آیتم‌های سبد خرید"

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['user', 'total_items', 'total_price', 'created_at']
    inlines = [CartItemInline]
    # جستجو و فیلتر در ادمین
    search_fields = ['user__username', 'user__email']
    list_filter = ['created_at']

@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ['cart', 'product', 'variant', 'quantity', 'total_price', 'added_at']
    list_filter = ['product__category', 'added_at']
    search_fields = ['product__name', 'cart__user__username']