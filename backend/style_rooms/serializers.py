from rest_framework import serializers

from chat.serializers import PublicUserSerializer, ProductShareSerializer
from products.models import Product
from chat.models import Message

from .models import StyleRoom, StyleRoomEvent, StyleRoomItem, StyleRoomMember


class StyleRoomMessageSerializer(serializers.ModelSerializer):
    sender = PublicUserSerializer(read_only=True)
    product = ProductShareSerializer(read_only=True, allow_null=True)
    is_read = serializers.SerializerMethodField()
    read_count = serializers.SerializerMethodField()
    read_by_all = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'sender', 'text', 'product', 'created_at', 'is_read', 'read_count', 'read_by_all']
        read_only_fields = fields

    def get_is_read(self, obj):
        return bool(getattr(obj, '_my_room_reads', []))

    def get_read_count(self, obj):
        all_reads = getattr(obj, '_all_room_reads', None)
        if all_reads is None:
            return obj.style_room_reads.exclude(user_id=obj.sender_id).count()
        return sum(1 for r in all_reads if r.user_id != obj.sender_id)

    def get_read_by_all(self, obj):
        member_count = self.context.get('member_count')
        if member_count is None:
            return False
        return member_count > 1 and self.get_read_count(obj) >= member_count - 1


class StyleRoomMessageCreateSerializer(serializers.Serializer):
    text = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    product_id = serializers.PrimaryKeyRelatedField(
        source='product', queryset=Product.objects.filter(is_active=True),
        required=False, allow_null=True,
    )

    def validate(self, attrs):
        text = (attrs.get('text') or '').strip()
        product = attrs.get('product')
        if not text and product is None:
            raise serializers.ValidationError(
                {'text': 'متن پیام یا محصول الزامی است.'}
            )
        attrs['text'] = text
        return attrs


class StyleRoomMessageReadSerializer(serializers.Serializer):
    message_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), required=False,
    )

    def validate_message_ids(self, value):
        if not value:
            raise serializers.ValidationError('حداقل یک پیام لازم است.')
        if len(value) != len(set(value)):
            raise serializers.ValidationError('شناسه پیام تکراری است.')
        return value


class StyleRoomMemberSerializer(serializers.ModelSerializer):
    user = PublicUserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    username = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = StyleRoomMember
        fields = ['id', 'user', 'user_id', 'username', 'role', 'joined_at']
        read_only_fields = ['role', 'joined_at']


class StyleRoomItemSerializer(serializers.ModelSerializer):
    product = ProductShareSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)
    added_by = PublicUserSerializer(read_only=True)
    # Read-only convenience flag: the product was added while active but is
    # currently deactivated (or the referenced product no longer exists).
    is_unavailable = serializers.SerializerMethodField()

    class Meta:
        model = StyleRoomItem
        fields = ['id', 'product', 'product_id', 'added_by', 'is_unavailable', 'created_at']
        read_only_fields = ['added_by', 'created_at']

    def get_is_unavailable(self, obj):
        return bool(not getattr(obj.product, 'is_active', True))


class StyleRoomSerializer(serializers.ModelSerializer):
    owner = PublicUserSerializer(read_only=True)
    cover = serializers.ImageField(required=False, allow_null=True)
    member_count = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()

    class Meta:
        model = StyleRoom
        fields = [
            'id', 'owner', 'title', 'description', 'cover', 'visibility',
            'member_count', 'item_count', 'is_owner', 'my_role',
            'can_delete',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['owner', 'id', 'created_at', 'updated_at']

    def get_member_count(self, obj):
        value = getattr(obj, '_member_count', None)
        if value is not None:
            return value
        return obj.members.count()

    def get_item_count(self, obj):
        value = getattr(obj, '_item_count', None)
        if value is not None:
            return value
        return obj.items.count()

    def get_is_owner(self, obj):
        request = self.context.get('request')
        return bool(request and request.user and obj.owner_id == request.user.id)

    def get_can_delete(self, obj):
        request = self.context.get('request')
        if not request or not request.user:
            return False
        profile = getattr(request.user, 'profile', None)
        return bool(
            obj.owner_id == request.user.id
            or request.user.is_staff
            or request.user.is_superuser
            or (profile and profile.is_admin_user)
        )

    def get_my_role(self, obj):
        request = self.context.get('request')
        if request and request.user:
            membership = getattr(obj, 'my_membership', None)
            if membership:
                return membership[0].role
        return None


class StyleRoomEventSerializer(serializers.ModelSerializer):
    actor = PublicUserSerializer(read_only=True)

    class Meta:
        model = StyleRoomEvent
        fields = ['id', 'type', 'actor', 'payload', 'created_at']
        read_only_fields = ['type', 'actor', 'payload', 'created_at']
