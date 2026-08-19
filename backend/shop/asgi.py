"""
ASGI config for shop project.

Exposes both the Django HTTP application (unchanged) and the Channels
WebSocket application. HTTP requests continue to hit the normal Django
application exactly as before; only ``ws`` connections are routed through
the Channels consumer stack.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'shop.settings')

# Initialize Django (loads apps/settings) before importing Channels routing.
django_application = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from chat.auth import TokenAuthMiddleware  # noqa: E402
from .routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter({
    # The existing Django/DRF app — HTTP behavior is untouched.
    'http': django_application,
    'websocket': TokenAuthMiddleware(
        URLRouter(websocket_urlpatterns)
    ),
})