"""
Rate limiting for chat endpoints.

Polling endpoints (list/retrieve/messages/unread_count) stay on the global
user budget, but write endpoints get a dedicated, tighter scope so a user
can't flood another user with messages, products, or conversation requests.
"""
from rest_framework.throttling import SimpleRateThrottle


class ChatSendThrottle(SimpleRateThrottle):
    """Per-user throttle for chat write operations (send message/product,
    create conversation, accept/decline, react/favorite)."""
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
