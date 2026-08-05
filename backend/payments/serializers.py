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
        from django.conf import settings

        request = self.context['request']
        user = request.user

        try:
            order = Order.objects.get(id=int(value))
        except (ValueError, Order.DoesNotExist):
            order = Order.objects.filter(order_number=value).first()

        if not order:
            raise serializers.ValidationError("سفارش یافت نشد.")

        if user.is_authenticated:
            if order.user_id != user.id:
                raise serializers.ValidationError("سفارش یافت نشد.")
        else:
            session_id = request.META.get('HTTP_X_SESSION_ID', '') or ''
            if not order.guest_session_id or order.guest_session_id != session_id:
                raise serializers.ValidationError("سفارش یافت نشد.")

        if order.payment_status == 'paid':
            raise serializers.ValidationError("این سفارش قبلاً پرداخت شده است.")
        return order.id
