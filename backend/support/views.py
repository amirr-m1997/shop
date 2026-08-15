from django.db.models import Q
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import SupportConversation
from .permissions import departments_for, is_support_staff, role_for, SUPPORT_AGENT, FASHION_STYLIST
from .serializers import (
    SupportConversationCreateSerializer, SupportConversationSerializer,
    SupportMessageCreateSerializer, SupportMessageSerializer, SupportUserSerializer,
)
from .services import assign_conversation, claim_conversation, create_message, require_department_staff


class SupportConversationViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SupportConversationSerializer

    def get_queryset(self):
        user = self.request.user
        qs = SupportConversation.objects.select_related(
            'customer', 'customer__profile', 'assigned_agent', 'assigned_agent__profile'
        )
        if is_support_staff(user):
            return qs.filter(
                department__in=departments_for(user),
            ).filter(Q(status=SupportConversation.STATUS_QUEUED) | Q(assigned_agent=user))
        return qs.filter(customer=user)

    def _conversation(self, pk):
        return get_object_or_404(self.get_queryset(), pk=pk)

    def list(self, request):
        return Response(SupportConversationSerializer(self.get_queryset(), many=True, context={'request': request}).data)

    def retrieve(self, request, pk=None):
        return Response(SupportConversationSerializer(self._conversation(pk), context={'request': request}).data)

    def create(self, request):
        if role_for(request.user) in (SUPPORT_AGENT, FASHION_STYLIST):
            return Response({'detail': 'Staff cannot create customer conversations.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = SupportConversationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        conversation = SupportConversation.objects.create(
            customer=request.user,
            department=serializer.validated_data['department'],
        )
        return Response(
            SupportConversationSerializer(conversation, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    def queue(self, request):
        if not is_support_staff(request.user):
            return Response({'detail': 'Staff access required.'}, status=status.HTTP_403_FORBIDDEN)
        qs = self.get_queryset().filter(status=SupportConversation.STATUS_QUEUED)
        return Response(SupportConversationSerializer(qs, many=True, context={'request': request}).data)

    def assigned(self, request):
        if not is_support_staff(request.user):
            return Response({'detail': 'Staff access required.'}, status=status.HTTP_403_FORBIDDEN)
        qs = self.get_queryset().filter(assigned_agent=request.user)
        return Response(SupportConversationSerializer(qs, many=True, context={'request': request}).data)

    def agents(self, request):
        if not is_support_staff(request.user):
            return Response({'detail': 'Staff access required.'}, status=status.HTTP_403_FORBIDDEN)
        agents = User.objects.filter(is_active=True, profile__role__in=(SUPPORT_AGENT, FASHION_STYLIST), support_department_memberships__active=True, support_department_memberships__department__in=departments_for(request.user)).select_related('profile').distinct().order_by('username')
        return Response(SupportUserSerializer(agents, many=True).data)

    @action(detail=False, methods=['get'], url_path='my-departments')
    def my_departments(self, request):
        return Response({'departments': sorted(departments_for(request.user))})

    @action(detail=True, methods=['get', 'post'])
    def messages(self, request, pk=None):
        conversation = self._conversation(pk)
        if request.method == 'GET':
            qs = conversation.messages.select_related('sender', 'sender__profile', 'product')
            return Response(SupportMessageSerializer(qs, many=True, context={'request': request}).data)
        serializer = SupportMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = create_message(request.user, conversation, serializer.validated_data)
        return Response(SupportMessageSerializer(message, context={'request': request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def claim(self, request, pk=None):
        conversation = claim_conversation(request.user, pk)
        return Response(SupportConversationSerializer(conversation, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        agent = get_object_or_404(User, pk=request.data.get('agent_id'))
        conversation = assign_conversation(request.user, pk, agent)
        return Response(SupportConversationSerializer(conversation, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        conversation = self._conversation(pk)
        if request.user != conversation.customer and request.user != conversation.assigned_agent:
            return Response({'detail': 'Conversation access denied.'}, status=status.HTTP_403_FORBIDDEN)
        conversation.status = SupportConversation.STATUS_CLOSED
        conversation.closed_at = timezone.now()
        conversation.save(update_fields=['status', 'closed_at', 'updated_at'])
        return Response(SupportConversationSerializer(conversation, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        conversation = self._conversation(pk)
        if request.user != conversation.customer and request.user != conversation.assigned_agent:
            return Response({'detail': 'Conversation access denied.'}, status=status.HTTP_403_FORBIDDEN)
        conversation.status = SupportConversation.STATUS_QUEUED
        conversation.assigned_agent = None
        conversation.closed_at = None
        conversation.save(update_fields=['status', 'assigned_agent', 'closed_at', 'updated_at'])
        return Response(SupportConversationSerializer(conversation, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        conversation = self._conversation(pk)
        conversation.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        return Response({'status': 'ok'})

    def unread_count(self, request):
        qs = self.get_queryset()
        count = sum(item.messages.filter(is_read=False).exclude(sender=request.user).count() for item in qs)
        return Response({'unread_count': count})
