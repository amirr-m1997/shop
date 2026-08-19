from rest_framework import serializers

from chat.serializers import ProductShareSerializer
from .models import SupportConversation, SupportMessage


MAX_MESSAGE_LENGTH = 2000


class SupportUserSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)
    display_name = serializers.SerializerMethodField()

    def get_display_name(self, obj):
        profile = getattr(obj, 'profile', None)
        if profile and (profile.first_name or profile.last_name):
            return f'{profile.first_name} {profile.last_name}'.strip()
        return obj.get_full_name() or obj.username


class SupportMessageSerializer(serializers.ModelSerializer):
    sender = SupportUserSerializer(read_only=True)
    product = ProductShareSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = SupportMessage
        fields = ['id', 'sender', 'text', 'product', 'product_id', 'is_read', 'created_at']
        read_only_fields = ['id', 'sender', 'product', 'is_read', 'created_at']


class SupportMessageCreateSerializer(serializers.Serializer):
    text = serializers.CharField(required=False, allow_blank=True, max_length=MAX_MESSAGE_LENGTH)
    product_id = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, attrs):
        if not attrs.get('text', '').strip() and not attrs.get('product_id'):
            raise serializers.ValidationError({'text': 'Text or product is required.'})
        return attrs


class SupportConversationSerializer(serializers.ModelSerializer):
    customer = SupportUserSerializer(read_only=True)
    assigned_agent = SupportUserSerializer(read_only=True)
    unread_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = SupportConversation
        fields = [
            'id', 'customer', 'department', 'status', 'priority', 'assigned_agent',
            'created_at', 'updated_at', 'closed_at', 'last_message_at',
            'last_message', 'unread_count',
        ]
        read_only_fields = fields

    def get_last_message(self, obj):
        messages = getattr(obj, '_last_message', None)
        message = messages[0] if messages else obj.messages.order_by('-created_at', '-id').first()
        if not message:
            return None
        return {
            'text': (message.text or '')[:200],
            'sender_id': message.sender_id,
            'created_at': message.created_at,
        }

    def get_unread_count(self, obj):
        user = self.context['request'].user
        return obj.messages.filter(is_read=False).exclude(sender=user).count()


class SupportConversationCreateSerializer(serializers.Serializer):
    department = serializers.ChoiceField(choices=SupportConversation.DEPARTMENT_CHOICES)
