from rest_framework import viewsets, filters, permissions
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as django_filters
from django.db.models import F
from .models import Category, Brand, Size, Color, Fabric, Product, Review, SizeGuide, HomepageSection, Banner, StyleLook, Wishlist
from .serializers import (CategorySerializer, BrandSerializer, SizeSerializer, ColorSerializer,
                          FabricSerializer, ProductListSerializer, ProductDetailSerializer,
                          ReviewSerializer, SizeGuideSerializer, HomepageSectionSerializer,
                          BannerSerializer, StyleLookSerializer, WishlistSerializer)


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
    filter_backends = [DjangoFilterBackend]
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
    min_rating = django_filters.NumberFilter(field_name='rating', lookup_expr='gte')
    size = django_filters.CharFilter(method='filter_by_size')
    color = django_filters.CharFilter(method='filter_by_color')
    has_discount = django_filters.BooleanFilter(method='filter_by_discount')
    category_slug = django_filters.CharFilter(method='filter_by_category_slug')
    in_stock = django_filters.BooleanFilter(method='filter_in_stock')  # ✅ فیلتر موجودی

    class Meta:
        model = Product
        fields = ['category', 'brand', 'main_category', 'fabric',
                  'is_featured', 'is_new_arrival', 'is_trending']

    def filter_by_discount(self, queryset, name, value):
        """فیلتر محصولات دارای تخفیف"""
        if value:
            return queryset.filter(
                compare_price__isnull=False,
                compare_price__gt=F('price')  # ✅ اصلاح شد
            )
        return queryset

    def filter_by_size(self, queryset, name, value):
        """فیلتر بر اساس سایز (چندتایی با کاما)"""
        size_ids = [int(x) for x in value.split(',') if x.isdigit()]
        if size_ids:
            return queryset.filter(variants__size__id__in=size_ids).distinct()
        return queryset

    def filter_by_color(self, queryset, name, value):
        """فیلتر بر اساس رنگ (چندتایی با کاما)"""
        color_ids = [int(x) for x in value.split(',') if x.isdigit()]
        if color_ids:
            return queryset.filter(variants__color__id__in=color_ids).distinct()
        return queryset

    def filter_by_category_slug(self, queryset, name, value):
        """فیلتر بر اساس slug دسته‌بندی (شامل زیرمجموعه‌ها)"""
        if not value:
            return queryset
        try:
            category = Category.objects.get(slug=value)
            # شامل دسته اصلی و تمام زیرمجموعه‌ها
            category_ids = [category.id]

            def get_descendants(cat):
                for child in cat.children.all():
                    category_ids.append(child.id)
                    get_descendants(child)

            get_descendants(category)
            return queryset.filter(category_id__in=category_ids)
        except Category.DoesNotExist:
            return queryset.none()

    def filter_in_stock(self, queryset, name, value):
        """فیلتر محصولات موجود در انبار"""
        if value:
            return queryset.filter(stock__gt=0)
        return queryset.filter(stock=0)


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.filter(is_active=True)
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ['name', 'description', 'sku']
    ordering_fields = ['price', 'created_at', 'rating', 'name']
    ordering = ['-created_at']
    lookup_field = 'slug'

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProductDetailSerializer
        return ProductListSerializer


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['product', 'rating']
    ordering = ['-created_at']

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("فقط نویسنده نظر می‌تواند آن را ویرایش کند.")
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.user != request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("فقط نویسنده نظر می‌تواند آن را حذف کند.")
        return super().destroy(request, *args, **kwargs)


class SizeGuideViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SizeGuide.objects.all()
    serializer_class = SizeGuideSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['category']


class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user).select_related('product')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes
from django.db.models import F, Q


class HomepageSectionsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        sections = HomepageSection.objects.filter(is_active=True)
        serializer = HomepageSectionSerializer(sections, many=True)
        return Response(serializer.data)


class BannerListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        banners = Banner.objects.filter(is_active=True)
        serializer = BannerSerializer(banners, many=True, context={'request': request})
        return Response(serializer.data)


class StyleLookListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        styles = StyleLook.objects.filter(is_active=True)
        serializer = StyleLookSerializer(styles, many=True, context={'request': request})
        return Response(serializer.data)


class StyleLookDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            style = StyleLook.objects.get(slug=slug, is_active=True)
        except StyleLook.DoesNotExist:
            return Response({'error': 'استایل یافت نشد'}, status=404)
        serializer = StyleLookSerializer(style, context={'request': request})
        return Response(serializer.data)


class RecommendationsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        product_id = request.query_params.get('product_id')
        if product_id:
            try:
                product = Product.objects.get(id=product_id)
                recommendations = Product.objects.filter(
                    is_active=True,
                    category=product.category,
                ).exclude(id=product.id).order_by('-rating', '-created_at')[:8]
            except Product.DoesNotExist:
                recommendations = Product.objects.filter(
                    is_active=True, is_trending=True
                ).order_by('-rating')[:8]
        else:
            recommendations = Product.objects.filter(
                is_active=True, is_trending=True
            ).order_by('-rating')[:8]

        serializer = ProductListSerializer(recommendations, many=True)
        return Response(serializer.data)


class SizeRecommendationView(APIView):
    """پیشنهاد سایز بر اساس اندازه‌های بدن کاربر"""
    permission_classes = [AllowAny]

    def post(self, request):
        height = request.data.get('height')
        weight = request.data.get('weight')
        gender = request.data.get('gender', 'unisex')
        product_type = request.data.get('product_type', 'clothing')
        chest = request.data.get('chest')
        waist = request.data.get('waist')
        hips = request.data.get('hips')

        if not height or not weight:
            return Response(
                {'error': 'قد و وزن الزامی است'},
                status=400
            )

        height = int(height)
        weight = int(weight)
        chest = float(chest) if chest else None
        waist = float(waist) if waist else None
        hips = float(hips) if hips else None

        # دریافت راهنمای سایزها بر اساس جنسیت و نوع محصول
        guides = SizeGuide.objects.filter(
            gender__in=[gender, 'unisex'],
            product_type=product_type,
        ).select_related('size', 'category').order_by('size__name')

        if not guides.exists():
            return Response({
                'recommendations': [],
                'message': 'راهنمای سایزی برای این دسته یافت نشد'
            })

        # گروه‌بندی بر اساس دسته‌بندی
        categories = {}
        for guide in guides:
            cat_id = guide.category.id
            if cat_id not in categories:
                categories[cat_id] = {
                    'category_id': cat_id,
                    'category_name': guide.category.name,
                    'sizes': []
                }
            categories[cat_id]['sizes'].append(guide)

        recommendations = []
        for cat_id, cat_data in categories.items():
            best_size = self._find_best_size(
                cat_data['sizes'], height, weight, chest, waist, hips
            )
            if best_size:
                recommendations.append({
                    'category_id': cat_data['category_id'],
                    'category_name': cat_data['category_name'],
                    'recommended_size': best_size['size'].name,
                    'size_id': best_size['size'].id,
                    'confidence': best_size['confidence'],
                    'guide_id': best_size['guide'].id,
                })

        return Response({
            'recommendations': recommendations,
            'profile': {
                'height': height,
                'weight': weight,
                'gender': gender,
                'product_type': product_type,
                'chest': chest,
                'waist': waist,
                'hips': hips,
            }
        })

    def _find_best_size(self, guides, height, weight, chest, waist, hips):
        best = None
        best_score = -1

        for guide in guides:
            score = 0
            max_score = 0

            # بر اساس قد
            if guide.height_min and guide.height_max:
                max_score += 3
                if guide.height_min <= height <= guide.height_max:
                    score += 3
                elif height < guide.height_min:
                    diff = guide.height_min - height
                    if diff <= 5:
                        score += 2
                    elif diff <= 10:
                        score += 1
                else:
                    diff = height - guide.height_max
                    if diff <= 5:
                        score += 2
                    elif diff <= 10:
                        score += 1

            # بر اساس وزن
            if guide.weight_min and guide.weight_max:
                max_score += 3
                if guide.weight_min <= weight <= guide.weight_max:
                    score += 3
                elif weight < guide.weight_min:
                    diff = guide.weight_min - weight
                    if diff <= 5:
                        score += 2
                    elif diff <= 10:
                        score += 1
                else:
                    diff = weight - guide.weight_max
                    if diff <= 5:
                        score += 2
                    elif diff <= 10:
                        score += 1

            # بر اساس سینه
            if chest and guide.chest:
                try:
                    guide_chest = float(guide.chest)
                    max_score += 2
                    diff = abs(chest - guide_chest)
                    if diff <= 2:
                        score += 2
                    elif diff <= 5:
                        score += 1
                except (ValueError, TypeError):
                    pass

            # بر اساس کمر
            if waist and guide.waist:
                try:
                    guide_waist = float(guide.waist)
                    max_score += 2
                    diff = abs(waist - guide_waist)
                    if diff <= 2:
                        score += 2
                    elif diff <= 5:
                        score += 1
                except (ValueError, TypeError):
                    pass

            # بر اساس باسن
            if hips and guide.hips:
                try:
                    guide_hips = float(guide.hips)
                    max_score += 2
                    diff = abs(hips - guide_hips)
                    if diff <= 2:
                        score += 2
                    elif diff <= 5:
                        score += 1
                except (ValueError, TypeError):
                    pass

            # امتیاز نهایی
            if max_score > 0:
                final_score = score / max_score
            else:
                # اگر اندازه‌ای تعریف نشده بود، بر اساس وزن ساده
                final_score = 0.5

            if final_score > best_score:
                best_score = final_score
                confidence = int(final_score * 100)
                best = {
                    'guide': guide,
                    'size': guide.size,
                    'confidence': min(confidence, 100),
                }

        return best


class MeasurementGuideView(APIView):
    """راهنمای اندازه‌گیری برای هر نوع محصول"""
    permission_classes = [AllowAny]

    def get(self, request):
        product_type = request.query_params.get('product_type', 'clothing')
        gender = request.query_params.get('gender', 'unisex')

        guides = SizeGuide.objects.filter(
            product_type=product_type,
            gender__in=[gender, 'unisex'],
        ).values(
            'category__id', 'category__name', 'size__name',
            'chest', 'waist', 'hips', 'length', 'shoulder', 'sleeve',
            'foot_length', 'inseam', 'height_min', 'height_max',
            'weight_min', 'weight_max', 'measurement_guide'
        ).distinct()

        # گروه‌بندی بر اساس دسته
        categories = {}
        for g in guides:
            cat_id = g['category__id']
            cat_name = g['category__name']
            if cat_id not in categories:
                categories[cat_id] = {
                    'category_id': cat_id,
                    'category_name': cat_name,
                    'sizes': [],
                    'measurement_guide': g['measurement_guide'] or '',
                }
            categories[cat_id]['sizes'].append({
                'size': g['size__name'],
                'chest': g['chest'],
                'waist': g['waist'],
                'hips': g['hips'],
                'length': g['length'],
                'shoulder': g['shoulder'],
                'sleeve': g['sleeve'],
                'foot_length': g['foot_length'],
                'inseam': g['inseam'],
                'height_min': g['height_min'],
                'height_max': g['height_max'],
                'weight_min': g['weight_min'],
                'weight_max': g['weight_max'],
            })

        return Response({
            'product_type': product_type,
            'gender': gender,
            'categories': list(categories.values()),
        })


class CategoriesByRootView(APIView):
    """دسته‌بندی‌ها بر اساس ریشه - برای فیلتر ادمین"""
    permission_classes = [AllowAny]

    def get(self, request):
        root_name = request.query_params.get('root', '')
        if not root_name:
            return Response([])

        # پیدا کردن دسته ریشه با نام
        root_cats = Category.objects.filter(name=root_name, parent__isnull=True)
        if not root_cats.exists():
            # اگر با نام پیدا نشد، همه دسته‌های ریشه رو برگردان
            return Response([])

        root = root_cats.first()

        def serialize(cat, depth=0):
            result = {
                'id': cat.id,
                'name': cat.name,
                'slug': cat.slug,
                'depth': depth,
            }
            children = cat.children.all()
            if children:
                result['children'] = [serialize(c, depth + 1) for c in children]
            return result

        return Response(serialize(root))
