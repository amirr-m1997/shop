"""
Production-grade structured logging utilities.

Provides:
- Request context (request_id, user, IP, method, path)
- Structured log formatting for JSON or plain-text
- Sensitive field scrubbing
- Exception logging with full context
- External service failure logging

All loggers use Python's standard logging module and are
compatible with Django's LOGGING configuration.
"""
import logging
import traceback
import uuid
import re
from contextvars import ContextVar
from functools import wraps

# ─── Request Context (thread-local via contextvars) ────────

_request_id_var: ContextVar[str] = ContextVar('request_id', default='')
_user_var: ContextVar[str] = ContextVar('log_user', default='anonymous')
_ip_var: ContextVar[str] = ContextVar('log_ip', default='')
_path_var: ContextVar[str] = ContextVar('log_path', default='')
_method_var: ContextVar[str] = ContextVar('log_method', default='')


def set_request_context(request_id=None, user='anonymous', ip='', path='', method=''):
    """Set request context for the current request."""
    _request_id_var.set(request_id or '')
    _user_var.set(user or 'anonymous')
    _ip_var.set(ip or '')
    _path_var.set(path or '')
    _method_var.set(method or '')


def get_request_context() -> dict:
    """Get current request context as a dict."""
    return {
        'request_id': _request_id_var.get(''),
        'user': _user_var.get('anonymous'),
        'ip': _ip_var.get(''),
        'path': _path_var.get(''),
        'method': _method_var.get(''),
    }


def set_authenticated_user_context(username):
    """Refresh the context once DRF token/cookie authentication completes."""
    _user_var.set(username or 'anonymous')


def clear_request_context():
    """Clear all request context variables."""
    _request_id_var.set('')
    _user_var.set('anonymous')
    _ip_var.set('')
    _path_var.set('')
    _method_var.set('')


# ─── Sensitive Field Scrubbing ─────────────────────────────

SENSITIVE_FIELDS = {
    'password', 'passwd', 'pwd', 'secret', 'token', 'api_key',
    'apikey', 'access_token', 'refresh_token', 'authorization',
    'credit_card', 'card_number', 'cvv', 'cvv2', 'ccv',
    'ssn', 'social_security', 'pin', 'otp', 'code',
    'merchant_id', 'private_key', 'secret_key',
}

SENSITIVE_PATTERNS = [
    re.compile(r'(password|passwd|pwd|secret|token|api[_-]?key|access[_-]?token|refresh[_-]?token)', re.I),
    re.compile(r'(card[_-]?number|cvv|cvv2|ccv|ssn|pin)', re.I),
]

MASK_VALUE = '***'


def scrub_sensitive(data: dict) -> dict:
    """
    Return a copy of `data` with sensitive fields masked.
    Only operates on dict keys; never touches values of non-sensitive fields.
    """
    if not isinstance(data, dict):
        return data

    scrubbed = {}
    for key, value in data.items():
        key_lower = key.lower()
        is_sensitive = key_lower in SENSITIVE_FIELDS or any(
            p.search(key_lower) for p in SENSITIVE_PATTERNS
        )
        if is_sensitive:
            scrubbed[key] = MASK_VALUE
        elif isinstance(value, dict):
            scrubbed[key] = scrub_sensitive(value)
        elif isinstance(value, list):
            scrubbed[key] = [
                scrub_sensitive(item) if isinstance(item, dict) else item
                for item in value
            ]
        else:
            scrubbed[key] = value
    return scrubbed


# ─── Structured Logging Helpers ────────────────────────────

def log_event(logger_name: str, level: str, event: str, **extra):
    """
    Log a structured event with request context automatically attached.

    Usage:
        log_event('payment', 'info', 'payment_initiated', order_id=order.id, amount=amount)
    """
    logger = logging.getLogger(logger_name)
    ctx = get_request_context()
    log_data = {
        'event': event,
        **ctx,
        **extra,
    }
    # Scrub sensitive fields from extra data only
    log_data['extra'] = scrub_sensitive({k: v for k, v in log_data.items() if k not in ('event', 'request_id', 'user', 'ip', 'path', 'method')})
    # Remove the keys we just moved into extra
    for k in list(log_data.keys()):
        if k not in ('event', 'request_id', 'user', 'ip', 'path', 'method', 'extra'):
            del log_data[k]

    message = f'[{event}] request_id={ctx["request_id"]} user={ctx["user"]} ip={ctx["ip"]}'
    if extra:
        extra_str = ' '.join(f'{k}={v}' for k, v in log_data.get('extra', {}).items())
        message += f' {extra_str}'

    getattr(logger, level)(message, extra=log_data, stack_info=False)


def log_exception(logger_name: str, exc: Exception, context: dict = None):
    """
    Log an exception with full context: timestamp, request path, user, IP,
    exception type, message, and stack trace.

    Never exposes raw stack traces to API clients.
    """
    logger = logging.getLogger(logger_name)
    ctx = get_request_context()

    exc_type = type(exc).__name__
    exc_msg = str(exc)
    tb = traceback.format_exception(type(exc), exc, exc.__traceback__)
    tb_str = ''.join(tb)

    log_data = {
        'event': 'exception',
        'exception_type': exc_type,
        'exception_message': exc_msg,
        'stack_trace': tb_str,
        **ctx,
    }
    if context:
        log_data['context'] = scrub_sensitive(context)

    message = (
        f'[exception] request_id={ctx["request_id"]} '
        f'user={ctx["user"]} ip={ctx["ip"]} '
        f'path={ctx["method"]} {ctx["path"]} '
        f'exception={exc_type}: {exc_msg}'
    )
    logger.error(message, extra=log_data, exc_info=True)


def log_external_service_failure(
    logger_name: str,
    service: str,
    operation: str,
    error: Exception = None,
    response_code: int = None,
    response_body: str = None,
    **extra,
):
    """
    Log a failure from an external service (payment gateway, SMS, email, Redis, etc.).

    Args:
        logger_name: Logger category (e.g., 'payment', 'api')
        service: Service name (e.g., 'zarinpal', 'smtp', 'redis')
        operation: Operation that failed (e.g., 'initiate_payment', 'send_email')
        error: The exception that occurred (if any)
        response_code: HTTP status code from the service (if available)
        response_body: Response body (scrubbed before logging)
    """
    logger = logging.getLogger(logger_name)
    ctx = get_request_context()

    log_data = {
        'event': 'external_service_failure',
        'service': service,
        'operation': operation,
        'response_code': response_code,
        **ctx,
        **extra,
    }
    if response_body:
        log_data['response_body'] = str(response_body)[:500]  # Truncate long responses
    if error:
        log_data['error_type'] = type(error).__name__
        log_data['error_message'] = str(error)[:500]

    message = (
        f'[external_service_failure] service={service} operation={operation} '
        f'response_code={response_code} '
    )
    if error:
        message += f'error={type(error).__name__}: {str(error)[:200]} '
    message += f'request_id={ctx["request_id"]} user={ctx["user"]} ip={ctx["ip"]}'

    logger.error(message, extra=log_data, exc_info=error is not None)


# ─── Payment Logging ───────────────────────────────────────

def log_payment_initiation(payment_id, order_id, amount, user, ip):
    """Log payment initiation event."""
    log_event('payment', 'info', 'payment_initiated',
              payment_id=payment_id, order_id=order_id,
              amount=amount, user=user, ip=ip)


def log_payment_gateway_response(payment_id, code, authority=None, error=None):
    """Log payment gateway response."""
    extra = {'payment_id': payment_id, 'gateway_code': code}
    if authority:
        extra['authority'] = authority
    if error:
        extra['error'] = error
        log_event('payment', 'warning', 'payment_gateway_response', **extra)
    else:
        log_event('payment', 'info', 'payment_gateway_response', **extra)


def log_payment_verification(payment_id, order_id, result, ref_id=None):
    """Log payment verification result."""
    log_event('payment', 'info', 'payment_verified',
              payment_id=payment_id, order_id=order_id,
              result=result, ref_id=ref_id)


def log_payment_failure(payment_id, order_id, error_code, error_message):
    """Log payment failure."""
    log_event('payment', 'warning', 'payment_failed',
              payment_id=payment_id, order_id=order_id,
              error_code=error_code, error_message=error_message)


def log_payment_timeout(payment_id, order_id):
    """Log payment gateway timeout."""
    log_event('payment', 'error', 'payment_timeout',
              payment_id=payment_id, order_id=order_id)


def log_duplicate_callback(payment_id, order_id):
    """Log duplicate payment callback."""
    log_event('payment', 'warning', 'duplicate_callback',
              payment_id=payment_id, order_id=order_id)


# ─── Authentication Logging ────────────────────────────────

def log_auth_success(username, user_id, ip, method='login'):
    """Log successful authentication event."""
    log_event('authentication', 'info', f'{method}_success',
              username=username, user_id=user_id, ip=ip)


def log_auth_failure(username, ip, reason='invalid_credentials', fail_count=0):
    """Log failed authentication attempt."""
    log_event('authentication', 'warning', 'login_failure',
              username=username, ip=ip, reason=reason, fail_count=fail_count)


def log_auth_lockout(identifier, lock_type='account', duration=300):
    """Log account or IP lockout."""
    log_event('authentication', 'warning', 'account_lockout',
              identifier=identifier, lock_type=lock_type, duration=duration)


def log_otp_request(user_id, verify_type, ip, success=True):
    """Log OTP send request."""
    event = 'otp_sent' if success else 'otp_send_failed'
    log_event('authentication', 'info', event,
              user_id=user_id, verify_type=verify_type, ip=ip)


def log_otp_verification(user_id, verify_type, success, ip, fail_count=0):
    """Log OTP verification attempt."""
    event = 'otp_verified' if success else 'otp_verify_failure'
    level = 'info' if success else 'warning'
    log_event('authentication', level, event,
              user_id=user_id, verify_type=verify_type, ip=ip,
              fail_count=fail_count)


def log_password_reset(user_id, ip, method='request'):
    """Log password reset event."""
    log_event('authentication', 'info', f'password_reset_{method}',
              user_id=user_id, ip=ip)


# ─── Security Event Logging ────────────────────────────────

def log_rate_limit_violation(identifier, endpoint, limit, ip):
    """Log rate limit violation."""
    log_event('security', 'warning', 'rate_limit_violation',
              identifier=identifier, endpoint=endpoint,
              limit=limit, ip=ip)


def log_permission_denied(user_id, resource, action, ip):
    """Log permission denied event."""
    log_event('security', 'warning', 'permission_denied',
              user_id=user_id, resource=resource,
              action=action, ip=ip)


def log_suspicious_request(reason, ip, path, user_agent=''):
    """Log suspicious request."""
    log_event('security', 'warning', 'suspicious_request',
              reason=reason, ip=ip, path=path, user_agent=user_agent[:200])


def log_csrf_failure(request, reason=''):
    """Log CSRF failure."""
    log_event('security', 'warning', 'csrf_failure',
              reason=reason)


# ─── Order & Inventory Logging ─────────────────────────────

def log_order_created(order_id, order_number, user_id, total, items_count):
    """Log order creation."""
    log_event('orders', 'info', 'order_created',
              order_id=order_id, order_number=order_number,
              user_id=user_id, total=total, items_count=items_count)


def log_order_cancelled(order_id, order_number, user_id, reason=''):
    """Log order cancellation."""
    log_event('orders', 'info', 'order_cancelled',
              order_id=order_id, order_number=order_number,
              user_id=user_id, reason=reason)


def log_order_expired(order_id, order_number, user_id):
    """Log order expiration."""
    log_event('orders', 'info', 'order_expired',
              order_id=order_id, order_number=order_number,
              user_id=user_id)


def log_inventory_reserved(order_id, items_count):
    """Log inventory reservation."""
    log_event('inventory', 'info', 'inventory_reserved',
              order_id=order_id, items_count=items_count)


def log_inventory_released(order_id, items_count, reason=''):
    """Log inventory release."""
    log_event('inventory', 'info', 'inventory_released',
              order_id=order_id, items_count=items_count, reason=reason)


def log_inventory_insufficient(order_id, product_id, available, requested):
    """Log insufficient inventory."""
    log_event('inventory', 'warning', 'insufficient_inventory',
              order_id=order_id, product_id=product_id,
              available=available, requested=requested)


# ─── JSON Formatter ────────────────────────────────────────

class JsonFormatter(logging.Formatter):
    """
    Produces single-line JSON log records for structured log aggregation
    (ELK, Datadog, CloudWatch, etc.).

    Falls back to plain text if json module is unavailable.
    """
    def format(self, record):
        import json
        import datetime

        log_entry = {
            'timestamp': datetime.datetime.utcfromtimestamp(record.created).isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
        }

        # Attach request context if present in record
        ctx = get_request_context()
        if ctx.get('request_id'):
            log_entry['request_id'] = ctx['request_id']
        if ctx.get('user'):
            log_entry['user'] = ctx['user']
        if ctx.get('ip'):
            log_entry['ip'] = ctx['ip']

        # Attach extra fields
        if hasattr(record, 'event'):
            log_entry['event'] = record.event
        for key in ('payment_id', 'order_id', 'user_id', 'username', 'ip',
                     'reason', 'endpoint', 'limit', 'service', 'operation',
                     'response_code', 'error_type', 'error_message',
                     'gateway_code', 'ref_id', 'authority', 'fail_count',
                     'lock_type', 'duration', 'verify_type', 'resource',
                     'action', 'path', 'method', 'exception_type',
                     'exception_message', 'stack_trace', 'context',
                     'extra', 'user_agent', 'available', 'requested',
                     'product_id', 'items_count', 'order_number',
                     'total', 'amount', 'error_code', 'result'):
            if hasattr(record, key):
                log_entry[key] = getattr(record, key)

        # Attach exception info if present
        if record.exc_info and record.exc_info[0]:
            log_entry['exception'] = {
                'type': record.exc_info[0].__name__,
                'message': str(record.exc_info[1]),
                'traceback': self.formatException(record.exc_info),
            }

        try:
            return json.dumps(log_entry, default=str, ensure_ascii=False)
        except (TypeError, ValueError):
            return super().format(record)


# ─── Sentry Scrubbing ──────────────────────────────────────

def sentry_before_send(event, hint):
    """
    Scrub sensitive data before sending to Sentry.
    Called by Sentry SDK for every event.
    """
    # Scrub request data
    if 'request' in event:
        if 'headers' in event['request']:
            event['request']['headers'] = scrub_sensitive(event['request']['headers'])
        if 'data' in event['request']:
            event['request']['data'] = scrub_sensitive(event['request']['data'])

    # Scrub extra data
    if 'extra' in event:
        event['extra'] = scrub_sensitive(event['extra'])

    # Scrub user data — never send email/phone to Sentry
    if 'user' in event:
        safe_user = {
            'id': event['user'].get('id'),
            'ip_address': event['user'].get('ip_address'),
        }
        event['user'] = safe_user

    return event


def sentry_before_breadcrumb(breadcrumb, hint):
    """
    Scrub sensitive data from breadcrumbs before sending to Sentry.
    """
    if 'data' in breadcrumb and isinstance(breadcrumb['data'], dict):
        breadcrumb['data'] = scrub_sensitive(breadcrumb['data'])
    return breadcrumb
