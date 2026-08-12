"""
Custom DRF exception handler.

Provides consistent JSON responses for throttling, lockout,
and other security-related errors. Logs all unhandled exceptions
with full context for debugging.
"""
import logging
from rest_framework.views import exception_handler
from rest_framework.exceptions import Throttled
from rest_framework.response import Response
from rest_framework import status

from shop.observability import log_exception, log_event

logger = logging.getLogger('api')


def custom_exception_handler(exc, context):
    """
    Handle throttled exceptions with proper 429 responses
    and add lockout information when applicable.

    Logs all unhandled exceptions with full context.
    """
    response = exception_handler(exc, context)

    if isinstance(exc, Throttled):
        wait = int(exc.wait) if exc.wait else 60
        response = Response(
            {
                'error': 'تعداد درخواست‌ها بیش از حد مجاز است.',
                'detail': f'لطفاً {wait} ثانیه صبر کنید.',
                'retry_after': wait,
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )
        response['Retry-After'] = str(wait)

        # Log rate limit event
        log_event('security', 'warning', 'rate_limit_throttled',
                  endpoint=context.get('view', ''),
                  retry_after=wait)
        return response

    # Log any unhandled exception that DRF doesn't catch
    if response is None:
        # This is an unhandled exception — log it with full context
        request = context.get('request')
        view = context.get('view')
        log_exception(
            'api',
            exc,
            context={
                'view': str(view) if view else None,
                'view_class': type(view).__name__ if view else None,
                'status_code': getattr(response, 'status_code', 500) if response else 500,
            },
        )

    return response
