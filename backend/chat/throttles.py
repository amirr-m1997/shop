"""
Rate limiting for chat endpoints.

Polling endpoints (list/retrieve/messages/unread_count) stay on the global
user budget, but write endpoints get a dedicated, tighter scope so a user
can't flood another user with messages, products, or conversation requests.
"""
from rest_framework.throttling import SimpleRateThrottle

from .services import is_new_account


class ChatSendThrottle(SimpleRateThrottle):
    """Per-user throttle for chat write operations (send message/product,
    accept/decline, react/favorite). New accounts get half the budget."""
    scope = 'chat_send'

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident,
        }

    def allow_request(self, request, view):
        rate = self.THROTTLE_RATES.get(self.scope) if self.THROTTLE_RATES else self.get_rate()
        user = getattr(request, 'user', None)
        if rate and user and getattr(user, 'is_authenticated', False) and is_new_account(user):
            try:
                num, period = str(rate).split('/')
                rate = f'{max(1, int(num) // 2)}/{period}'
            except (TypeError, ValueError):
                pass
        self.rate = rate
        self.num_requests, self.duration = self.parse_rate(self.rate)
        return super().allow_request(request, view)


class ChatRequestThrottle(SimpleRateThrottle):
    """Tighter budget for starting new private conversations."""
    scope = 'chat_request'

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident,
        }
