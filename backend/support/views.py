from django.db.models import Q, Prefetch, Case, When, Value, IntegerField
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from chat.pagination import MessageCursorPagination

from .models import SupportConversation, SupportMessage
from .permissions import (
    departments_for, is_support_eligible, is_support_staff, ELIGIBLE_ROLES,
)
from .serializers import (
    SupportConversationCreateSerializer, SupportConversationSerializer,
    SupportMessageCreateSerializer, SupportMessageSerializer, SupportUserSerializer,
)
from .services import (
    assign_conversation, claim_conversation, create_message,
    require_department_staff, touch_presence,
)


class SupportMessagePagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'


class SupportConversationViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SupportConversationSerializer
    pagination_class = SupportMessagePagination

    def get_queryset(self):
        user = self.request.user
        qs = SupportConversation.objects.select_related(
            'customer', 'customer__profile', 'assigned_agent', 'assigned_agent__profile'
        ).prefetch_related(
            Prefetch(
                'messages',
                queryset=SupportMessage.objects.order_by('-created_at', '-id')[:1],
                to_attr='_last_message',
            )
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
        if is_support_eligible(request.user):
            return Response({'detail': 'Staff cannot create customer conversations.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = SupportConversationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        department = serializer.validated_data['department']
        conversation = SupportConversation.objects.filter(
            customer=request.user,
            department=department,
        ).order_by('-updated_at', '-id').first()
        if conversation is not None:
            if conversation.status == SupportConversation.STATUS_CLOSED:
                conversation.status = SupportConversation.STATUS_QUEUED
                conversation.assigned_agent = None
                conversation.closed_at = None
                conversation.save(update_fields=['status', 'assigned_agent', 'closed_at', 'updated_at'])
            return Response(
                SupportConversationSerializer(conversation, context={'request': request}).data,
                status=status.HTTP_200_OK,
            )
        conversation = SupportConversation.objects.create(
            customer=request.user,
            department=department,
        )
        return Response(
            SupportConversationSerializer(conversation, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    def queue(self, request):
        if not is_support_staff(request.user):
            return Response({'detail': 'Staff access required.'}, status=status.HTTP_403_FORBIDDEN)
        touch_presence(request.user)
        qs = (
            self.get_queryset()
            .filter(status=SupportConversation.STATUS_QUEUED)
            .annotate(
                priority_rank=Case(
                    When(priority=SupportConversation.PRIORITY_URGENT, then=Value(0)),
                    When(priority=SupportConversation.PRIORITY_HIGH, then=Value(1)),
                    default=Value(2),
                    output_field=IntegerField(),
                )
            )
            .order_by('priority_rank', 'created_at')
        )
        return Response(SupportConversationSerializer(qs, many=True, context={'request': request}).data)

    def assigned(self, request):
        if not is_support_staff(request.user):
            return Response({'detail': 'Staff access required.'}, status=status.HTTP_403_FORBIDDEN)
        touch_presence(request.user)
        qs = self.get_queryset().filter(assigned_agent=request.user)
        return Response(SupportConversationSerializer(qs, many=True, context={'request': request}).data)

    def agents(self, request):
        if not is_support_staff(request.user):
            return Response({'detail': 'Staff access required.'}, status=status.HTTP_403_FORBIDDEN)
        touch_presence(request.user)
        agents = User.objects.filter(
            is_active=True,
            support_department_memberships__active=True,
            support_department_memberships__department__in=departments_for(request.user),
        ).filter(
            Q(is_staff=True) | Q(is_superuser=True) | Q(profile__role__in=ELIGIBLE_ROLES),
        ).select_related('profile').distinct().order_by('username')
        return Response(SupportUserSerializer(agents, many=True).data)

    @action(detail=False, methods=['get'], url_path='my-departments')
    def my_departments(self, request):
        touch_presence(request.user)
        return Response({'departments': sorted(departments_for(request.user))})

    @action(detail=True, methods=['get', 'post'])
    def messages(self, request, pk=None):
        conversation = self._conversation(pk)
        touch_presence(request.user)
        if request.method == 'GET':
            qs = conversation.messages.select_related('sender', 'sender__profile', 'product')
            return MessageCursorPagination().paginate(
                request, qs, SupportMessageSerializer, context={'request': request},
            )
        serializer = SupportMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = create_message(request.user, conversation, serializer.validated_data)
        return Response(SupportMessageSerializer(message, context={'request': request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def claim(self, request, pk=None):
        touch_presence(request.user)
        conversation = claim_conversation(request.user, pk)
        return Response(SupportConversationSerializer(conversation, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        touch_presence(request.user)
        agent = get_object_or_404(User, pk=request.data.get('agent_id'))
        conversation = assign_conversation(request.user, pk, agent)
        return Response(SupportConversationSerializer(conversation, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='priority')
    def set_priority(self, request, pk=None):
        conversation = self._conversation(pk)
        touch_presence(request.user)
        from .services import set_conversation_priority
        try:
            conversation = set_conversation_priority(
                request.user, conversation, request.data.get('priority'),
            )
        except PermissionDenied:
            return Response({'detail': 'Staff access required.'}, status=status.HTTP_403_FORBIDDEN)
        except ValidationError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return Response(SupportConversationSerializer(conversation, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        conversation = self._conversation(pk)
        touch_presence(request.user)
        from .services import close_conversation
        try:
            conversation = close_conversation(request.user, conversation)
        except PermissionDenied:
            return Response({'detail': 'Conversation access denied.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(SupportConversationSerializer(conversation, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        conversation = self._conversation(pk)
        touch_presence(request.user)
        from .services import reopen_conversation
        try:
            conversation = reopen_conversation(request.user, conversation)
        except PermissionDenied:
            return Response({'detail': 'Conversation access denied.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(SupportConversationSerializer(conversation, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        conversation = self._conversation(pk)
        touch_presence(request.user)
        from .services import mark_support_read
        try:
            return Response(mark_support_read(
                request.user, conversation, message_ids=(request.data or {}).get('message_ids'),
            ))
        except ValidationError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)

    def unread_count(self, request):
        qs = self.get_queryset()
        count = SupportMessage.objects.filter(
            conversation__in=qs.values('id'),
            is_read=False,
        ).exclude(sender=request.user).count()
        return Response({'unread_count': count})
