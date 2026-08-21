from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth import get_user_model
from .models import Block, Conversation, Message, Notification
from products.serializers import ProductListSerializer


# Maximum length of a chat text message. Keeps messages from becoming huge
# payloads while still being generous for normal conversation.
MAX_MESSAGE_LENGTH = 2000


class PublicUserSerializer(serializers.ModelSerializer):
    """اطلاعات عمومی یک کاربر برای جستجو و نمایش در گفتگو."""
    display_name = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    style_preferences = serializers.SerializerMethodField()
    popular_categories = serializers.SerializerMethodField()
    last_seen_at = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'display_name', 'avatar', 'first_name', 'last_name',
                  'style_preferences', 'popular_categories', 'last_seen_at']

    def get_last_seen_at(self, obj):
        request = self.context.get('request')
        viewer = getattr(request, 'user', None) if request else None
        # Presence is only exposed inside an accepted, unblocked conversation.
        # Search and generic public-user payloads must not reveal activity data.
        if not self.context.get('allow_presence', False):
            return None
        profile = getattr(obj, 'profile', None)
        if not profile or getattr(profile, 'hide_last_seen', False):
            return None
        return profile.last_seen_at

    def get_display_name(self, obj):
        if obj.username in ['stylist', 'support'] or obj.is_superuser:
            return 'استایلیست مد و پشتیبانی 👔✨'
        profile = getattr(obj, 'profile', None)
        if profile and (profile.first_name or profile.last_name):
            return f'{profile.first_name} {profile.last_name}'.strip()
        return obj.username

    def get_avatar(self, obj):
        profile = getattr(obj, 'profile', None)
        if profile and profile.avatar:
            return profile.avatar.url
        return ''

    def get_style_preferences(self, obj):
        profile = getattr(obj, 'profile', None)
        if profile:
            return list(profile.style_preferences or [])
        return []

    def get_popular_categories(self, obj):
        """دسته‌بندی‌های محبوب کاربر بر اساس علاقه‌مندی‌های (لایک‌های) او."""
        from collections import Counter
        categories = Counter()
        prefetched = getattr(obj, '_prefetched_objects_cache', {})
        if 'wishlist' in prefetched:
            items = obj.wishlist.all()
        else:
            items = obj.wishlist.select_related('product__category').all()
        for item in items:
            category = getattr(item.product, 'category', None)
            if category:
                categories[category.name] += 1
        return [name for name, _ in categories.most_common(5)]


class ProductShareSerializer(ProductListSerializer):
    """محصول همراه با URL کامل برای نمایش داخل کارت چت."""
    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if request and data.get('primary_image'):
            data['primary_image'] = request.build_absolute_uri(data['primary_image'])
        return data


class MessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(source='sender.id', read_only=True)
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    sender_name = serializers.SerializerMethodField()
    product = ProductShareSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    status = serializers.SerializerMethodField()
    reply_to = serializers.SerializerMethodField()
    is_forwarded = serializers.SerializerMethodField()
    deleted_for_everyone = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender_id', 'sender_username', 'sender_name',
                  'text', 'product', 'product_id', 'is_read', 'status', 'reaction', 'is_favorite',
                  'reply_to', 'is_forwarded', 'deleted_for_everyone', 'created_at']
        read_only_fields = ['conversation', 'sender_id', 'sender_username', 'sender_name',
                            'is_read', 'status', 'reaction', 'is_favorite',
                            'reply_to', 'is_forwarded', 'deleted_for_everyone', 'created_at']

    def get_status(self, obj):
        request = self.context.get('request')
        if not request or obj.sender_id != getattr(request.user, 'id', None):
            return None
        receipts = list(getattr(obj, 'receipts', []).all()) if hasattr(obj, 'receipts') else []
        if any(receipt.seen_at for receipt in receipts):
            return 'seen'
        if any(receipt.delivered_at for receipt in receipts):
            return 'delivered'
        if obj.is_read:
            return 'seen'
        return 'sent'

    def get_reply_to(self, obj):
        reply = obj.reply_to
        if not reply:
            return None
        hidden = bool(reply.deleted_at)
        request = self.context.get('request')
        viewer = getattr(request, 'user', None) if request else None
        if not hidden and viewer and getattr(viewer, 'is_authenticated', False):
            prefetched = getattr(reply, '_prefetched_objects_cache', {})
            deleted_for = prefetched.get('deleted_for')
            hidden = (
                any(user.pk == viewer.pk for user in deleted_for)
                if deleted_for is not None else reply.deleted_for.filter(pk=viewer.pk).exists()
            )
        if hidden:
            return {'id': reply.id, 'text': '', 'sender_name': '', 'deleted': True}
        return {
            'id': reply.id,
            'text': (reply.text or '')[:140],
            'sender_name': getattr(reply.sender, 'username', ''),
            'deleted': False,
        }

    def get_is_forwarded(self, obj):
        return bool(obj.forwarded_from_id)

    def get_deleted_for_everyone(self, obj):
        return bool(obj.deleted_at)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.deleted_at:
            data['text'] = ''
            data['product'] = None
            data['deleted_for_everyone'] = True
        return data

    def get_sender_name(self, obj):
        profile = getattr(obj.sender, 'profile', None)
        if profile and (profile.first_name or profile.last_name):
            return f'{profile.first_name} {profile.last_name}'.strip()
        return obj.sender.username

    def validate(self, attrs):
        if not attrs.get('text') and not attrs.get('product_id'):
            raise serializers.ValidationError({'text': 'متن پیام یا محصول الزامی است.'})
        return attrs


class SendMessageSerializer(serializers.Serializer):
    text = serializers.CharField(required=False, allow_blank=True, max_length=MAX_MESSAGE_LENGTH)
    product_id = serializers.IntegerField(required=False, allow_null=True)


class ConversationSerializer(serializers.ModelSerializer):
    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    is_requester = serializers.SerializerMethodField()
    is_blocked = serializers.SerializerMethodField()
    blocked_by_me = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'other_user', 'status', 'is_requester', 'is_blocked', 'blocked_by_me',
                  'created_at', 'updated_at', 'last_message', 'unread_count']

    def get_other_user(self, obj):
        request = self.context.get('request')
        user = request.user if request else None
        other = obj.other_user(user) if user else obj.user2
        user = request.user if request else None
        blocked = bool(user and Block.is_blocked(user, other))
        context = {**self.context, 'allow_presence': obj.status == Conversation.STATUS_ACCEPTED and not blocked}
        return PublicUserSerializer(other, context=context).data

    def get_last_message(self, obj):
        if hasattr(obj, '_last_message_id'):
            last_id = obj._last_message_id
            if last_id is None:
                return None
            return {
                'id': last_id,
                'text': (obj._last_message_text or '')[:100],
                'has_product': bool(obj._last_message_product_id),
                'sender_id': obj._last_message_sender_id,
                'created_at': obj._last_message_created_at,
            }
        request = self.context.get('request')
        prefetched = getattr(obj, 'prefetched_messages', None)
        if prefetched is not None:
            last = prefetched[0] if prefetched else None
        else:
            qs = obj.messages.filter(deleted_at__isnull=True)
            if request:
                qs = qs.exclude(deleted_for=request.user)
            last = qs.order_by('-created_at', '-id').first()

        if last:
            return {
                'id': last.id,
                'text': last.text[:100],
                'has_product': bool(last.product_id),
                'sender_id': last.sender_id,
                'created_at': last.created_at,
            }
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if not request:
            return 0
        if hasattr(obj, '_unread_count'):
            return obj._unread_count or 0
        prefetched = getattr(obj, 'prefetched_messages', None)
        if prefetched is not None:
            return sum(
                1 for m in prefetched
                if not m.is_read and m.sender_id != request.user.id
            )
        return obj.messages.exclude(deleted_for=request.user).filter(
            deleted_at__isnull=True, is_read=False,
        ).exclude(sender=request.user).count()

    def get_is_requester(self, obj):
        request = self.context.get('request')
        if not request:
            return False
        return obj.is_requester(request.user)

    def get_is_blocked(self, obj):
        request = self.context.get('request')
        if hasattr(obj, '_is_blocked'):
            return bool(obj._is_blocked)
        if not request:
            return False
        return obj.is_blocked(request.user)

    def get_blocked_by_me(self, obj):
        request = self.context.get('request')
        if hasattr(obj, '_blocked_by_me'):
            return bool(obj._blocked_by_me)
        if not request:
            return False
        return obj.i_blocked(request.user)


class ConversationCreateSerializer(serializers.Serializer):
    username = serializers.CharField(required=False, allow_blank=True)
    user_id = serializers.IntegerField(required=False, allow_null=True)


class NotificationSerializer(serializers.ModelSerializer):
    actor = PublicUserSerializer(read_only=True)
    conversation_id = serializers.IntegerField(source='conversation.id', read_only=True)
    product = ProductShareSerializer(read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'recipient', 'actor', 'conversation', 'conversation_id', 'product',
                  'text', 'is_read', 'created_at']
        read_only_fields = ['recipient', 'actor', 'conversation', 'product', 'text', 'is_read', 'created_at']
