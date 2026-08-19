from django.urls import path

from .consumers import StyleRoomConsumer

websocket_urlpatterns = [
    path('ws/style-rooms/<uuid:room_id>/', StyleRoomConsumer.as_asgi()),
]
