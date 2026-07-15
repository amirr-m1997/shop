from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as django_filters
from .models import Category, Brand, Size, Color, Fabric, Product, Review, SizeGuide
from .serializers import (CategorySerializer, BrandSerializer, SizeSerializer, ColorSerializer,
                          FabricSerializer, ProductListSerializer, ProductDetailSerializer,
                          ReviewSerializer, SizeGuideSerializer)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']


class BrandViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']


class SizeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Size.objects.all()
    serializer_class = SizeSerializer
    filterset_fields = ['category']


class ColorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Color.objects.all()
    serializer_class = ColorSerializer


class FabricViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Fabric.objects.all()
    serializer_class = FabricSerializer


class ProductFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name='price', lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name='price', lookup_expr='lte')
    size = django_filters.CharFilter(method='filter_by_size')
    color = django_filters.CharFilter(method='filter_by_color')

    class Meta:
        model = Product
        fields = ['category', 'brand', 'main_category', 'is_featured', 'is_new_arrival', 'is_trending', 'compare_price']

    def filter_by_size(self, queryset, name, value):
        size_ids = [int(x) for x in value.split(',') if x.isdigit()]
        if size_ids:
            return queryset.filter(variants__size__id__in=size_ids).distinct()
        return queryset

    def filter_by_color(self, queryset, name, value):
        color_ids = [int(x) for x in value.split(',') if x.isdigit()]
        if color_ids:
            return queryset.filter(variants__color__id__in=color_ids).distinct()
        return queryset


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.filter(is_active=True)
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ['name', 'description', 'sku']
    ordering_fields = ['price', 'created_at', 'rating', 'name']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProductDetailSerializer
        return ProductListSerializer


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['product', 'rating']
    ordering = ['-created_at']


class SizeGuideViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SizeGuide.objects.all()
    serializer_class = SizeGuideSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['category']
