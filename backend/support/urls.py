from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import SupportConversationViewSet


router = DefaultRouter()
router.register(r'conversations', SupportConversationViewSet, basename='support-conversation')

urlpatterns = [
    path('queue/', SupportConversationViewSet.as_view({'get': 'queue'}), name='support-queue'),
    path('assigned/', SupportConversationViewSet.as_view({'get': 'assigned'}), name='support-assigned'),
    path('agents/', SupportConversationViewSet.as_view({'get': 'agents'}), name='support-agents'),
    path('my-departments/', SupportConversationViewSet.as_view({'get': 'my_departments'}), name='support-my-departments'),
    path('unread-count/', SupportConversationViewSet.as_view({'get': 'unread_count'}), name='support-unread-count'),
    path('', include(router.urls)),
]
