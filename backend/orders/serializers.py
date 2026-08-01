from rest_framework import serializers
from .models import ShippingAddress, Order, OrderItem, Coupon, WelcomeClaim
from products.models import Product
from products.serializers import ProductListSerializer
from decimal import Decimal


class WelcomeOfferSerializer(serializers.Serializer):
    code = serializers.CharField()
    discount_type = serializers.CharField()
    value = serializers.DecimalField(max_digits=10, decimal_places=2)
    discount_display = serializers.SerializerMethodField()
    claimed = serializers.BooleanField(read_only=True, default=False)

    def get_discount_display(self, obj):
        if obj['discount_type'] == 'percentage':
            return f"{obj['value']:,.0f}٪"
        return f"{obj['value']:,.0f} تومان"



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
    reservation_remaining_seconds = serializers.IntegerField(read_only=True)
    can_pay = serializers.BooleanField(read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'user', 'shipping_address',
            'status', 'status_display',
            'payment_status', 'payment_status_display',
            'payment_method', 'subtotal', 'shipping_cost',
            'tax', 'discount', 'total', 'notes',
            'tracking_number', 'postal_tracking_code',
            'items', 'created_at', 'updated_at', 'expires_at',
            'reservation_remaining_seconds', 'can_pay',
        ]
        read_only_fields = [
            'order_number', 'user', 'status', 'payment_status',
            'subtotal', 'tax', 'total', 'created_at', 'updated_at'
        ]


class CreateOrderSerializer(serializers.Serializer):
    shipping_address_id = serializers.IntegerField(
        error_messages={'required': 'آدرس ارسال الزامی است.'}
    )
    payment_method = serializers.ChoiceField(
        choices=Order.PAYMENT_METHOD_CHOICES,
        error_messages={'invalid_choice': 'روش پرداخت نامعتبر است.'}
    )
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    coupon_code = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_shipping_address_id(self, value):
        user = self.context['request'].user
        if not ShippingAddress.objects.filter(id=value, user=user).exists():
            raise serializers.ValidationError("آدرس ارسال یافت نشد یا متعلق به شما نیست.")
        return value

    def validate_coupon_code(self, value):
        if not value:
            return value
        try:
            coupon = Coupon.objects.get(code=value, is_active=True)
        except Coupon.DoesNotExist:
            raise serializers.ValidationError("کد تخفیف نامعتبر است.")
        user = self.context['request'].user
        valid, msg = coupon.is_valid(user=user)
        if not valid:
            raise serializers.ValidationError(msg)
        return value
