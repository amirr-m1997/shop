"""
Rate limiting for Style Room endpoints.

Read endpoints (list/retrieve/members/items/activity) stay on the global
user budget; write endpoints get dedicated, tighter scopes so a user can't
flood rooms, invitations, or items.

Cache backend: the throttle history lives in `settings.CACHES['default']`.
LocMemCache (the dev default) is per-process only — under a multi-worker
production setup each worker enforces its own copy of the budget, so the
effective limits are multiplied by the worker count. Production therefore
requires the shared Redis backend (enabled by setting REDIS_URL in the
environment; see shop/settings.py). No credentials are hardcoded here.
"""
from rest_framework.throttling import SimpleRateThrottle


class StyleRoomUserThrottle(SimpleRateThrottle):
    """Per-user throttle base for styled room write operations."""

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident,
        }


class StyleRoomWriteThrottle(StyleRoomUserThrottle):
    scope = 'room_write'


class StyleRoomInviteThrottle(StyleRoomUserThrottle):
    scope = 'room_invite'