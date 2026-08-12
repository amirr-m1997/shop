from rest_framework import viewsets, permissions
from django.db import connection
from django.db.models import Q
from .models import BlogCategory, BlogPost
from .serializers import BlogCategorySerializer, BlogPostListSerializer, BlogPostDetailSerializer


class BlogCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BlogCategory.objects.all()
    serializer_class = BlogCategorySerializer
    permission_classes = [permissions.AllowAny]


class BlogPostViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BlogPost.objects.filter(is_published=True)
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'
    lookup_value_regex = r'[^/]+'

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return BlogPostDetailSerializer
        return BlogPostListSerializer

    def get_queryset(self):
        qs = super().get_queryset().select_related('category', 'author')
        category = self.request.query_params.get('category')
        search = self.request.query_params.get('search')
        if category:
            qs = qs.filter(category__slug=category)
        if search:
            if connection.vendor == 'postgresql':
                from django.contrib.postgres.search import SearchQuery, SearchVector
                vector = SearchVector('title', 'excerpt', 'content', config='simple')
                qs = qs.annotate(_search=vector).filter(
                    _search=SearchQuery(search, config='simple', search_type='websearch')
                )
            else:
                qs = qs.filter(
                    Q(title__icontains=search)
                    | Q(excerpt__icontains=search)
                    | Q(content__icontains=search)
                )
        return qs
