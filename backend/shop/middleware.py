"""
Security headers middleware.

Adds production-ready HTTP security headers to all responses.
Compatible with DRF API responses and Django template responses.
"""
import logging
import time
import uuid

from django.conf import settings
from shop.observability import (
    clear_request_context, get_request_context, set_request_context,
)
from shop.client_ip import get_client_ip

logger = logging.getLogger('django.request')
app_logger = logging.getLogger('application')


class RequestLoggingMiddleware:
    """
    Logs every incoming request and response with timing, user context,
    and a unique request ID for distributed tracing.

    Sets request context variables used by all structured loggers
    downstream.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = request.META.get('HTTP_X_REQUEST_ID', '') or uuid.uuid4().hex[:16]
        request._request_id = request_id

        ip = get_client_ip(request)

        user_str = 'anonymous'
        if hasattr(request, 'user') and request.user.is_authenticated:
            user_str = request.user.username

        set_request_context(
            request_id=request_id,
            user=user_str,
            ip=ip,
            path=request.path,
            method=request.method,
        )

        start = time.monotonic()
        response = None
        try:
            response = self.get_response(request)
        except Exception:
            # Re-raise after logging — don't swallow exceptions
            elapsed_ms = (time.monotonic() - start) * 1000
            logger.error(
                '[request_error] request_id=%s %s %s path=%s user=%s ip=%s elapsed=%.1fms',
                request_id, request.method, '500',
                request.path, user_str, ip, elapsed_ms,
            )
            raise
        finally:
            elapsed_ms = (time.monotonic() - start) * 1000

            # DRF authentication occurs inside the view; refresh for the final
            # request log after it has populated the underlying HttpRequest.
            resolved_user = getattr(request, 'user', None)
            if resolved_user is not None and resolved_user.is_authenticated:
                user_str = resolved_user.username
            else:
                # Login authenticates inside its view, so DRF does not attach
                # that user to this request. The view refreshes log context.
                context_user = get_request_context()['user']
                if context_user != 'anonymous':
                    user_str = context_user

            response_status = getattr(response, 'status_code', 500)

            # Add request ID to response header
            if response is not None:
                response['X-Request-ID'] = request_id

            # Log at appropriate level based on status code
            log_data = (
                '[request] request_id=%s %s %s path=%s user=%s ip=%s elapsed=%.1fms'
            )
            log_args = (log_data % (request_id, request.method, response_status,
                                    request.path, user_str, ip, elapsed_ms))

            if response_status >= 500:
                logger.error(log_args)
            elif response_status >= 400:
                logger.warning(log_args)
            elif request.method != 'OPTIONS':
                app_logger.info(log_args)

            clear_request_context()

        return response


class SecurityHeadersMiddleware:
    """
    Injects security headers into every HTTP response.

    Headers implemented:
    - X-Content-Type-Options: nosniff
    - X-Frame-Options: DENY
    - Referrer-Policy: strict-origin-when-cross-origin
    - Permissions-Policy: restrictive
    - X-XSS-Protection: 0 (disabled — CSP is the modern replacement)
    - Content-Security-Policy: basic policy
    - Strict-Transport-Security: only when HTTPS is enabled
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        self._add_headers(response, request)
        return response

    def _add_headers(self, response, request=None):
        # Prevent MIME type sniffing
        response['X-Content-Type-Options'] = 'nosniff'

        # Prevent clickjacking
        response['X-Frame-Options'] = 'DENY'

        # Control referrer information
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        # Restrictive permissions policy
        response['Permissions-Policy'] = (
            'accelerometer=(), '
            'camera=(), '
            'geolocation=(), '
            'gyroscope=(), '
            'magnetometer=(), '
            'microphone=(), '
            'payment=(), '
            'usb=(), '
            'interest-cohort=()'
        )

        # Disable legacy XSS protection (CSP replaces it)
        response['X-XSS-Protection'] = '0'

        # Content Security Policy — basic policy for API responses
        # Admin UI (unfold) ships Alpine.js which requires 'unsafe-eval',
        # so relax script-src only on /admin/ paths.
        is_admin = request is not None and request.path.startswith('/admin/')
        if is_admin:
            csp_parts = [
                "default-src 'self'",
                "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
                "style-src 'self' 'unsafe-inline' https:",
                "img-src 'self' data: https:",
                "font-src 'self' https: data:",
                "connect-src 'self' https:",
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'",
            ]
        else:
            csp_parts = [
                "default-src 'self'",
                "script-src 'self'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data: https:",
                "font-src 'self'",
                "connect-src 'self'",
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'",
            ]
        response['Content-Security-Policy'] = '; '.join(csp_parts)

        # HSTS — only when HTTPS is explicitly enabled
        if getattr(settings, 'SECURE_HSTS_SECONDS', 0):
            response['Strict-Transport-Security'] = (
                f'max-age={settings.SECURE_HSTS_SECONDS}'
                f'{"; includeSubDomains" if getattr(settings, "SECURE_HSTS_INCLUDE_SUBDOMAINS", False) else ""}'
                f'{"; preload" if getattr(settings, "SECURE_HSTS_PRELOAD", False) else ""}'
            )

        return response
