from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from django.db.models import F

from .models import ShippingAddress, Order, OrderItem, Coupon, CouponUsage, WelcomeClaim
from .serializers import (
    ShippingAddressSerializer,
    OrderSerializer,
    CreateOrderSerializer,
    WelcomeOfferSerializer,
)
from cart.models import Cart, CartItem
from pages.models import SiteSettings
from products.models import Product, ProductVariant


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
        # auto-cancel expired unpaid orders
        expired = Order.objects.filter(
            user=self.request.user,
            expires_at__lt=timezone.now(),
            status__in=['pending', 'processing'],
            payment_status='unpaid',
        )
        for order in expired:
            order.cancel_if_expired()

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
                'variant': item.variant,
                'quantity': item.quantity,
                'price': price,
            })

        site_settings = SiteSettings.load()
        shipping_cost = site_settings.calculate_shipping(subtotal)
        discount = Decimal('0')

        # اعمال کوپن تخفیف
        coupon_code = serializer.validated_data.get('coupon_code', '')
        coupon = None
        if coupon_code:
            try:
                coupon = Coupon.objects.get(code=coupon_code, is_active=True)
                valid, msg = coupon.is_valid(user=request.user)
                if valid:
                    discount = coupon.apply_discount(subtotal)
            except Coupon.DoesNotExist:
                pass

        total = subtotal + shipping_cost - discount
        if total < 0:
            total = Decimal('0')

        with transaction.atomic():
            order = Order.objects.create(
                user=request.user,
                shipping_address=shipping_address,
                payment_method=serializer.validated_data['payment_method'],
                subtotal=subtotal,
                shipping_cost=shipping_cost,
                tax=0,
                discount=discount,
                total=total,
                notes=serializer.validated_data.get('notes', ''),
                expires_at=timezone.now() + timedelta(hours=24),
            )

            for item_data in order_items_data:
                OrderItem.objects.create(order=order, **item_data)
                product = item_data['product']
                Product.objects.filter(id=product.id).update(stock=F('stock') - item_data['quantity'])

            for item in cart_items:
                if item.variant:
                    ProductVariant.objects.filter(id=item.variant.id).update(stock=F('stock') - item.quantity)

            if coupon:
                CouponUsage.objects.create(coupon=coupon, user=request.user, order=order)
                Coupon.objects.filter(id=coupon.id).update(used_count=F('used_count') + 1)

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

        with transaction.atomic():
            # بازگرداندن موجودی (اتمیک)
            for item in order.items.all():
                if item.product:
                    Product.objects.filter(id=item.product.id).update(stock=F('stock') + item.quantity)
                if item.variant:
                    ProductVariant.objects.filter(id=item.variant.id).update(stock=F('stock') + item.quantity)

            order.status = 'cancelled'
            if order.payment_status == 'paid':
                order.payment_status = 'refunded'
            order.save(update_fields=['status', 'payment_status', 'updated_at'])

        return Response(
            {'message': 'سفارش با موفقیت لغو شد.', 'order': OrderSerializer(order).data},
            status=status.HTTP_200_OK
        )


class WelcomeOfferViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        """بررسی وجود هدیه خوش‌آمدگویی برای کاربر"""
        coupon = Coupon.objects.filter(
            is_welcome_offer=True,
            is_active=True,
            valid_from__lte=timezone.now(),
            valid_until__gte=timezone.now(),
        ).first()

        if not coupon:
            return Response({'available': False, 'offer': None})

        already_claimed = WelcomeClaim.objects.filter(user=request.user, coupon=coupon).exists()

        if already_claimed:
            return Response({'available': False, 'offer': None})

        return Response({
            'available': True,
            'offer': {
                'code': coupon.code,
                'discount_type': coupon.discount_type,
                'value': str(coupon.value),
                'discount_display': f"{coupon.value:,.0f}٪" if coupon.discount_type == 'percentage' else f"{coupon.value:,.0f} تومان",
                'claimed': False,
            }
        })

    @action(detail=False, methods=['post'])
    def claim(self, request):
        """ثبت دریافت هدیه خوش‌آمدگویی"""
        coupon = Coupon.objects.filter(
            is_welcome_offer=True,
            is_active=True,
            valid_from__lte=timezone.now(),
            valid_until__gte=timezone.now(),
        ).first()

        if not coupon:
            return Response(
                {'error': 'هدیه خوش‌آمدگویی در حال حاضر موجود نیست.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if WelcomeClaim.objects.filter(user=request.user, coupon=coupon).exists():
            return Response(
                {'error': 'شما قبلاً این هدیه را دریافت کرده‌اید.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        WelcomeClaim.objects.create(user=request.user, coupon=coupon)

        return Response({
            'success': True,
            'message': 'هدیه خوش‌آمدگویی با موفقیت دریافت شد.',
            'code': coupon.code,
        })