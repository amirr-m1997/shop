from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ShippingAddressViewSet, OrderViewSet

router = DefaultRouter()
router.register(r'shipping-addresses', ShippingAddressViewSet, basename='shippingaddress')
router.register(r'orders', OrderViewSet, basename='order')

urlpatterns = [
    path('', include(router.urls)),
]
