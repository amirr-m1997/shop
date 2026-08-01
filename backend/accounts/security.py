"""
Security utilities for login protection, account lockout,
CAPTCHA validation, and device fingerprinting.

Uses Django's cache framework (Redis-backed when available,
falls back to LocMemCache in development).
"""
import hashlib
import logging
import time
from django.core.cache import cache
from django.conf import settings

logger = logging.getLogger('security')
auth_logger = logging.getLogger('authentication')

# ─── Constants ──────────────────────────────────────────────
LOGIN_FAIL_LOCKOUT_THRESHOLD = 10    # consecutive failures before lock
LOGIN_FAIL_LOCKOUT_DURATION = 300    # 5 minutes in seconds
LOGIN_FAIL_PROGRESSIVE_DELAY = {
    4: 2,    # 4-6 failures: 2s delay
    7: 5,    # 7-9 failures: 5s delay
}
CAPTCHA_REQUIRED_THRESHOLD = 5       # failures before CAPTCHA required
OTP_FAIL_LOCKOUT_THRESHOLD = 5       # OTP verification failures before lock
OTP_FAIL_LOCKOUT_DURATION = 300      # 5 minutes


# ─── Login Failure Tracking ────────────────────────────────

def _login_fail_key(identifier):
    return f'login_fails:{identifier}'


def _login_lock_key(identifier):
    return f'login_lock:{identifier}'


def _login_delay_key(identifier):
    return f'login_delay:{identifier}'


def get_login_failure_count(identifier):
    """Get consecutive login failure count for a username or IP."""
    return cache.get(_login_fail_key(identifier), 0)


def record_login_failure(identifier):
    """Record a login failure. Returns new count."""
    key = _login_fail_key(identifier)
    count = cache.get(key, 0) + 1
    cache.set(key, count, LOGIN_FAIL_LOCKOUT_DURATION + 60)

    if count >= LOGIN_FAIL_LOCKOUT_THRESHOLD:
        lock_key = _login_lock_key(identifier)
        cache.set(lock_key, True, LOGIN_FAIL_LOCKOUT_DURATION)
        auth_logger.warning(
            '[account_lockout] identifier=%s failures=%d duration=%ds',
            identifier, count, LOGIN_FAIL_LOCKOUT_DURATION,
        )

    return count


def clear_login_failures(identifier):
    """Clear failure count on successful login."""
    cache.delete(_login_fail_key(identifier))
    cache.delete(_login_lock_key(identifier))
    cache.delete(_login_delay_key(identifier))


def is_account_locked(identifier):
    """Check if an account/IP is temporarily locked."""
    return cache.get(_login_lock_key(identifier), False)


def get_login_delay(identifier):
    """
    Get progressive delay in seconds based on failure count.
    Returns 0 if no delay needed.
    """
    count = get_login_failure_count(identifier)
    delay = 0
    for threshold, seconds in sorted(LOGIN_FAIL_PROGRESSIVE_DELAY.items()):
        if count >= threshold:
            delay = seconds
    return delay


def apply_login_delay(identifier):
    """Apply progressive delay if needed. Blocks for the delay duration."""
    delay = get_login_delay(identifier)
    if delay > 0:
        time.sleep(delay)
        return delay
    return 0


# ─── CAPTCHA ────────────────────────────────────────────────

def requires_captcha(identifier):
    """
    Check if CAPTCHA is required for this identifier.
    Returns True after CAPTCHA_REQUIRED_THRESHOLD failures.
    """
    count = get_login_failure_count(identifier)
    return count >= CAPTCHA_REQUIRED_THRESHOLD


def validate_captcha(captcha_response, captcha_token):
    """
    Validate CAPTCHA response.

    In production, integrate with real CAPTCHA provider (reCAPTCHA, hCaptcha, etc).
    For now, implements a simple honeypot/check mechanism.

    Returns (is_valid: bool, error_message: str or None).
    """
    if not settings.DEBUG:
        # Production: validate against CAPTCHA provider
        # TODO: Integrate with reCAPTCHA/hCaptcha when available
        # For now, accept if token is present and non-empty
        if not captcha_response:
            return False, 'CAPTCHA الزامی است.'
        # Placeholder: real implementation would verify with provider API
        return True, None
    else:
        # Development: CAPTCHA is optional
        return True, None


# ─── Device Fingerprint ────────────────────────────────────

def extract_device_fingerprint(request):
    """
    Extract a lightweight device fingerprint from the request.

    Returns a dict with fingerprint components. The fingerprint
    is used ONLY as an auxiliary security signal — never as the
    sole criterion for blocking.
    """
    ua = request.META.get('HTTP_USER_AGENT', '')
    accept = request.META.get('HTTP_ACCEPT', '')
    accept_lang = request.META.get('HTTP_ACCEPT_LANGUAGE', '')
    platform = request.META.get('HTTP_PLATFORM', '')

    raw = f'{ua}|{accept}|{accept_lang}|{platform}'
    fingerprint = hashlib.sha256(raw.encode()).hexdigest()[:16]

    return {
        'hash': fingerprint,
        'user_agent': ua[:200],
        'accept': accept[:100],
        'accept_language': accept_lang[:50],
    }


def get_device_summary(request):
    """Get a short device summary for logging."""
    fp = extract_device_fingerprint(request)
    return fp['hash']


# ─── OTP Abuse Tracking ────────────────────────────────────

def _otp_send_key(identifier):
    return f'otp_sends:{identifier}'


def _otp_fail_key(identifier):
    return f'otp_fails:{identifier}'


def _otp_lock_key(identifier):
    return f'otp_lock:{identifier}'


def record_otp_send(identifier):
    """Record an OTP send event. Returns count in current window."""
    key = _otp_send_key(identifier)
    count = cache.get(key, 0) + 1
    cache.set(key, count, 900)  # 15 min window
    return count


def record_otp_failure(identifier):
    """Record an OTP verification failure. Returns new count."""
    key = _otp_fail_key(identifier)
    count = cache.get(key, 0) + 1
    cache.set(key, count, OTP_FAIL_LOCKOUT_DURATION + 60)

    if count >= OTP_FAIL_LOCKOUT_THRESHOLD:
        lock_key = _otp_lock_key(identifier)
        cache.set(lock_key, True, OTP_FAIL_LOCKOUT_DURATION)
        auth_logger.warning(
            '[otp_lockout] identifier=%s failures=%d',
            identifier, count,
        )

    return count


def clear_otp_failures(identifier):
    """Clear OTP failure count on success."""
    cache.delete(_otp_fail_key(identifier))
    cache.delete(_otp_lock_key(identifier))


def is_otp_locked(identifier):
    """Check if OTP is locked for this identifier."""
    return cache.get(_otp_lock_key(identifier), False)


# ─── Security Event Logging ────────────────────────────────

def log_security_event(event_type, request, details=None):
    """
    Log a security event with request context.

    event_type: 'login_failure', 'login_lockout', 'otp_abuse',
                'payment_abuse', 'webhook_invalid', etc.
    """
    ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
    if not ip:
        ip = request.META.get('REMOTE_ADDR', 'unknown')
    ua = request.META.get('HTTP_USER_AGENT', '')[:100]
    user = getattr(request, 'user', None)
    username = user.username if user and user.is_authenticated else 'anonymous'

    auth_logger.warning(
        '[%s] ip=%s user=%s ua=%s%s',
        event_type, ip, username, ua,
        f' details={details}' if details else '',
        extra={
            'event': event_type,
            'ip': ip,
            'user': username,
            'user_agent': ua,
            'details': details,
        },
    )
