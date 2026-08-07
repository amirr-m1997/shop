import logging

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.db.models import Q, Max
from django.utils import timezone

from .models import Conversation, Message, Notification
from .serializers import (
    MAX_MESSAGE_LENGTH,
    PublicUserSerializer,
    ConversationSerializer,
    ConversationCreateSerializer,
    MessageSerializer,
    SendMessageSerializer,
    NotificationSerializer,
)
from .throttles import ChatSendThrottle

logger = logging.getLogger('chat')


class UserSearchViewSet(viewsets.ViewSet):
    """جستجوی کاربران بر اساس نام کاربری (بدون جستجو روی ایمیل)."""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        q = request.query_params.get('q', '').strip()
        if not q or len(q) < 2:
            return Response({'results': []})

        # Privacy: search by username only — never by email. Email is not
        # returned in the public payload either.
        users = User.objects.filter(username__icontains=q).exclude(
            id=request.user.id
        ).order_by('username')[:10]

        existing_pairs = {
            c.user1_id if c.user2_id == request.user.id else c.user2_id: c
            for c in Conversation.objects.filter(
                Q(user1=request.user) | Q(user2=request.user)
            )
        }

        results = []
        for u in users:
            data = PublicUserSerializer(u, context={'request': request}).data
            existing = existing_pairs.get(u.id)
            data['conversation_id'] = existing.id if existing else None
            data['conversation_status'] = existing.status if existing else None
            results.append(data)
        return Response({'results': results})


class ConversationPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100


class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ConversationPagination

    def get_throttles(self):
        if self.action in ('create', 'accept', 'decline', 'send_message', 'send_product'):
            return [ChatSendThrottle()]
        return super().get_throttles()

    def get_queryset(self):
        return Conversation.objects.filter(
            Q(user1=self.request.user) | Q(user2=self.request.user)
        ).select_related('user1', 'user2', 'user1__profile', 'user2__profile')

    def create(self, request, *args, **kwargs):
        """ارسال درخواست گفتگو به کاربر دیگر. گفتگو تا زمان تایید طرف مقابل
        در وضعیت «در انتظار تایید» باقی می‌ماند و امکان ارسال پیام وجود ندارد."""
        ser = ConversationCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        username = ser.validated_data.get('username', '').strip()
        user_id = ser.validated_data.get('user_id')

        other = None
        if user_id:
            other = User.objects.filter(id=user_id).first()
        elif username:
            other = User.objects.filter(username__iexact=username).first()

        if not other:
            return Response({'error': 'کاربر مورد نظر یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        if other.id == request.user.id:
            return Response({'error': 'نمی‌توانید با خودتان گفتگو کنید.'}, status=status.HTTP_400_BAD_REQUEST)

        # Retry on the (rare) race where two requests create the same pair
        # simultaneously and hit the unique constraint.
        try:
            with transaction.atomic():
                conversation, created = Conversation.get_or_create_pair(
                    request.user, other, requester=request.user
                )
        except IntegrityError:
            conversation = Conversation.objects.filter(
                Q(user1=request.user, user2=other) | Q(user1=other, user2=request.user)
            ).first()
            created = False
            if conversation is None:  # extremely unlikely
                return Response(
                    {'error': 'ایجاد گفتگو ممکن نشد. دوباره تلاش کنید.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        notified = False
        if created:
            notified = True
        elif conversation.status == Conversation.STATUS_DECLINED and not conversation.is_requester(request.user):
            # طرف مقابل قبلاً رد کرده بود؛ حالا خودش درخواست تازه‌ای می‌فرستد
            conversation.status = Conversation.STATUS_PENDING
            conversation.requested_by = request.user
            conversation.save(update_fields=['status', 'requested_by'])
            notified = True
        elif conversation.status == Conversation.STATUS_PENDING and conversation.requested_by_id is None:
            # گفتگوی قدیمی که درخواست‌دهنده مشخصی نداشت؛ کاربر فعلی درخواست می‌دهد
            conversation.requested_by = request.user
            conversation.save(update_fields=['requested_by'])
            notified = True

        if notified:
            # The recipient of the request is the OTHER user, never the
            # requester themselves.
            Notification.objects.create(
                recipient=other,
                actor=request.user,
                conversation=conversation,
                text='یک درخواست گفتگو برای شما ارسال کرده',
            )

        data = ConversationSerializer(conversation, context={'request': request}).data
        return Response(data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def get_object(self):
        obj = super().get_object()
        if not obj.is_member(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('شما به این گفتگو دسترسی ندارید.')
        return obj

    def retrieve(self, request, *args, **kwargs):
        conversation = self.get_object()
        return Response(ConversationSerializer(conversation, context={'request': request}).data)

    def update(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def partial_update(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def destroy(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        conversation = self.get_object()
        qs = conversation.messages.select_related(
            'sender', 'sender__profile', 'product'
        ).order_by('created_at', 'id')
        page = self.paginate_queryset(qs)
        data = MessageSerializer(page, many=True, context={'request': request}).data
        return self.get_paginated_response(data)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """تایید درخواست گفتگو توسط طرف مقابل (فقط گیرنده درخواست می‌تواند تایید کند)."""
        conversation = self.get_object()
        if conversation.is_requester(request.user):
            return Response({'error': 'شما نمی‌توانید درخواست خودتان را تایید کنید.'}, status=status.HTTP_400_BAD_REQUEST)
        # Only a pending request can be accepted — state machine guard.
        if conversation.status != Conversation.STATUS_PENDING:
            return Response(
                {'error': 'این درخواست دیگر قابل تایید نیست.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        conversation.status = Conversation.STATUS_ACCEPTED
        conversation.save(update_fields=['status'])
        # Mark the incoming request notification as read.
        Notification.objects.filter(
            conversation=conversation, recipient=request.user, is_read=False
        ).update(is_read=True)
        if conversation.requested_by_id:
            Notification.objects.create(
                recipient=conversation.requested_by,
                actor=request.user,
                conversation=conversation,
                text='درخواست گفتگوی شما را پذیرفته',
            )
        return Response(ConversationSerializer(conversation, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        """رد درخواست گفتگو توسط طرف مقابل."""
        conversation = self.get_object()
        if conversation.is_requester(request.user):
            return Response({'error': 'شما نمی‌توانید درخواست خودتان را رد کنید.'}, status=status.HTTP_400_BAD_REQUEST)
        if conversation.status != Conversation.STATUS_PENDING:
            return Response(
                {'error': 'این درخواست دیگر قابل رد نیست.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        conversation.status = Conversation.STATUS_DECLINED
        conversation.save(update_fields=['status'])
        Notification.objects.filter(
            conversation=conversation, recipient=request.user, is_read=False
        ).update(is_read=True)
        if conversation.requested_by_id:
            Notification.objects.create(
                recipient=conversation.requested_by,
                actor=request.user,
                conversation=conversation,
                text='درخواست گفتگوی شما را رد کرده',
            )
        return Response(ConversationSerializer(conversation, context={'request': request}).data)

    def _resolve_product(self, product_id, *, require_active):
        from products.models import Product
        if not product_id:
            return None
        qs = Product.objects.filter(id=product_id)
        if require_active:
            qs = qs.filter(is_active=True)
        return qs.first()

    def _send(self, request, conversation, *, require_active_product):
        ser = SendMessageSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        text = (ser.validated_data.get('text') or '').strip()
        product_id = ser.validated_data.get('product_id')

        if not text and not product_id:
            return Response(
                {'error': 'متن پیام یا محصول الزامی است.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(text) > MAX_MESSAGE_LENGTH:
            # Serializer already enforces this, double-check for safety.
            raise ValidationError({'text': f'طول پیام نمی‌تواند بیش از {MAX_MESSAGE_LENGTH} کاراکتر باشد.'})

        product = None
        if product_id:
            product = self._resolve_product(product_id, require_active=require_active_product)
            if not product:
                return Response(
                    {'error': 'محصول مورد نظر یافت نشد یا غیرفعال است.'},
                    status=status.HTTP_404_NOT_FOUND,
                )

        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            text=text,
            product=product,
        )
        conversation.updated_at = timezone.now()
        conversation.save(update_fields=['updated_at'])

        other = conversation.other_user(request.user)
        notif_text = 'یک پیام برای شما ارسال کرده'
        if product:
            notif_text = f'یک محصول برای شما ارسال کرده: {product.name}'
        Notification.objects.create(
            recipient=other,
            actor=request.user,
            conversation=conversation,
            product=product,
            text=notif_text,
        )

        return Response(
            MessageSerializer(message, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        conversation = self.get_object()
        if not conversation.is_accepted:
            return Response(
                {'error': 'برای ارسال پیام، ابتدا باید طرف مقابل درخواست گفتگو را تایید کند.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return self._send(request, conversation, require_active_product=True)

    @action(detail=True, methods=['post'])
    def send_product(self, request, pk=None):
        """ارسال یک محصول مشخص به گفتگو."""
        conversation = self.get_object()
        if not conversation.is_accepted:
            return Response(
                {'error': 'برای ارسال محصول، ابتدا باید طرف مقابل درخواست گفتگو را تایید کند.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return self._send(request, conversation, require_active_product=True)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        conversation = self.get_object()
        conversation.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        Notification.objects.filter(conversation=conversation, recipient=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'ok'})


class MessageViewSet(viewsets.ModelViewSet):
    """مدیریت پیام‌ها (واکنش، علاقه‌مندی، خواندن)."""
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_throttles(self):
        if self.action in ('react', 'favorite'):
            return [ChatSendThrottle()]
        return super().get_throttles()

    def get_queryset(self):
        return Message.objects.filter(
            conversation__in=Conversation.objects.filter(
                Q(user1=self.request.user) | Q(user2=self.request.user)
            )
        ).select_related('sender', 'sender__profile', 'product')

    def get_object(self):
        obj = super().get_object()
        if not obj.conversation.is_member(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('شما به این پیام دسترسی ندارید.')
        return obj

    def create(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def update(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def destroy(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    @action(detail=True, methods=['post'])
    def react(self, request, pk=None):
        message = self.get_object()
        reaction = request.data.get('reaction', '')
        message.reaction = reaction if isinstance(reaction, str) and len(reaction) <= 20 else ''
        message.save(update_fields=['reaction'])
        return Response({'status': 'ok', 'reaction': message.reaction})

    @action(detail=True, methods=['post'])
    def favorite(self, request, pk=None):
        message = self.get_object()
        message.is_favorite = not message.is_favorite
        message.save(update_fields=['is_favorite'])
        return Response({'status': 'ok', 'is_favorite': message.is_favorite})


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ConversationPagination

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).select_related(
            'actor', 'actor__profile', 'product'
        )

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({'count': count})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'ok'})
