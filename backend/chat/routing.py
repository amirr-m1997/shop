from django.urls import path

from .consumers import PrivateChatConsumer, UserChannelConsumer

websocket_urlpatterns = [
    path('ws/chat/private/<int:conversation_id>/', PrivateChatConsumer.as_asgi()),
    path('ws/chat/user/<int:user_id>/', UserChannelConsumer.as_asgi()),
]
