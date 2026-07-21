from rest_framework import serializers
from .models import BlogCategory, BlogPost


class BlogCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogCategory
        fields = ['id', 'name', 'slug']


class BlogPostListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default='')
    author_name = serializers.CharField(source='author.username', read_only=True, default='')

    class Meta:
        model = BlogPost
        fields = ['id', 'title', 'slug', 'excerpt', 'image', 'category', 'category_name', 'author', 'author_name', 'is_published', 'published_at']


class BlogPostDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default='')
    author_name = serializers.CharField(source='author.username', read_only=True, default='')

    class Meta:
        model = BlogPost
        fields = ['id', 'title', 'slug', 'excerpt', 'content', 'image', 'category', 'category_name', 'author', 'author_name', 'is_published', 'published_at', 'updated_at']
