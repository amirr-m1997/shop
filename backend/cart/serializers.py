from rest_framework import serializers
from .models import Cart, CartItem
from products.serializers import ProductListSerializer, ProductVariantSerializer
from pages.models import SiteSettings


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    variant = ProductVariantSerializer(read_only=True)
    total_price = serializers.ReadOnlyField()

    class Meta:
        model = CartItem
        fields = ['id', 'cart', 'product', 'variant', 'quantity', 'total_price', 'added_at']


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.ReadOnlyField()
    total_items = serializers.ReadOnlyField()
    # تنظیمات ارسال از SiteSettings (دیتابیس) — نه هاردکد
    free_shipping_threshold = serializers.SerializerMethodField()
    shipping_cost = serializers.SerializerMethodField()
    shipping_fee = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = [
            'id', 'user', 'items', 'total_price', 'total_items',
            'free_shipping_threshold', 'shipping_cost', 'shipping_fee',
            'created_at', 'updated_at',
        ]

    def _site_settings(self):
        if not hasattr(self, '_cached_site_settings'):
            self._cached_site_settings = SiteSettings.load()
        return self._cached_site_settings

    def get_free_shipping_threshold(self, obj):
        return self._site_settings().free_shipping_threshold

    def get_shipping_cost(self, obj):
        """هزینه ارسال استاندارد (وقتی رایگان نیست)."""
        return self._site_settings().shipping_cost

    def get_shipping_fee(self, obj):
        """هزینه ارسال محاسبه‌شده برای جمع فعلی سبد (۰ اگر رایگان)."""
        return self._site_settings().calculate_shipping(obj.total_price)


class AddToCartSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    variant_id = serializers.IntegerField(required=False)
    quantity = serializers.IntegerField(min_value=1, default=1)


class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)
