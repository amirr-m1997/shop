from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from .models import Cart, CartItem
from .serializers import CartSerializer, CartItemSerializer, AddToCartSerializer, UpdateCartItemSerializer
from products.models import Product, ProductVariant


class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user)

    def get_object(self):
        cart, created = Cart.objects.get_or_create(user=self.request.user)
        return cart

    def list(self, request, *args, **kwargs):
        cart = self.get_object()
        serializer = self.get_serializer(cart)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        cart = self.get_object()
        serializer = self.get_serializer(cart)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def add_item(self, request):
        serializer = AddToCartSerializer(data=request.data)
        if serializer.is_valid():
            product_id = serializer.validated_data['product_id']
            variant_id = serializer.validated_data.get('variant_id')
            quantity = serializer.validated_data['quantity']

            try:
                product = Product.objects.get(id=product_id, is_active=True)
                variant = None
                if variant_id:
                    variant = ProductVariant.objects.get(id=variant_id, product=product)

                cart = self.get_object()

                cart_item, created = CartItem.objects.get_or_create(
                    cart=cart,
                    product=product,
                    variant=variant,
                    defaults={'quantity': quantity}
                )

                if not created:
                    cart_item.quantity += quantity
                    cart_item.save()

                return Response(CartSerializer(cart).data, status=status.HTTP_201_CREATED)

            except (Product.DoesNotExist, ProductVariant.DoesNotExist):
                return Response({'error': 'محصول یا واریانت مورد نظر یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['put', 'patch'])
    def update_item(self, request):
        serializer = UpdateCartItemSerializer(data=request.data)
        if serializer.is_valid():
            item_id = request.data.get('item_id')
            quantity = serializer.validated_data['quantity']

            if quantity < 1:
                return Response({'error': 'تعداد باید حداقل ۱ باشد'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                cart_item = CartItem.objects.get(id=item_id, cart__user=request.user)
                cart_item.quantity = quantity
                cart_item.save()
                cart = self.get_object()
                return Response(CartSerializer(cart).data)
            except CartItem.DoesNotExist:
                return Response({'error': 'Cart item not found'}, status=status.HTTP_404_NOT_FOUND)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['delete'])
    def remove_item(self, request):
        item_id = request.data.get('item_id')
        try:
            cart_item = CartItem.objects.get(id=item_id, cart__user=request.user)
            cart_item.delete()
            cart = self.get_object()
            return Response(CartSerializer(cart).data)
        except CartItem.DoesNotExist:
            return Response({'error': 'Cart item not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['delete'])
    def clear(self, request):
        cart = self.get_object()
        cart.items.all().delete()
        return Response(CartSerializer(cart).data)
