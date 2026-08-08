from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from .models import Cart, CartItem

class CartItemInline(TabularInline):
    model = CartItem
    extra = 0
    readonly_fields = ['get_variant_details']

    def get_variant_details(self, obj):
        if obj.variant:
            return f"سایز: {obj.variant.size.name} | رنگ: {obj.variant.color.name} | SKU: {obj.variant.sku}"
        return "استاندارد (بدون واریانت)"
    get_variant_details.short_description = "جزئیات واریانت"

@admin.register(Cart)
class CartAdmin(ModelAdmin):
    list_display = ['user', 'total_items', 'total_price', 'created_at']
    inlines = [CartItemInline]

@admin.register(CartItem)
class CartItemAdmin(ModelAdmin):
    list_display = ['cart', 'product', 'get_variant_details', 'quantity', 'total_price']
    list_filter = ['product__category']

    def get_variant_details(self, obj):
        if obj.variant:
            return f"{obj.variant.size.name} - {obj.variant.color.name} (SKU: {obj.variant.sku})"
        return "استاندارد"
    get_variant_details.short_description = "واریانت (سایز/رنگ/SKU)"