import logging
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from django.db.models import F

from .models import ShippingAddress, Order, OrderItem, Coupon, CouponUsage, WelcomeClaim, RESERVATION_MINUTES
from .serializers import (
    ShippingAddressSerializer,
    OrderSerializer,
    CreateOrderSerializer,
    WelcomeOfferSerializer,
)
from .services import reserve_inventory, release_inventory
from cart.models import Cart, CartItem
from pages.models import SiteSettings
from products.models import Product, ProductVariant
from shop.observability import (
    log_order_created, log_order_cancelled, log_order_expired,
    log_inventory_reserved, log_inventory_released, log_inventory_insufficient,
    log_exception,
)

logger = logging.getLogger('orders')


class ShippingAddressViewSet(viewsets.ModelViewSet):
    serializer_class = ShippingAddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ShippingAddress.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
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
            'items__product__images',
            'items__product__brand',
            'items__product__category',
            'shipping_address',
        )

    @action(detail=False, methods=['post'], url_path='create_order')
    def create_order(self, request):
        serializer = CreateOrderSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        try:
            cart = Cart.objects.prefetch_related(
                'items__product', 'items__variant__size', 'items__variant__color',
            ).get(user=request.user)
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

        # Check stock availability
        for item in cart_items:
            available = item.variant.effective_stock if item.variant else item.product.stock
            if available < item.quantity:
                log_inventory_insufficient(
                    order_id=None, product_id=item.product.id,
                    available=available, requested=item.quantity,
                )
                variant_info = f" ({item.variant.size.name} / {item.variant.color.name})" if item.variant else ""
                return Response(
                    {'error': f'موجودی محصول «{item.product.name}»{variant_info} کافی نیست. (موجودی: {available})'},
                    status=status.HTTP_400_BAD_REQUEST
                )

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
                status='pending_payment',
                payment_method=serializer.validated_data['payment_method'],
                subtotal=subtotal,
                shipping_cost=shipping_cost,
                tax=0,
                discount=discount,
                total=total,
                notes=serializer.validated_data.get('notes', ''),
                expires_at=timezone.now() + timedelta(minutes=RESERVATION_MINUTES),
            )

            for item_data in order_items_data:
                OrderItem.objects.create(order=order, **item_data)

            # Reserve inventory (decrement stock)
            reserve_inventory(order)

            if coupon:
                CouponUsage.objects.create(coupon=coupon, user=request.user, order=order)
                Coupon.objects.filter(id=coupon.id).update(used_count=F('used_count') + 1)

            cart_items.delete()

        log_order_created(order.id, order.order_number, request.user.id, total, len(order_items_data))
        log_inventory_reserved(order.id, len(order_items_data))
        logger.info(
            '[order_created] order_id=%d order_number=%s user=%s total=%s items=%d',
            order.id, order.order_number, request.user.username, total, len(order_items_data),
        )

        try:
            from shop.email_service import send_order_confirmation
            send_order_confirmation(order)
        except Exception as e:
            logger.error('[email_send_error] order=%s error=%s', order.order_number, e)

        return Response(
            OrderSerializer(order).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_order(self, request, pk=None):
        order = self.get_object()
        if order.status not in ['pending_payment', 'pending', 'processing']:
            return Response(
                {'error': 'فقط سفارش‌های در انتظار پرداخت، در انتظار بررسی یا در حال پردازش قابل لغو هستند.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_status = order.status
        with transaction.atomic():
            if order.status == 'pending_payment':
                release_inventory(order)
                log_inventory_released(order.id, order.items.count(), reason='order_cancelled')

            order.status = 'cancelled'
            if order.payment_status == 'paid':
                order.payment_status = 'refunded'
            order.save(update_fields=['status', 'payment_status', 'updated_at'])

        log_order_cancelled(order.id, order.order_number, request.user.id)
        logger.info(
            '[order_cancelled] order_id=%d order_number=%s user=%s',
            order.id, order.order_number, request.user.username,
        )

        try:
            from shop.email_service import send_order_status_update
            send_order_status_update(order, old_status)
        except Exception as e:
            logger.error('[email_send_error] order=%s error=%s', order.order_number, e)

        return Response(
            {'message': 'سفارش با موفقیت لغو شد.', 'order': OrderSerializer(order).data},
            status=status.HTTP_200_OK
        )


class WelcomeOfferViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
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
