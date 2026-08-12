from rest_framework import serializers
from .models import BlogCategory, BlogPost
import bleach


class BlogCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogCategory
        fields = ['id', 'name', 'slug']


class BlogPostListSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    author_name = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = ['id', 'title', 'slug', 'excerpt', 'image', 'category', 'category_name', 'author', 'author_name', 'is_published', 'published_at']

    def get_category_name(self, obj):
        return obj.category.name if obj.category else ''

    def get_author_name(self, obj):
        return obj.author.username if obj.author else ''

    def get_image(self, obj):
        return obj.display_image


class BlogPostDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    author_name = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    content = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = ['id', 'title', 'slug', 'excerpt', 'content', 'image', 'category', 'category_name', 'author', 'author_name', 'is_published', 'published_at', 'updated_at']

    def get_category_name(self, obj):
        return obj.category.name if obj.category else ''

    def get_author_name(self, obj):
        return obj.author.username if obj.author else ''

    def get_image(self, obj):
        return obj.display_image

    def get_content(self, obj):
        return bleach.clean(
            obj.content,
            tags={
                'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote',
                'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'a', 'img', 'figure',
                'figcaption', 'code', 'pre', 'hr', 'span', 'div',
            },
            attributes={
                'a': ['href', 'title', 'target', 'rel'],
                'img': ['src', 'alt', 'title', 'width', 'height', 'loading'],
                'span': ['class'], 'div': ['class'],
            },
            protocols={'http', 'https', 'mailto'}, strip=True,
        )
