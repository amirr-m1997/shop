from django.urls import path

from .consumers import SupportChatConsumer, SupportQueueConsumer

websocket_urlpatterns = [
    path('ws/support/conversations/<int:conversation_id>/', SupportChatConsumer.as_asgi()),
    path('ws/support/departments/<str:department>/', SupportQueueConsumer.as_asgi()),
]