"""
Security headers middleware.

Adds production-ready HTTP security headers to all responses.
Compatible with DRF API responses and Django template responses.
"""
import logging
import time
import uuid

from django.conf import settings
from shop.observability import set_request_context, clear_request_context

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

        ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
        if not ip:
            ip = request.META.get('REMOTE_ADDR', 'unknown')

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
        self._add_headers(response)
        return response

    def _add_headers(self, response):
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
        # Adjust for your frontend domain when deploying
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
