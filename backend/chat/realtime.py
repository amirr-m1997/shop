"""Shared realtime helpers.

Publishing and presence live here so every consumer and service uses the same
path:

- Every broadcast after a database write MUST go through
  ``broadcast_after_commit`` so an uncommitted message is never pushed. The
  actual ``group_send`` runs in a background thread (async_to_sync) and any
  channel-layer failure is swallowed + logged — the write itself already
  succeeded in PostgreSQL, so REST remains the fallback.
- Presence is ephemeral state held in the default cache (Redis in production,
  LocMem in single-process dev) with a TTL. It is never authoritative and
  never stored in PostgreSQL; no message content is ever cached.
"""

import logging

from asgiref.sync import async_to_sync
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger('chat')

PRESENCE_PREFIX = 'realtime:presence'


def publish(group, payload):
    """Send ``payload`` to ``group`` on the default channel layer.

    Returns False when the channel layer is unavailable (e.g. Redis down);
    the caller's data has already been committed, so this is only a
    transport failure, not a persistence failure.
    """
    from channels.layers import get_channel_layer
    layer = get_channel_layer()
    if layer is None:
        return False
    try:
        async_to_sync(layer.group_send)(group, payload)
        return True
    except Exception:
        logger.exception('[realtime_publish_error] group=%s type=%s', group, payload.get('type'))
        return False


def broadcast_after_commit(group, payload):
    """Queue ``publish(group, payload)`` for after the current transaction commits."""
    transaction.on_commit(lambda: publish(group, payload))


def _presence_key(user_id):
    return f'{PRESENCE_PREFIX}:{user_id}'


def presence_mark(user_id, connection_id, status='online'):
    from django.conf import settings
    ttl = settings.REALTIME['PRESENCE_TTL']
    key = _presence_key(user_id)
    data = cache.get(key) or {}
    data[connection_id] = {'status': status, 'at': timezone.now().isoformat()}
    cache.set(key, data, timeout=ttl)


def presence_unmark(user_id, connection_id):
    from django.conf import settings
    key = _presence_key(user_id)
    data = cache.get(key)
    if not data:
        return
    data.pop(connection_id, None)
    if data:
        cache.set(key, data, timeout=settings.REALTIME['PRESENCE_TTL'])
    else:
        cache.delete(key)


def presence_status(user_id):
    data = cache.get(_presence_key(user_id))
    if not data:
        return 'offline'
    if any(entry.get('status') == 'online' for entry in data.values()):
        return 'online'
    return 'away'


def presence_connect(user_id, connection_id, status='online'):
    """Register a socket under a user. Returns False when the per-user
    connection cap is reached (the connection id is not double-counted on
    reconnect)."""
    from django.conf import settings
    cap = settings.REALTIME['MAX_CONNECTIONS_PER_USER']
    key = _presence_key(user_id)
    data = cache.get(key) or {}
    if connection_id not in data and len(data) >= cap:
        return False
    presence_mark(user_id, connection_id, status=status)
    return True


class RealtimeRateLimitExceeded(Exception):
    """Raised when a realtime action exceeds its per-user rate limit."""


def allow_rate_limit(scope, bucket, limit, window_seconds):
    """Per-user sliding-window counter backed by the default cache.

    In production the cache is Redis (shared across workers) so limits are
    global; in single-process dev the LocMem cache applies per-process limits.
    """
    user_id = getattr(scope.get('user'), 'id', None)
    if not user_id:
        return False
    cache_key = f'realtime:{user_id}:{bucket}:{int(timezone.now().timestamp() // window_seconds)}'
    try:
        current = cache.incr(cache_key)
    except ValueError:
        cache.set(cache_key, 1, timeout=window_seconds * 2)
        current = 1
    if current > limit:
        raise RealtimeRateLimitExceeded(bucket)
    return True