from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'order', 'authority', 'ref_id', 'amount',
            'status', 'card_pan', 'fee', 'error_code',
            'error_message', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'authority', 'ref_id', 'card_pan',
            'fee', 'error_code', 'error_message', 'created_at', 'updated_at',
        ]


class InitiatePaymentSerializer(serializers.Serializer):
    order_id = serializers.CharField()

    def validate_order_id(self, value):
        from orders.models import Order
        user = self.context['request'].user
        try:
            order = Order.objects.get(id=int(value), user=user)
        except (ValueError, Order.DoesNotExist):
            try:
                order = Order.objects.get(order_number=value, user=user)
            except Order.DoesNotExist:
                raise serializers.ValidationError("سفارش یافت نشد.")
        if order.payment_status == 'paid':
            raise serializers.ValidationError("این سفارش قبلاً پرداخت شده است.")
        return order.id
