from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PaymentViewSet, initiate_payment,
    payment_verify_callback, payment_status,
)

router = DefaultRouter()
router.register(r'payments', PaymentViewSet, basename='payment')

urlpatterns = [
    path('', include(router.urls)),
    path('initiate/', initiate_payment, name='initiate-payment'),
    path('verify/', payment_verify_callback, name='payment-verify'),
    path('<int:payment_id>/status/', payment_status, name='payment-status'),
]
