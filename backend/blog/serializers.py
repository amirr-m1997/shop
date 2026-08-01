from rest_framework import serializers
from .models import BlogCategory, BlogPost


class BlogCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogCategory
        fields = ['id', 'name', 'slug']


class BlogPostListSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = ['id', 'title', 'slug', 'excerpt', 'image', 'category', 'category_name', 'author', 'author_name', 'is_published', 'published_at']

    def get_category_name(self, obj):
        return obj.category.name if obj.category else ''

    def get_author_name(self, obj):
        return obj.author.username if obj.author else ''


class BlogPostDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = ['id', 'title', 'slug', 'excerpt', 'content', 'image', 'category', 'category_name', 'author', 'author_name', 'is_published', 'published_at', 'updated_at']

    def get_category_name(self, obj):
        return obj.category.name if obj.category else ''

    def get_author_name(self, obj):
        return obj.author.username if obj.author else ''
