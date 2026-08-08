from django.contrib import admin
from .models import Cart, CartItem

class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    readonly_fields = ['get_variant_details']

    def get_variant_details(self, obj):
        if obj.variant:
            return f"سایز: {obj.variant.size.name} | رنگ: {obj.variant.color.name} | SKU: {obj.variant.sku}"
        return "استاندارد (بدون واریانت)"
    get_variant_details.short_description = "جزئیات واریانت"

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['customer', 'total_items', 'total_price', 'created_at']
    search_fields = ['user__username', 'user__email', 'session_id']
    inlines = [CartItemInline]

    @admin.display(description='کاربر')
    def customer(self, obj):
        if obj.user_id:
            return obj.user.username
        return f'مهمان ({obj.session_id or "بدون نشست"})'

@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ['cart', 'product', 'get_variant_details', 'quantity', 'total_price']
    list_filter = ['product__category']

    def get_variant_details(self, obj):
        if obj.variant:
            return f"{obj.variant.size.name} - {obj.variant.color.name} (SKU: {obj.variant.sku})"
        return "استاندارد"
    get_variant_details.short_description = "واریانت (سایز/رنگ/SKU)"