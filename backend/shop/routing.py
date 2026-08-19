"""Central WebSocket routing — aggregates per-app consumer routes."""

from chat.routing import websocket_urlpatterns as chat_patterns
from style_rooms.routing import websocket_urlpatterns as style_rooms_patterns
from support.routing import websocket_urlpatterns as support_patterns

websocket_urlpatterns = chat_patterns + style_rooms_patterns + support_patterns