import logging

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.db.models import Q, Count, IntegerField, OuterRef, Subquery
from django.db.models.functions import Coalesce
from django.utils import timezone

from .models import Conversation, Message, Notification, Block
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
from support.models import SupportConversation, SupportMessage
from support.serializers import SupportConversationSerializer

logger = logging.getLogger('chat')
SUPPORT_STAFF_ROLES = ('support_agent', 'fashion_stylist')


def private_conversations_for(user):
    return Conversation.objects.filter(
        Q(user1=user) | Q(user2=user)
    ).exclude(
        Q(user1__profile__role__in=SUPPORT_STAFF_ROLES) |
        Q(user2__profile__role__in=SUPPORT_STAFF_ROLES)
    )


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
            for c in private_conversations_for(request.user)
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
        user = self.request.user
        last_message = Message.objects.filter(conversation=OuterRef('pk')).exclude(
            deleted_for=user
        ).order_by('-created_at', '-id')
        return private_conversations_for(user).select_related(
            'user1', 'user2', 'user1__profile', 'user2__profile', 'requested_by'
        ).annotate(
            _last_message_id=Subquery(last_message.values('id')[:1]),
            _last_message_text=Subquery(last_message.values('text')[:1]),
            _last_message_product_id=Subquery(last_message.values('product_id')[:1]),
            _last_message_sender_id=Subquery(last_message.values('sender_id')[:1]),
            _last_message_created_at=Subquery(last_message.values('created_at')[:1]),
            _unread_count=Coalesce(
                Subquery(
                    Message.objects.filter(conversation=OuterRef('pk'))
                    .exclude(deleted_for=user)
                    .filter(is_read=False)
                    .exclude(sender=user)
                    .values('conversation')
                    .annotate(c=Count('*'))
                    .values('c'),
                ),
                0,
                output_field=IntegerField(),
            ),
        )

    @action(detail=False, methods=['post'])
    def support_chat(self, request):
        conversation = SupportConversation.objects.filter(customer=request.user, department=SupportConversation.DEPARTMENT_FASHION_STYLIST).exclude(status=SupportConversation.STATUS_CLOSED).order_by('-updated_at').first()
        created = conversation is None
        if created:
            conversation = SupportConversation.objects.create(customer=request.user, department=SupportConversation.DEPARTMENT_FASHION_STYLIST)
            SupportMessage.objects.create(conversation=conversation, sender=request.user, text='Support request created through the legacy chat endpoint.')
        return Response(SupportConversationSerializer(conversation, context={'request': request}).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        """ایجاد یا دریافت گفتگو با استایلیست مد و پشتیبانی سایت (به صورت خودکار تایید شده)."""
        stylist = User.objects.filter(username__in=['stylist', 'support', 'site_stylist']).exclude(id=request.user.id).first()
        if not stylist:
            stylist = User.objects.filter(is_superuser=True).exclude(id=request.user.id).first()
        if not stylist:
            stylist = User.objects.create_user(
                username='site_stylist',
                email='stylist@fashion.com',
                first_name='استایلیست',
                last_name='ارشد مد',
            )
            stylist.set_unusable_password()
            stylist.save()

        if stylist.id == request.user.id:
            return Response(
                {'error': 'شما نمی‌توانید با خودتان گفتگو کنید.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        created = False
        try:
            with transaction.atomic():
                conversation, created = Conversation.get_or_create_pair(
                    request.user, stylist, requester=request.user
                )
                if conversation.status != Conversation.STATUS_ACCEPTED:
                    conversation.status = Conversation.STATUS_ACCEPTED
                    conversation.save(update_fields=['status'])

                if created or not conversation.messages.exists():
                    Message.objects.create(
                        conversation=conversation,
                        sender=stylist,
                        text='سلام! من استایلیست ارشد مد و پشتیبان شما هستم. ✨ چطور می‌توانم در انتخاب لباس، ست کردن یا سایز مناسب به شما کمک کنم؟',
                    )
        except IntegrityError:
            created = False
            conversation = Conversation.objects.filter(
                Q(user1=request.user, user2=stylist) | Q(user1=stylist, user2=request.user)
            ).first()
            if conversation and conversation.status != Conversation.STATUS_ACCEPTED:
                conversation.status = Conversation.STATUS_ACCEPTED
                conversation.save(update_fields=['status'])

        return Response(
            ConversationSerializer(conversation, context={'request': request}).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

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
        if Block.is_blocked(request.user, other):
            return Response(
                {'error': 'شما امکان گفتگو با این کاربر را ندارید.'},
                status=status.HTTP_403_FORBIDDEN,
            )

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
        elif conversation.status == Conversation.STATUS_DECLINED:
            # درخواست قبلاً رد شده بود؛ حالا هر یک از دو طرف می‌تواند دوباره
            # درخواست دهد (مثل آنبلاک در شبکه‌های اجتماعی).
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
        qs = conversation.messages.exclude(deleted_for=request.user).select_related(
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

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """لغو درخواست گفتگو توسط درخواست‌دهنده (قبل از تایید طرف مقابل)."""
        conversation = self.get_object()
        if not conversation.is_requester(request.user):
            return Response(
                {'error': 'فقط درخواست‌دهنده می‌تواند درخواست خود را لغو کند.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if conversation.status != Conversation.STATUS_PENDING:
            return Response(
                {'error': 'این درخواست دیگر قابل لغو نیست.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        conversation.delete()
        return Response({'status': 'ok', 'cancelled': True})

    @action(detail=True, methods=['post'])
    def clear(self, request, pk=None):
        """پاک کردن سابقه پیام‌ها فقط برای خود کاربر (حذف یک‌طرفه)."""
        conversation = self.get_object()
        # Each user clears their own copy; the other user keeps the history.
        conversation.messages.exclude(deleted_for=request.user).update(
            is_read=True,
        )
        for msg in conversation.messages.exclude(deleted_for=request.user).iterator():
            msg.deleted_for.add(request.user)
        return Response({'status': 'ok', 'cleared': True})

    @action(detail=True, methods=['post'])
    def block(self, request, pk=None):
        """بلاک کردن طرف مقابل در این گفتگو."""
        conversation = self.get_object()
        other = conversation.other_user(request.user)
        Block.objects.update_or_create(blocker=request.user, blocked=other)
        # بلاک فعال است؛ دیگر امکان ارسال درخواست/پیام وجود ندارد.
        if conversation.status == Conversation.STATUS_PENDING:
            conversation.status = Conversation.STATUS_DECLINED
            conversation.save(update_fields=['status'])
        return Response(ConversationSerializer(conversation, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def unblock(self, request, pk=None):
        """رفع بلاک کاربر در این گفتگو."""
        conversation = self.get_object()
        other = conversation.other_user(request.user)
        Block.objects.filter(blocker=request.user, blocked=other).delete()
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
        from .services import SendMessageError, send_private_message
        try:
            message = send_private_message(
                request.user,
                conversation,
                text=request.data.get('text', ''),
                product_id=request.data.get('product_id'),
                require_active_product=require_active_product,
            )
        except SendMessageError as exc:
            return Response({'error': exc.message}, status=exc.status)
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
        from .services import mark_conversation_read
        return Response(mark_conversation_read(request.user, conversation))


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
        from .services import SendMessageError, react_message
        try:
            return Response(react_message(request.user, self.get_object(), request.data.get('reaction', '')))
        except SendMessageError as exc:
            return Response({'error': exc.message}, status=exc.status)

    @action(detail=True, methods=['post'])
    def favorite(self, request, pk=None):
        from .services import SendMessageError, favorite_message
        try:
            return Response(favorite_message(request.user, self.get_object()))
        except SendMessageError as exc:
            return Response({'error': exc.message}, status=exc.status)


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
