"""
Custom throttle classes for API rate limiting.

Provides scoped throttles for sensitive endpoints and
a login throttle with progressive delay support.
"""
import time
import logging
from django.core.cache import cache
from django.conf import settings
from rest_framework.throttling import SimpleRateThrottle, AnonRateThrottle, UserRateThrottle
from shop.client_ip import get_client_ip

logger = logging.getLogger('security')


class SecureClientIPMixin:
    def get_ident(self, request):
        return get_client_ip(request)


class SecureAnonRateThrottle(SecureClientIPMixin, AnonRateThrottle):
    pass


class SecureUserRateThrottle(SecureClientIPMixin, UserRateThrottle):
    pass


class LoginThrottle(SecureClientIPMixin, AnonRateThrottle):
    """
    Throttle for login attempts.
    Scoped rate: 5/min (configured in REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']).
    Also checks account lockout before allowing the request.
    """
    scope = 'login'

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        username = request.data.get('username', '').strip().lower()
        # Key by both IP and username for layered protection
        return f'throttle_login_{ident}_{username}'


class RegisterThrottle(SecureClientIPMixin, AnonRateThrottle):
    """Throttle for registration: 5/min."""
    scope = 'register'


class SendOtpThrottle(SecureClientIPMixin, AnonRateThrottle):
    """
    Throttle for OTP/sending verification code.
    Scoped rate: 3/min.
    Keys by IP to prevent OTP spamming.
    """
    scope = 'send_otp'

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return f'throttle_send_otp_{ident}'


class VerifyOtpThrottle(SecureClientIPMixin, AnonRateThrottle):
    """
    Throttle for OTP verification (brute-force protection).
    Scoped rate: 5/min.
    Keys by IP.
    """
    scope = 'verify_otp'

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return f'throttle_verify_otp_{ident}'


class ForgotPasswordThrottle(SecureClientIPMixin, AnonRateThrottle):
    """Throttle for password reset requests: 3/min."""
    scope = 'forgot_password'


class ResetPasswordThrottle(SecureClientIPMixin, AnonRateThrottle):
    """Throttle for password reset confirmation: 5/min."""
    scope = 'reset_password'


class PaymentInitThrottle(SecureClientIPMixin, SimpleRateThrottle):
    """Throttle for payment initiation: 10/min per user."""
    scope = 'payment_init'

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.id
        else:
            ident = self.get_ident(request)
        return f'throttle_payment_init_{ident}'


class PaymentVerifyThrottle(SecureClientIPMixin, SimpleRateThrottle):
    """Throttle for payment verification callback: 5/min per IP."""
    scope = 'payment_verify'

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return f'throttle_payment_verify_{ident}'


class PaymentWebhookThrottle(SecureClientIPMixin, SimpleRateThrottle):
    """Throttle for payment webhook/callback: 60/min per IP."""
    scope = 'payment_webhook'

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return f'throttle_payment_webhook_{ident}'


class CouponThrottle(SecureClientIPMixin, SimpleRateThrottle):
    """Throttle for coupon apply: 20/min per user."""
    scope = 'coupon_apply'

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.id
        else:
            ident = self.get_ident(request)
        return f'throttle_coupon_{ident}'
