from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth import get_user_model
from .models import Conversation, Message, Notification
from products.serializers import ProductListSerializer


class PublicUserSerializer(serializers.ModelSerializer):
    """اطلاعات عمومی یک کاربر برای جستجو و نمایش در گفتگو."""
    display_name = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'display_name', 'avatar', 'first_name', 'last_name']

    def get_display_name(self, obj):
        profile = getattr(obj, 'profile', None)
        if profile and (profile.first_name or profile.last_name):
            return f'{profile.first_name} {profile.last_name}'.strip()
        return obj.username

    def get_avatar(self, obj):
        profile = getattr(obj, 'profile', None)
        if profile and profile.avatar:
            return profile.avatar.url
        return ''


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

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender_id', 'sender_username', 'sender_name',
                  'text', 'product', 'product_id', 'is_read', 'reaction', 'is_favorite', 'created_at']
        read_only_fields = ['conversation', 'sender_id', 'sender_username', 'sender_name',
                            'is_read', 'reaction', 'is_favorite', 'created_at']

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
    text = serializers.CharField(required=False, allow_blank=True)
    product_id = serializers.IntegerField(required=False, allow_null=True)


class ConversationSerializer(serializers.ModelSerializer):
    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    is_requester = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'other_user', 'status', 'is_requester', 'created_at', 'updated_at',
                  'last_message', 'unread_count']

    def get_other_user(self, obj):
        request = self.context.get('request')
        user = request.user if request else None
        other = obj.other_user(user) if user else obj.user2
        return PublicUserSerializer(other).data

    def get_last_message(self, obj):
        last = obj.messages.order_by('-created_at', '-id').first()
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
        return obj.messages.filter(is_read=False).exclude(sender=request.user).count()

    def get_is_requester(self, obj):
        request = self.context.get('request')
        if not request:
            return False
        return obj.is_requester(request.user)


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
