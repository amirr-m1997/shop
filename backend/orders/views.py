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
from collections import defaultdict

from .models import ShippingAddress, Order, OrderItem, Coupon, CouponUsage, WelcomeClaim, RESERVATION_MINUTES
from .serializers import (
    ShippingAddressSerializer,
    OrderSerializer,
    CreateOrderSerializer,
    WelcomeOfferSerializer,
)
from .services import reserve_inventory, release_inventory, release_coupon_hold
from cart.models import Cart, CartItem
from cart.services import get_or_create_cart, get_session_id
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

    @action(
        detail=False, methods=['post'], url_path='create_order',
        permission_classes=[permissions.AllowAny],
    )
    def create_order(self, request):
        serializer = CreateOrderSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        is_guest = not request.user.is_authenticated

        cart, session_id = get_or_create_cart(request)
        coupon_code = serializer.validated_data.get('coupon_code', '')
        loyalty_redemption_code = serializer.validated_data.get('loyalty_redemption_code', '')

        try:
            with transaction.atomic():
                # Serialize every checkout for this cart. A concurrent retry
                # waits here and then observes the cart emptied by the winner.
                locked_cart = Cart.objects.select_for_update().get(pk=cart.pk)
                cart_items = list(
                    CartItem.objects.select_for_update()
                    .filter(cart=locked_cart)
                    .order_by('pk')
                )
                if not cart_items:
                    return Response(
                        {'error': 'سبد خرید شما خالی است.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                product_ids = {item.product_id for item in cart_items}
                variant_ids = {item.variant_id for item in cart_items if item.variant_id}
                locked_products = {
                    product.pk: product
                    for product in Product.objects.select_for_update()
                    .filter(pk__in=product_ids).order_by('pk')
                }
                locked_variants = {
                    variant.pk: variant
                    for variant in ProductVariant.objects.select_for_update()
                    .filter(pk__in=variant_ids).order_by('pk')
                }

                product_demand = defaultdict(int)
                variant_demand = defaultdict(int)
                subtotal = Decimal('0')
                order_items_data = []

                # Build the authoritative snapshot only after every relevant
                # cart/inventory row has been locked.
                for item in cart_items:
                    product = locked_products.get(item.product_id)
                    variant = locked_variants.get(item.variant_id) if item.variant_id else None
                    if product is None or not product.is_active:
                        return Response(
                            {'error': 'یکی از محصولات سبد خرید دیگر در دسترس نیست.'},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    if item.variant_id and (
                        variant is None or variant.product_id != product.pk
                    ):
                        return Response(
                            {'error': f'واریانت محصول «{product.name}» دیگر در دسترس نیست.'},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    if variant is not None and variant.stock is not None:
                        variant_demand[variant.pk] += item.quantity
                    else:
                        # A variant with explicit stock owns its inventory
                        # bucket. Only unvaried items and variants that
                        # inherit stock from the product consume product stock.
                        product_demand[product.pk] += item.quantity

                    price = product.price + (
                        variant.price_adjustment if variant is not None else Decimal('0')
                    )
                    subtotal += price * item.quantity
                    order_items_data.append({
                        'product': product,
                        'variant': variant,
                        'quantity': item.quantity,
                        'price': price,
                    })

                # Every order item consumes product-level stock. Variants with
                # their own stock additionally consume their variant bucket.
                for product_id, requested in product_demand.items():
                    product = locked_products[product_id]
                    if product.stock < requested:
                        log_inventory_insufficient(
                            order_id=None, product_id=product_id,
                            available=product.stock, requested=requested,
                        )
                        return Response(
                            {'error': f'موجودی محصول «{product.name}» کافی نیست. (موجودی: {max(product.stock, 0)})'},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                for variant_id, requested in variant_demand.items():
                    variant = locked_variants[variant_id]
                    if variant.stock < requested:
                        product = locked_products[variant.product_id]
                        log_inventory_insufficient(
                            order_id=None, product_id=product.pk,
                            available=variant.stock, requested=requested,
                        )
                        return Response(
                            {'error': f'موجودی واریانت محصول «{product.name}» کافی نیست. (موجودی: {max(variant.stock, 0)})'},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                if is_guest:
                    shipping_address = ShippingAddress.objects.create(
                        user=None,
                        full_name=serializer.validated_data['full_name'],
                        phone=serializer.validated_data.get('phone') or serializer.validated_data.get('guest_phone') or '',
                        address_line1=serializer.validated_data['address_line1'],
                        address_line2=serializer.validated_data.get('address_line2', ''),
                        city=serializer.validated_data['city'],
                        state=serializer.validated_data['state'],
                        postal_code=serializer.validated_data['postal_code'],
                        country=serializer.validated_data.get('country') or 'Iran',
                    )
                else:
                    shipping_address = get_object_or_404(
                        ShippingAddress,
                        id=serializer.validated_data['shipping_address_id'],
                        user=request.user,
                    )

                site_settings = SiteSettings.load()
                shipping_cost = site_settings.calculate_shipping(subtotal)
                discount = Decimal('0')
                coupon = None
                redemption = None
                if coupon_code:
                    coupon = Coupon.objects.select_for_update().filter(
                        code=coupon_code, is_active=True,
                    ).first()
                    if coupon is None:
                        return Response(
                            {'error': 'کد تخفیف نامعتبر است.'},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    valid, msg = coupon.is_valid(
                        user=request.user if not is_guest else None,
                        subtotal=subtotal,
                    )
                    if not valid:
                        return Response({'error': msg}, status=status.HTTP_400_BAD_REQUEST)
                    discount = coupon.apply_discount(subtotal)

                if loyalty_redemption_code:
                    if is_guest:
                        return Response({'error': 'Loyalty rewards require an authenticated account.'}, status=status.HTTP_400_BAD_REQUEST)
                    from loyalty.models import LoyaltyRedemption
                    from loyalty.services import RedemptionError, redemption_discount_and_shipping
                    redemption = LoyaltyRedemption.objects.select_for_update().filter(
                        redemption_code=loyalty_redemption_code,
                        user=request.user,
                        status=LoyaltyRedemption.STATUS_AVAILABLE,
                    ).first()
                    if redemption is None:
                        return Response({'error': 'This loyalty reward is not available.'}, status=status.HTTP_400_BAD_REQUEST)
                    try:
                        loyalty_discount, shipping_cost = redemption_discount_and_shipping(
                            redemption, subtotal=subtotal, shipping_cost=shipping_cost,
                        )
                    except RedemptionError as exc:
                        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
                    discount += loyalty_discount

                total = max(subtotal + shipping_cost - discount, Decimal('0'))
                order = Order.objects.create(
                    user=request.user if not is_guest else None,
                    guest_email=serializer.validated_data.get('guest_email') if is_guest else None,
                    guest_phone=serializer.validated_data.get('guest_phone') if is_guest else None,
                    guest_session_id=session_id if is_guest else None,
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
                    coupon=coupon,
                )

                if redemption:
                    from loyalty.services import reserve_redemption_for_order
                    reserve_redemption_for_order(
                        redemption_code=redemption.redemption_code,
                        user=request.user,
                        order=order,
                        subtotal=subtotal,
                        shipping_cost=shipping_cost,
                    )

                for item_data in order_items_data:
                    OrderItem.objects.create(order=order, **item_data)

                # The locked, aggregated validation above should make this
                # succeed. Keep the conditional updates as a final safeguard.
                reserve_inventory(order)

                # Hold the coupon until this order is paid or released.
                if coupon:
                    if not is_guest:
                        CouponUsage.objects.create(coupon=coupon, user=request.user, order=order)
                    Coupon.objects.filter(id=coupon.id).update(used_count=F('used_count') + 1)

                # Delete only the snapshot consumed by this order. A new item
                # inserted after checkout began must remain in the cart.
                CartItem.objects.filter(
                    pk__in=[item.pk for item in cart_items],
                    cart=locked_cart,
                ).delete()
        except ValueError as inventory_error:
            logger.warning('[order_inventory_conflict] error=%s', inventory_error)
            return Response(
                {'error': 'موجودی یکی از محصولات تغییر کرده است. لطفاً سبد خرید را بررسی کنید.'},
                status=status.HTTP_409_CONFLICT,
            )

        customer = request.user.username if not is_guest else (order.guest_email or 'مهمان')
        user_id = request.user.id if not is_guest else None
        log_order_created(order.id, order.order_number, user_id, total, len(order_items_data))
        log_inventory_reserved(order.id, len(order_items_data))
        logger.info(
            '[order_created] order_id=%d order_number=%s user=%s total=%s items=%d',
            order.id, order.order_number, customer, total, len(order_items_data),
        )

        # Queue background task for order confirmation email
        try:
            from django_q.tasks import async_task
            async_task(
                'orders.tasks.send_order_confirmation_email',
                order.id,
                priority=1,  # High priority for order confirmation
            )
            logger.info('[email_task_queued] order=%s task=send_order_confirmation_email', order.order_number)
        except Exception as e:
            # Fallback to direct email sending if task queue fails
            logger.error('[email_task_queue_error] order=%s error=%s, falling back to direct send',
                       order.order_number, e)
            try:
                from shop.email_service import send_order_confirmation
                send_order_confirmation(order)
            except Exception as e2:
                logger.error('[email_send_error] order=%s error=%s', order.order_number, e2)

        return Response(
            OrderSerializer(order).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_order(self, request, pk=None):
        with transaction.atomic():
            order = Order.objects.select_for_update().filter(
                pk=pk, user=request.user,
            ).first()
            if not order:
                return Response({'error': 'سفارش یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
            if order.payment_status == 'paid':
                return Response(
                    {'error': 'لغو سفارش پرداخت‌شده نیازمند بازپرداخت تأییدشده توسط پشتیبانی است.'},
                    status=status.HTTP_409_CONFLICT,
                )
            if order.status not in ('pending_payment', 'pending', 'processing'):
                return Response(
                    {'error': 'این سفارش دیگر قابل لغو نیست.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            old_status = order.status
            if order.status == 'pending_payment':
                release_inventory(order)
                release_coupon_hold(order)
                from loyalty.services import release_redemption_for_order
                release_redemption_for_order(order=order)
                log_inventory_released(order.id, order.items.count(), reason='order_cancelled')

            order.status = 'cancelled'
            order.save(update_fields=['status', 'payment_status', 'updated_at'])

        log_order_cancelled(order.id, order.order_number, request.user.id)
        logger.info(
            '[order_cancelled] order_id=%d order_number=%s user=%s',
            order.id, order.order_number, request.user.username,
        )

        # Queue background task for order status update email
        try:
            from django_q.tasks import async_task
            async_task(
                'orders.tasks.send_order_status_update_email',
                order.id,
                old_status,
                priority=1,  # High priority for status updates
            )
            logger.info('[email_task_queued] order=%s task=send_order_status_update_email', order.order_number)
        except Exception as e:
            # Fallback to direct email sending if task queue fails
            logger.error('[email_task_queue_error] order=%s error=%s, falling back to direct send',
                       order.order_number, e)
            try:
                from shop.email_service import send_order_status_update
                send_order_status_update(order, old_status)
            except Exception as e2:
                logger.error('[email_send_error] order=%s error=%s', order.order_number, e2)

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
