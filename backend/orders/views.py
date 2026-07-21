from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from decimal import Decimal

from .models import ShippingAddress, Order, OrderItem
from .serializers import (
    ShippingAddressSerializer,
    OrderSerializer,
    CreateOrderSerializer,
)
from cart.models import Cart, CartItem
from pages.models import SiteSettings


class ShippingAddressViewSet(viewsets.ModelViewSet):
    serializer_class = ShippingAddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ShippingAddress.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # اگر آدرس پیش‌فرض جدید است، بقیه را غیرپیش‌فرض کن
        if serializer.validated_data.get('is_default'):
            ShippingAddress.objects.filter(
                user=self.request.user, is_default=True
            ).update(is_default=False)
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        if serializer.validated_data.get('is_default'):
            ShippingAddress.objects.filter(
                user=self.request.user, is_default=True
            ).exclude(id=self.get_object().id).update(is_default=False)
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_default:
            return Response(
                {'error': 'نمی‌توانید آدرس پیش‌فرض را حذف کنید. ابتدا آدرس پیش‌فرض دیگری تعیین کنید.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related(
            'items__product'
        )

    @action(detail=False, methods=['post'], url_path='create_order')
    def create_order(self, request):
        serializer = CreateOrderSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        # دریافت سبد خرید کاربر
        try:
            cart = Cart.objects.prefetch_related('items__product', 'items__variant').get(user=request.user)
        except Cart.DoesNotExist:
            return Response(
                {'error': 'سبد خرید شما خالی است.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        cart_items = cart.items.all()
        if not cart_items.exists():
            return Response(
                {'error': 'سبد خرید شما خالی است.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # بررسی موجودی
        for item in cart_items:
            if item.product.stock < item.quantity:
                return Response(
                    {'error': f'موجودی محصول «{item.product.name}» کافی نیست. (موجودی: {item.product.stock})'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # محاسبات مالی
        shipping_address = get_object_or_404(
            ShippingAddress,
            id=serializer.validated_data['shipping_address_id'],
            user=request.user
        )

        subtotal = Decimal('0')
        order_items_data = []

        for item in cart_items:
            price = item.product.price
            if item.variant:
                price += item.variant.price_adjustment
            item_total = price * item.quantity
            subtotal += item_total
            order_items_data.append({
                'product': item.product,
                'quantity': item.quantity,
                'price': price,
            })

        site_settings = SiteSettings.load()
        shipping_cost = site_settings.calculate_shipping(subtotal)
        discount = Decimal('0')
        for item in cart_items:
            if item.product.compare_price and item.product.compare_price > item.product.price:
                discount += (item.product.compare_price - item.product.price) * item.quantity
        tax_rate = Decimal('0.09')
        tax = ((subtotal - discount) * tax_rate).quantize(Decimal('0.01'))
        total = subtotal - discount + shipping_cost + tax

        with transaction.atomic():
            # ایجاد سفارش
            order = Order.objects.create(
                user=request.user,
                shipping_address=shipping_address,
                payment_method=serializer.validated_data['payment_method'],
                subtotal=subtotal,
                shipping_cost=shipping_cost,
                tax=tax,
                discount=discount,
                total=total,
                notes=serializer.validated_data.get('notes', ''),
            )

            # ایجاد آیتم‌های سفارش
            for item_data in order_items_data:
                OrderItem.objects.create(order=order, **item_data)
                # کاهش موجودی
                product = item_data['product']
                product.stock -= item_data['quantity']
                product.save(update_fields=['stock'])

            # خالی کردن سبد خرید
            cart_items.delete()

        return Response(
            OrderSerializer(order).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_order(self, request, pk=None):
        order = self.get_object()
        if order.status not in ['pending', 'processing']:
            return Response(
                {'error': 'فقط سفارش‌های در انتظار بررسی یا در حال پردازش قابل لغو هستند.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # بازگرداندن موجودی
        for item in order.items.all():
            item.product.stock += item.quantity
            item.product.save(update_fields=['stock'])

        order.status = 'cancelled'
        if order.payment_status == 'paid':
            order.payment_status = 'refunded'
        order.save(update_fields=['status', 'payment_status', 'updated_at'])

        return Response(
            {'message': 'سفارش با موفقیت لغو شد.', 'order': OrderSerializer(order).data},
            status=status.HTTP_200_OK
        )