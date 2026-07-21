from rest_framework import serializers
from .models import FAQ, ContactInfo, ContactMessage, LookbookItem, SiteSettings, Testimonial, SiteFeature


class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = ['id', 'question', 'answer']


class ContactInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactInfo
        fields = '__all__'


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ['id', 'name', 'email', 'message', 'is_read', 'created_at']
        read_only_fields = ['id', 'is_read', 'created_at']


class LookbookItemSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = LookbookItem
        fields = ['id', 'title', 'description', 'image', 'image_url', 'order']

    def get_image(self, obj):
        if obj.image:
            request = self.context.get('request')
            url = obj.image.url
            if request:
                return request.build_absolute_uri(url)
            return url
        return obj.image_url or ''


class SiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = '__all__'


class SiteFeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteFeature
        fields = ['id', 'title', 'description', 'icon', 'color', 'bg_color', 'order', 'is_active']


class TestimonialReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Testimonial
        fields = ['id', 'name', 'role', 'text', 'rating', 'is_featured', 'created_at']


class TestimonialWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Testimonial
        fields = ['id', 'name', 'role', 'text', 'rating']
        read_only_fields = ['id']

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("امتیاز باید بین ۱ تا ۵ باشد.")
        return value

    def create(self, validated_data):
        user = self.context['request'].user
        if user.is_authenticated:
            validated_data['user'] = user
            if not validated_data.get('name'):
                validated_data['name'] = user.get_full_name() or user.username
        return super().create(validated_data)
