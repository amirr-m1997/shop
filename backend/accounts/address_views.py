from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from orders.models import ShippingAddress
from orders.serializers import ShippingAddressSerializer


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def shipping_address_list_view(request):
    if request.method == 'GET':
        addresses = ShippingAddress.objects.filter(user=request.user)
        serializer = ShippingAddressSerializer(addresses, many=True)
        return Response(serializer.data)

    serializer = ShippingAddressSerializer(data=request.data)
    if serializer.is_valid():
        if serializer.validated_data.get('is_default'):
            ShippingAddress.objects.filter(
                user=request.user, is_default=True
            ).update(is_default=False)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def shipping_address_detail_view(request, pk):
    try:
        address = ShippingAddress.objects.get(id=pk, user=request.user)
    except ShippingAddress.DoesNotExist:
        return Response({'error': 'آدرس یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = ShippingAddressSerializer(address)
        return Response(serializer.data)

    if request.method == 'DELETE':
        address.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = ShippingAddressSerializer(address, data=request.data, partial=True)
    if serializer.is_valid():
        if serializer.validated_data.get('is_default'):
            ShippingAddress.objects.filter(
                user=request.user, is_default=True
            ).exclude(id=address.id).update(is_default=False)
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

