from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Cart, CartItem
from .serializers import CartSerializer, AddToCartSerializer, UpdateCartItemSerializer
from products.models import Product, ProductVariant


class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user).prefetch_related(
            'items__product', 'items__variant',
            'items__product__images',
            'items__variant__size',
            'items__variant__color',
        )

    def get_object(self):
        cart, _created = Cart.objects.get_or_create(user=self.request.user)
        # همیشه از DB تازه بخوان تا بعد از add/update cache قدیمی prefetch نماند
        return Cart.objects.prefetch_related(
            'items__product', 'items__variant',
            'items__product__images',
            'items__variant__size',
            'items__variant__color',
        ).get(id=cart.id)

    def list(self, request, *args, **kwargs):
        cart = self.get_object()
        serializer = self.get_serializer(cart)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        cart = self.get_object()
        serializer = self.get_serializer(cart)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def _serialized_cart(self):
        """سبد تازه از DB (بعد از هر تغییر)."""
        cart = self.get_object()
        return CartSerializer(cart, context={'request': self.request}).data

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

            cart, _ = Cart.objects.get_or_create(user=request.user)

            cart_item, created = CartItem.objects.get_or_create(
                cart=cart,
                product=product,
                variant=variant,
                defaults={'quantity': quantity},
            )

            if not created:
                cart_item.quantity += quantity
                cart_item.save(update_fields=['quantity'])

            # مهم: دوباره از DB بخوان — prefetch قبلی آیتم جدید را ندارد
            return Response(self._serialized_cart(), status=status.HTTP_201_CREATED)

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
        quantity = serializer.validated_data['quantity']

        if quantity < 1:
            return Response(
                {'error': 'تعداد باید حداقل ۱ باشد'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            cart_item = CartItem.objects.get(id=item_id, cart__user=request.user)
            cart_item.quantity = quantity
            cart_item.save(update_fields=['quantity'])
            return Response(self._serialized_cart())
        except CartItem.DoesNotExist:
            return Response({'error': 'Cart item not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['delete'])
    def remove_item(self, request):
        item_id = request.data.get('item_id')
        try:
            cart_item = CartItem.objects.get(id=item_id, cart__user=request.user)
            cart_item.delete()
            return Response(self._serialized_cart())
        except CartItem.DoesNotExist:
            return Response({'error': 'Cart item not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['delete'])
    def clear(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        cart.items.all().delete()
        return Response(self._serialized_cart())
