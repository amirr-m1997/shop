from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from decimal import Decimal
from .models import Cart, CartItem
from .serializers import CartSerializer, AddToCartSerializer, UpdateCartItemSerializer
from .services import get_or_create_cart, apply_session_header
from products.models import Product, ProductVariant
from orders.models import Coupon
from personalization.models import EventType
from personalization.services import record_behavior


def _cart_qs():
    return Cart.objects.prefetch_related(
        'items__product', 'items__variant',
        'items__product__images',
        'items__variant__size',
        'items__variant__color',
    )


class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer

    def get_queryset(self):
        cart, _ = get_or_create_cart(self.request)
        return _cart_qs().filter(id=cart.id)

    def get_object(self):
        cart, _ = get_or_create_cart(self.request)
        # همیشه از DB تازه بخوان تا بعد از add/update cache قدیمی prefetch نماند
        return _cart_qs().get(id=cart.id)

    def _serialized_cart(self, status_code=status.HTTP_200_OK):
        """سبد تازه از DB (بعد از هر تغییر)."""
        cart, session_id = get_or_create_cart(self.request)
        serializer = CartSerializer(cart, context={'request': self.request})
        response = Response(serializer.data, status=status_code)
        return apply_session_header(response, session_id)

    def list(self, request, *args, **kwargs):
        cart, session_id = get_or_create_cart(request)
        serializer = self.get_serializer(cart)
        return apply_session_header(Response(serializer.data), session_id)

    def create(self, request, *args, **kwargs):
        cart, session_id = get_or_create_cart(request)
        serializer = self.get_serializer(cart)
        response = Response(serializer.data, status=status.HTTP_201_CREATED)
        return apply_session_header(response, session_id)

    @action(detail=False, methods=['post'])
    def add_item(self, request):
        serializer = AddToCartSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        product_id = serializer.validated_data['product_id']
        variant_id = serializer.validated_data.get('variant_id')
        quantity = serializer.validated_data['quantity']

        try:
            product = Product.objects.get(id=product_id, is_active=True)
            variant = None
            if variant_id:
                variant = ProductVariant.objects.get(id=variant_id, product=product)

            cart, _ = get_or_create_cart(request)

            # Check stock
            available = variant.effective_stock if variant else product.stock
            existing_qty = 0
            existing_item = cart.items.filter(product=product, variant=variant).first()
            if existing_item:
                existing_qty = existing_item.quantity
            total_requested = existing_qty + quantity
            if total_requested > available:
                return Response(
                    {'error': f'موجودی کافی نیست. حداکثر {max(0, available - existing_qty)} عدد می‌توانید اضافه کنید.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            cart_item, created = CartItem.objects.get_or_create(
                cart=cart,
                product=product,
                variant=variant,
                defaults={'quantity': quantity},
            )

            if not created:
                cart_item.quantity += quantity
                cart_item.save(update_fields=['quantity'])

            record_behavior(
                user=request.user,
                event_type=EventType.CART_ADD,
                product=product,
                source='cart_add',
                metadata={'quantity': quantity, 'variant_id': variant_id},
            )

            # مهم: دوباره از DB بخوان — prefetch قبلی آیتم جدید را ندارد
            return self._serialized_cart(status_code=status.HTTP_201_CREATED)

        except (Product.DoesNotExist, ProductVariant.DoesNotExist):
            return Response(
                {'error': 'محصول یا واریانت مورد نظر یافت نشد'},
                status=status.HTTP_404_NOT_FOUND,
            )

    @action(detail=False, methods=['put', 'patch'])
    def update_item(self, request):
        serializer = UpdateCartItemSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        item_id = request.data.get('item_id')
        if not item_id:
            return Response(
                {'error': 'شناسه آیتم سبد الزامی است'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        quantity = serializer.validated_data['quantity']

        if quantity < 1:
            return Response(
                {'error': 'تعداد باید حداقل ۱ باشد'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cart, _ = get_or_create_cart(request)
        try:
            cart_item = CartItem.objects.get(id=item_id, cart=cart)
            available = cart_item.variant.effective_stock if cart_item.variant else cart_item.product.stock
            if quantity > available:
                return Response(
                    {'error': f'موجودی کافی نیست. حداکثر {available} عدد می‌توانید انتخاب کنید.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            cart_item.quantity = quantity
            cart_item.save(update_fields=['quantity'])
            return self._serialized_cart()
        except CartItem.DoesNotExist:
            return Response({'error': 'Cart item not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['delete'])
    def remove_item(self, request):
        item_id = request.query_params.get('item_id') or request.data.get('item_id')
        if not item_id:
            return Response(
                {'error': 'شناسه آیتم سبد الزامی است'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cart, _ = get_or_create_cart(request)
        try:
            cart_item = CartItem.objects.get(id=item_id, cart=cart)
            record_behavior(
                user=request.user,
                event_type=EventType.CART_REMOVE,
                product=cart_item.product,
                source='cart_remove',
                idempotency_key=f'cart-remove:{cart_item.pk}',
                metadata={'cart_item_id': cart_item.pk},
            )
            cart_item.delete()
            return self._serialized_cart()
        except CartItem.DoesNotExist:
            return Response({'error': 'Cart item not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['delete'])
    def clear(self, request):
        cart, _ = get_or_create_cart(request)
        cart.items.all().delete()
        return self._serialized_cart()

    @action(detail=False, methods=['post'])
    def apply_coupon(self, request):
        from accounts.throttles import CouponThrottle
        throttle = CouponThrottle()
        if not throttle.allow_request(request, self):
            from rest_framework.response import Response as DRFResponse
            from rest_framework import status as drf_status
            return DRFResponse(
                {'error': 'تعداد درخواست‌ها بیش از حد مجاز است.'},
                status=drf_status.HTTP_429_TOO_MANY_REQUESTS,
            )
        code = request.data.get('code', '').strip()
        if not code:
            return Response({'error': 'کد تخفیف را وارد کنید.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            coupon = Coupon.objects.get(code=code, is_active=True)
        except Coupon.DoesNotExist:
            return Response({'error': 'کد تخفیف نامعتبر است.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user if request.user.is_authenticated else None
        valid, msg = coupon.is_valid(user=user)
        if not valid:
            return Response({'error': msg}, status=status.HTTP_400_BAD_REQUEST)

        cart = self.get_object()
        subtotal = cart.total_price

        if coupon.min_amount is not None and subtotal < coupon.min_amount:
            return Response(
                {'error': f'حداقل مبلغ سفارش برای این کوپن {coupon.min_amount:,.0f} تومان است.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        discount = coupon.apply_discount(subtotal)

        return Response({
            'valid': True,
            'code': coupon.code,
            'discount_type': coupon.discount_type,
            'discount_value': str(coupon.value),
            'discount_amount': str(discount),
            'description': f'{"٪" + str(coupon.value) if coupon.discount_type == "percentage" else str(coupon.value) + " تومان"} تخفیف',
        })
