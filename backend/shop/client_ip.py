"""Canonical, proxy-aware client IP resolution."""
from ipaddress import ip_address

from django.conf import settings


def _normalise_ip(value):
    value = (value or '').strip()
    try:
        return str(ip_address(value))
    except ValueError:
        return 'unknown'


def get_client_ip(request):
    """Return a validated client IP, trusting forwarding headers only explicitly."""
    if getattr(settings, 'TRUST_PROXY_HEADERS', False):
        forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
        if forwarded:
            resolved = _normalise_ip(forwarded.split(',', 1)[0])
            if resolved != 'unknown':
                return resolved
    return _normalise_ip(request.META.get('REMOTE_ADDR', ''))
