"""WebSocket authentication for the realtime layer.

Reuses the exact credential store the REST API uses — the ``shop_auth``
HttpOnly cookie holding a DRF ``Token`` key (see accounts.authentication
.CookieTokenAuthentication). Browsers send the cookie on the WS handshake
because the socket is same-site; non-browser clients may authenticate via a
``Sec-WebSocket-Protocol: token.<key>`` subprotocol. Tokens are never read
from the query string.

Origin validation happens here as well, mirroring CORS_ALLOWED_ORIGINS, so a
rogue page cannot open sockets against the API.
"""

from http.cookies import SimpleCookie

from channels.db import database_sync_to_async
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from rest_framework.authtoken.models import Token


def _cookies(scope):
    cookies = {}
    for raw_name, raw_value in scope.get('headers', []):
        if raw_name == b'cookie':
            try:
                jar = SimpleCookie(raw_value.decode('latin-1'))
            except Exception:
                return cookies
            for name in jar:
                cookies[name] = jar[name].value
    return cookies


def _origin_allowed(scope):
    origin = None
    host = None
    for raw_name, raw_value in scope.get('headers', []):
        if raw_name == b'origin':
            origin = raw_value.decode('latin-1')
        elif raw_name == b'host':
            host = raw_value.decode('latin-1')
    if not origin:
        return False
    allowed = set(settings.CORS_ALLOWED_ORIGINS)
    if host:
        allowed.add(f'http://{host}')
        allowed.add(f'https://{host}')
    return origin in allowed


@database_sync_to_async
def _user_from_token(token):
    if not token:
        return AnonymousUser()
    try:
        token_obj = Token.objects.select_related('user').get(key=token)
    except Token.DoesNotExist:
        return AnonymousUser()
    user = token_obj.user
    if not user.is_active:
        return AnonymousUser()
    return user


class TokenAuthMiddleware:
    """Authenticate the WebSocket and populate ``scope['user']``.

    Closes the handshake with an opaque code when the Origin header is not
    allowed, and leaves ``scope['user']`` as ``AnonymousUser`` when no valid
    token is present so consumers can reject with a consistent code.
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        scope = dict(scope)
        if not _origin_allowed(scope):
            await send({'type': 'websocket.close', 'code': 4403})
            return

        token = _cookies(scope).get(settings.AUTH_TOKEN_COOKIE_NAME)
        if not token:
            for proto in scope.get('subprotocols', []):
                if proto.startswith('token.'):
                    token = proto[len('token.'):]
                    scope['subprotocols'] = ['token']
                    break

        scope['user'] = await _user_from_token(token)
        return await self.inner(scope, receive, send)