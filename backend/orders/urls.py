from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ShippingAddressViewSet, OrderViewSet, WelcomeOfferViewSet

router = DefaultRouter()
router.register(r'shipping-addresses', ShippingAddressViewSet, basename='shippingaddress')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'welcome-offer', WelcomeOfferViewSet, basename='welcomeoffer')

urlpatterns = [
    path('', include(router.urls)),
]
