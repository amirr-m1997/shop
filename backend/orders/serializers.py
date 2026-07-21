from rest_framework import serializers
from .models import ShippingAddress, Order, OrderItem
from products.models import Product
from products.serializers import ProductListSerializer



class ShippingAddressSerializer(serializers.ModelSerializer):
    country = serializers.CharField(default='Iran', required=False)

    class Meta:
        model = ShippingAddress
        fields = [
            'id', 'user', 'full_name', 'phone',
            'address_line1', 'address_line2',
            'city', 'state', 'postal_code', 'country',
            'is_default', 'created_at'
        ]
        read_only_fields = ['user', 'created_at']


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(is_active=True),
        source='product',
        write_only=True,
        error_messages={'does_not_exist': 'محصول مورد نظر یافت نشد.'}
    )
    total_price = serializers.ReadOnlyField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_id', 'quantity', 'price', 'total_price']
        read_only_fields = ['price', 'total_price']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    user = serializers.StringRelatedField(read_only=True)
    shipping_address = ShippingAddressSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'user', 'shipping_address',
            'status', 'status_display',
            'payment_status', 'payment_status_display',
            'payment_method', 'subtotal', 'shipping_cost',
            'tax', 'discount', 'total', 'notes',
            'tracking_number', 'items', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'order_number', 'user', 'status', 'payment_status',
            'subtotal', 'tax', 'total', 'created_at', 'updated_at'
        ]


class CreateOrderSerializer(serializers.Serializer):
    """سریالایزر مخصوص ایجاد سفارش از سبد خرید"""
    shipping_address_id = serializers.IntegerField(
        error_messages={'required': 'آدرس ارسال الزامی است.'}
    )
    payment_method = serializers.ChoiceField(
        choices=Order.PAYMENT_METHOD_CHOICES,
        error_messages={'invalid_choice': 'روش پرداخت نامعتبر است.'}
    )
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_shipping_address_id(self, value):
        user = self.context['request'].user
        if not ShippingAddress.objects.filter(id=value, user=user).exists():
            raise serializers.ValidationError("آدرس ارسال یافت نشد یا متعلق به شما نیست.")
        return value