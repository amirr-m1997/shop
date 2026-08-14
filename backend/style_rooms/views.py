import logging

from django.contrib.auth.models import User
from django.db.models import Count, IntegerField, OuterRef, Prefetch, Subquery
from django.db.models.functions import Coalesce
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from products.models import Product, ProductImage, Wishlist
from chat.models import StyleRoomMessageRead

from .models import (
    MAX_ROOM_MEMBERS,
    EVENT_ROOM_MEMBER_LEFT,
    EVENT_ROOM_MEMBER_REMOVED,
    EVENT_ROOM_ITEM_REMOVED,
    StyleRoom,
    StyleRoomEvent,
    StyleRoomItem,
    StyleRoomMember,
)
from .serializers import (
    StyleRoomEventSerializer,
    StyleRoomItemSerializer,
    StyleRoomMemberSerializer,
    StyleRoomSerializer,
    StyleRoomMessageCreateSerializer,
    StyleRoomMessageReadSerializer,
    StyleRoomMessageSerializer,
)
from .services import (
    RoomMemberLimitExceeded,
    add_item,
    add_member,
    blocks_interaction,
    create_room,
    issue_invite_token,
    join_room,
    create_room_message,
    log_room_event,
    mark_room_messages_read,
    update_room,
    validate_invite_token,
)
from .throttles import StyleRoomInviteThrottle, StyleRoomWriteThrottle

logger = logging.getLogger('style_rooms')


class StyleRoomPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class StyleRoomViewSet(viewsets.ModelViewSet):
    """مشترک‌ترین نقطه ورود: عملیات اتاق استایل، اعضا، آیتم‌ها و تعاملات."""

    serializer_class = StyleRoomSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StyleRoomPagination
    lookup_value_regex = '[0-9a-f-]{36}'

    def get_throttles(self):
        write_actions = {
            'create', 'update', 'partial_update', 'destroy',
            'members', 'remove_member', 'items', 'remove_item',
            'join', 'leave', 'messages', 'mark_messages_read',
        }
        if self.action == 'invite':
            return [StyleRoomInviteThrottle()]
        if self.action in write_actions:
            return [StyleRoomWriteThrottle()]
        return super().get_throttles()

    def _annotate_counts(self, queryset):
        """Total (not caller-scoped) member/item counts via subqueries.

        A plain Count() would share the members JOIN introduced by the
        membership filter in get_queryset() and therefore return 1 for every
        member (the caller's own row). Subqueries keep the totals accurate;
        Coalesce maps the NULL from an empty relation to 0 so serializers
        don't fall back to a per-object .count() query.
        """
        return queryset.annotate(
            _member_count=Coalesce(
                Subquery(
                    StyleRoomMember.objects.filter(room=OuterRef('pk')).order_by()
                    .values('room').annotate(c=Count('*')).values('c'),
                ),
                0,
                output_field=IntegerField(),
            ),
            _item_count=Coalesce(
                Subquery(
                    StyleRoomItem.objects.filter(room=OuterRef('pk')).order_by()
                    .values('room').annotate(c=Count('*')).values('c'),
                ),
                0,
                output_field=IntegerField(),
            ),
        )

    def get_queryset(self):
        user = self.request.user
        if self.action == 'destroy' and self._is_platform_admin(user):
            qs = StyleRoom.objects.all()
        else:
            qs = StyleRoom.objects.filter(members__user=user)
        qs = qs.select_related(
            'owner', 'owner__profile',
        ).prefetch_related(
            Prefetch(
                'members',
                queryset=StyleRoomMember.objects.filter(user_id=user.id).only(
                    'id', 'room_id', 'user_id', 'role',
                ),
                to_attr='my_membership',
            ),
            Prefetch(
                'owner__wishlist',
                queryset=Wishlist.objects.select_related('product__category'),
            ),
        ).distinct()
        return self._annotate_counts(qs)

    def get_object(self):
        """Object-level authorization: only members may access a room.
        Non-members get a 404 so room UUIDs cannot be enumerated."""
        try:
            room = self.get_queryset().get(pk=self.kwargs['pk'])
        except (StyleRoom.DoesNotExist, StyleRoom.MultipleObjectsReturned):
            raise NotFound('اتاق پیدا نشد.')
        return room

    def _get_room_unrestricted(self, pk):
        """Room lookup that does NOT require membership — used only by join()."""
        try:
            return StyleRoom.objects.select_related('owner', 'owner__profile').get(pk=pk)
        except StyleRoom.DoesNotExist:
            raise NotFound('اتاق پیدا نشد.')

    def _require_owner(self, request, room):
        if room.owner_id != request.user.id:
            raise PermissionDenied('فقط مالک اتاق اجازه این عملیات را دارد.')

    def _is_platform_admin(self, user):
        profile = getattr(user, 'profile', None)
        return bool(
            user.is_staff
            or user.is_superuser
            or (profile and profile.is_admin_user)
        )

    def _require_delete_access(self, request, room):
        if room.owner_id != request.user.id and not self._is_platform_admin(request.user):
            raise PermissionDenied('فقط مالک یا مدیر سامانه اجازه حذف اتاق را دارد.')

    # ─── Create / Update / Delete ───────────────────────────

    def create(self, request, *args, **kwargs):
        serializer = StyleRoomSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        room = create_room(
            owner=request.user,
            title=data['title'],
            description=data.get('description', ''),
            cover=data.get('cover'),
            visibility=data.get('visibility', StyleRoom.VISIBILITY_PRIVATE),
        )
        out = StyleRoomSerializer(
            self.get_queryset().get(pk=room.pk), context={'request': request},
        ).data
        return Response(out, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        return self._update_room(request, partial=True)

    def update(self, request, *args, **kwargs):
        return self._update_room(request, partial=False)

    def _update_room(self, request, *, partial):
        room = self.get_object()
        self._require_owner(request, room)
        serializer = StyleRoomSerializer(
            room, data=request.data, partial=partial, context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        update_room(
            room, request.user,
            title=data.get('title'),
            description=data.get('description'),
            cover=data.get('cover'),
            visibility=data.get('visibility'),
        )
        out = StyleRoomSerializer(room, context={'request': request}).data
        return Response(out)

    def destroy(self, request, *args, **kwargs):
        room = self.get_object()
        self._require_delete_access(request, room)
        room.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ─── Members ────────────────────────────────────────────

    @action(detail=True, methods=['get', 'post'], url_path='members')
    def members(self, request, pk=None):
        room = self.get_object()
        if request.method == 'GET':
            queryset = room.members.select_related(
                'user', 'user__profile', 'added_by', 'added_by__profile',
            ).prefetch_related(
                Prefetch(
                    'user__wishlist',
                    queryset=Wishlist.objects.select_related('product__category'),
                ),
            ).order_by('joined_at', 'id')
            page = self.paginate_queryset(queryset)
            data = StyleRoomMemberSerializer(page, many=True, context={'request': request}).data
            return self.get_paginated_response(data)

        # POST → direct invitation (owner only)
        self._require_owner(request, room)
        serializer = StyleRoomMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target = None
        if serializer.validated_data.get('user_id'):
            target = User.objects.filter(id=serializer.validated_data['user_id']).first()
        username = (serializer.validated_data.get('username') or '').strip()
        if not target and username:
            target = User.objects.filter(username__iexact=username).first()

        if not target:
            return Response({'error': 'کاربر مورد نظر یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        if target.id == request.user.id:
            return Response({'error': 'نمی‌توانید خودتان را دعوت کنید.'}, status=status.HTTP_400_BAD_REQUEST)
        if room.members.filter(user_id=target.id).exists():
            return Response({'error': 'این کاربر از قبل عضو اتاق است.'}, status=status.HTTP_400_BAD_REQUEST)
        if room.members.count() >= MAX_ROOM_MEMBERS:
            return Response({'error': f'حداکثر {MAX_ROOM_MEMBERS} عضو مجاز است.'}, status=status.HTTP_400_BAD_REQUEST)
        if blocks_interaction(request.user, target):
            return Response({'error': 'امکان دعوت این کاربر وجود ندارد.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            member, created = add_member(room, target, added_by=request.user, role=StyleRoomMember.ROLE_MEMBER)
        except RoomMemberLimitExceeded:
            return Response({'error': f'حداکثر {MAX_ROOM_MEMBERS} عضو مجاز است.'}, status=status.HTTP_400_BAD_REQUEST)
        code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(
            StyleRoomMemberSerializer(member, context={'request': request}).data, status=code,
        )

    @action(detail=True, methods=['delete'], url_path=r'members/(?P<user_id>[0-9]+)')
    def remove_member(self, request, pk=None, user_id=None):
        room = self.get_object()
        self._require_owner(request, room)
        member = room.members.filter(user_id=user_id).first()
        if not member:
            return Response({'error': 'عضو یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        if member.role == StyleRoomMember.ROLE_OWNER:
            return Response({'error': 'نمی‌توانید مالک اتاق را حذف کنید.'}, status=status.HTTP_400_BAD_REQUEST)
        victim = member.user
        member.delete()
        log_room_event(room, request.user, EVENT_ROOM_MEMBER_REMOVED, {
            'user_id': victim.id, 'username': victim.username,
        })
        return Response({'status': 'ok', 'removed': True})

    # ─── Invitation / Join / Leave ──────────────────────────

    @action(detail=True, methods=['post'], url_path='invite')
    def invite(self, request, pk=None):
        room = self.get_object()
        self._require_owner(request, room)
        token, expires_at = issue_invite_token(room, request.user)
        return Response({'token': token, 'expires_at': expires_at})

    @action(detail=True, methods=['post'], url_path='join')
    def join(self, request, pk=None):
        room = self._get_room_unrestricted(pk)
        token = request.data.get('token', '')
        error = validate_invite_token(room, token)
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

        if room.members.filter(user_id=request.user.id).exists():
            out = StyleRoomSerializer(
                self.get_queryset().get(pk=room.pk), context={'request': request},
            ).data
            return Response(out, status=status.HTTP_200_OK)
        if room.members.count() >= MAX_ROOM_MEMBERS:
            return Response({'error': 'اتاق پر است.'}, status=status.HTTP_400_BAD_REQUEST)
        if blocks_interaction(request.user, room.owner):
            return Response({'error': 'امکان عضویت در این اتاق وجود ندارد.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            member, created = join_room(room, request.user)
        except RoomMemberLimitExceeded:
            return Response({'error': 'اتاق پر است.'}, status=status.HTTP_400_BAD_REQUEST)
        code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        out = StyleRoomSerializer(
            self.get_queryset().get(pk=room.pk), context={'request': request},
        ).data
        return Response(out, status=code)

    @action(detail=True, methods=['post'], url_path='leave')
    def leave(self, request, pk=None):
        room = self.get_object()
        member = room.members.filter(user_id=request.user.id).first()
        if member and member.role == StyleRoomMember.ROLE_OWNER:
            return Response(
                {'error': 'مالک نمی‌تواند اتاق را ترک کند؛ می‌تواند اتاق را حذف کند.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if member:
            member.delete()
            log_room_event(room, request.user, EVENT_ROOM_MEMBER_LEFT, {
                'user_id': request.user.id, 'username': request.user.username,
            })
        return Response({'status': 'ok', 'left': True})

    # ─── Items ──────────────────────────────────────────────

    def _item_queryset(self, room):
        """Shared, fully-prefetched item queryset used by GET and POST /items/.

        Product relations are select_related and images/wishlists prefetched so the
        item/product/added_by serializers never fall back to per-object queries.
        """
        return room.items.select_related(
            'product', 'product__brand', 'product__category', 'added_by', 'added_by__profile',
        ).prefetch_related(
            Prefetch(
                'product__images',
                queryset=ProductImage.objects.only(
                    'id', 'product_id', 'image', 'is_primary', 'order',
                ).order_by('order', 'id'),
                to_attr='_prefetched_images',
            ),
            Prefetch(
                'added_by__wishlist',
                queryset=Wishlist.objects.select_related('product__category'),
            ),
        )

    @action(detail=True, methods=['get', 'post'], url_path='items')
    def items(self, request, pk=None):
        room = self.get_object()
        if request.method == 'GET':
            queryset = self._item_queryset(room).order_by('-created_at', '-id')
            page = self.paginate_queryset(queryset)
            data = StyleRoomItemSerializer(page, many=True, context={'request': request}).data
            return self.get_paginated_response(data)

        # POST → any member may add a product (server-side validation).
        serializer = StyleRoomItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product_id = serializer.validated_data['product_id']
        product = Product.objects.filter(id=product_id, is_active=True).first()
        if not product:
            return Response(
                {'error': 'محصول مورد نظر یافت نشد یا غیرفعال است.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        item, created = add_item(room, product, added_by=request.user)
        if not created:
            return Response({'error': 'این محصول قبلاً در اتاق وجود دارد.'}, status=status.HTTP_400_BAD_REQUEST)
        item = self._item_queryset(room).get(pk=item.pk)
        return Response(
            StyleRoomItemSerializer(item, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    def _message_queryset(self, room, user):
        return room.messages.filter(style_room=room).select_related(
            'sender', 'sender__profile', 'product', 'product__brand', 'product__category',
        ).prefetch_related(
            Prefetch(
                'product__images',
                queryset=ProductImage.objects.only(
                    'id', 'product_id', 'image', 'is_primary', 'order',
                ).order_by('order', 'id'),
                to_attr='_prefetched_images',
            ),
            Prefetch(
                'style_room_reads',
                queryset=StyleRoomMessageRead.objects.filter(user=user),
                to_attr='_my_room_reads',
            ),
        # Return the newest page first; the client renders merged pages in
        # chronological order and loads older pages at the top of the chat.
        ).order_by('-created_at', '-id')

    @action(detail=True, methods=['get', 'post'], url_path='messages')
    def messages(self, request, pk=None):
        room = self.get_object()
        if request.method == 'GET':
            page = self.paginate_queryset(self._message_queryset(room, request.user))
            data = StyleRoomMessageSerializer(
                page, many=True, context={'request': request},
            ).data
            return self.get_paginated_response(data)

        serializer = StyleRoomMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = create_room_message(
            room,
            request.user,
            text=serializer.validated_data.get('text', ''),
            product=serializer.validated_data.get('product'),
        )
        message = self._message_queryset(room, request.user).get(pk=message.pk)
        return Response(
            StyleRoomMessageSerializer(message, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='messages/read')
    def mark_messages_read(self, request, pk=None):
        room = self.get_object()
        serializer = StyleRoomMessageReadSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        message_ids = serializer.validated_data.get('message_ids')
        if message_ids is not None:
            available = set(
                room.messages.filter(style_room=room, id__in=message_ids)
                .values_list('id', flat=True)
            )
            missing = sorted(set(message_ids) - available)
            if missing:
                raise NotFound('یک یا چند پیام در این اتاق پیدا نشد.')
        count = mark_room_messages_read(room, request.user, message_ids)
        return Response({'marked_read': count})

    @action(detail=True, methods=['delete'], url_path=r'items/(?P<item_id>[0-9]+)')
    def remove_item(self, request, pk=None, item_id=None):
        room = self.get_object()
        item = room.items.select_related('product').filter(id=item_id).first()
        if not item:
            return Response({'error': 'آیتم یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        is_owner = room.owner_id == request.user.id
        is_adder = item.added_by_id == request.user.id
        if not (is_owner or is_adder):
            return Response({'error': 'شما اجازه حذف این آیتم را ندارید.'}, status=status.HTTP_403_FORBIDDEN)
        removed = {'product_id': item.product_id, 'product_name': item.product.name}
        item.delete()
        log_room_event(room, request.user, EVENT_ROOM_ITEM_REMOVED, removed)
        return Response({'status': 'ok', 'removed': True})

    # ─── Activity ───────────────────────────────────────────

    def _event_queryset(self, room):
        """Events with actor relations + actor wishlist prefetched (avoids N+1)."""
        return room.events.select_related(
            'actor', 'actor__profile',
        ).prefetch_related(
            Prefetch(
                'actor__wishlist',
                queryset=Wishlist.objects.select_related('product__category'),
            ),
        ).order_by('-created_at', '-id')

    @action(detail=True, methods=['get'], url_path='activity')
    def activity(self, request, pk=None):
        room = self.get_object()
        queryset = self._event_queryset(room)
        page = self.paginate_queryset(queryset)
        data = StyleRoomEventSerializer(page, many=True, context={'request': request}).data
        return self.get_paginated_response(data)
