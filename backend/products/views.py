from rest_framework import viewsets, filters, permissions
from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as django_filters
from django.db.models import F, Prefetch
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from .models import (
    Category, Brand, Size, Color, Fabric, Product, ProductImage, Review, SizeGuide,
    HomepageSection, Banner, StyleLook, Wishlist, sizes_for_category,
)
from .serializers import (CategorySerializer, BrandSerializer, SizeSerializer, ColorSerializer,
                          FabricSerializer, ProductListSerializer, ProductDetailSerializer,
                          ReviewSerializer, SizeGuideSerializer, HomepageSectionSerializer,
                          BannerSerializer, StyleLookSerializer, WishlistSerializer)
from dashboard.permissions import IsAdminUser
from personalization.models import EventType
from personalization.services import record_behavior, record_product_view


class DatabaseAwareProductSearchFilter(filters.SearchFilter):
    """Use PostgreSQL full-text search while preserving SQLite development."""
    def filter_queryset(self, request, queryset, view):
        term = request.query_params.get(self.search_param, '').strip()
        if not term or connection.vendor != 'postgresql':
            return super().filter_queryset(request, queryset, view)
        from django.contrib.postgres.search import SearchQuery, SearchVector
        vector = SearchVector('name', 'description', 'sku', config='simple')
        return queryset.annotate(_search=vector).filter(
            _search=SearchQuery(term, config='simple', search_type='websearch')
        )


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.prefetch_related('children').order_by('order', 'name', 'id')
    serializer_class = CategorySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']


class BrandViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Brand.objects.order_by('name', 'id')
    serializer_class = BrandSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']


class SizeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Size.objects.order_by('category_id', 'name', 'id')
    serializer_class = SizeSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['category']


class ColorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Color.objects.order_by('name', 'id')
    serializer_class = ColorSerializer


class FabricViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Fabric.objects.order_by('name', 'id')
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
            category_ids = [category.id]

            def get_descendants(cat):
                children = cat.children.all()
                for child in children:
                    category_ids.append(child.id)
                    get_descendants(child)

            get_descendants(category)
            return queryset.filter(category_id__in=category_ids)
        except Category.DoesNotExist:
            return queryset.none()

    def filter_in_stock(self, queryset, name, value):
        """فیلتر کردن بر اساس موجودی انبار (شامل واریانت‌ها)"""
        from django.db.models import Q
        in_stock_q = Q(stock__gt=0) | Q(variants__stock__gt=0)
        if value:
            return queryset.filter(in_stock_q).distinct()
        return queryset.exclude(in_stock_q).distinct()


class ProductPagination(PageNumberPagination):
    page_size = 24
    page_size_query_param = 'page_size'
    max_page_size = 48


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.filter(is_active=True)
    pagination_class = ProductPagination
    filter_backends = [DjangoFilterBackend, DatabaseAwareProductSearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ['name', 'description', 'sku']
    ordering_fields = ['price', 'created_at', 'rating', 'name']
    ordering = ['-created_at']
    lookup_field = 'slug'

    def get_queryset(self):
        queryset = Product.objects.filter(is_active=True).select_related(
            'brand', 'category',
        )
        if self.action == 'retrieve':
            return queryset.select_related('fabric').prefetch_related(
                'images__color', 'variants__size', 'variants__color',
            )
        return queryset.prefetch_related(
            Prefetch(
                'images',
                queryset=ProductImage.objects.only(
                    'id', 'product_id', 'image', 'is_primary', 'order',
                ).order_by('order', 'id'),
                to_attr='_prefetched_images',
            )
        )

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProductDetailSerializer
        return ProductListSerializer

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        term = request.query_params.get('search', '').strip()
        if request.user.is_authenticated and term:
            record_behavior(
                user=request.user,
                event_type=EventType.SEARCH,
                source='product_list',
                metadata={'query': term[:200]},
            )
        return response

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        if response.status_code == 200 and request.user.is_authenticated:
            record_product_view(user=request.user, product=self.get_object())
        return response


@api_view(['GET'])
@permission_classes([AllowAny])
def max_price_view(request):
    """بیشترین قیمت محصولات"""
    from django.db.models import Max
    max_price = Product.objects.filter(is_active=True).aggregate(Max('price'))['price__max']
    return Response({'max_price': int(max_price) if max_price else 5000000})


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.order_by('-created_at', '-id')
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['product', 'rating']
    ordering = ['-created_at']

    def get_queryset(self):
        return Review.objects.select_related('user', 'product').order_by('-created_at', '-id')

    def perform_create(self, serializer):
        from django.db import transaction

        product = serializer.validated_data['product']
        if Review.objects.filter(user=self.request.user, product=product).exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'product': ['شما قبلاً برای این محصول نظر ثبت کرده‌اید.']})
        with transaction.atomic():
            review = serializer.save(user=self.request.user)
            review.product.update_rating()
            from loyalty.services import REVIEW_SUBMISSION_EVENT_CODE, award_points_for_event
            award_points_for_event(
                user=self.request.user,
                event_type_code=REVIEW_SUBMISSION_EVENT_CODE,
                idempotency_key=f'review-submission:user:{self.request.user.pk}:product:{review.product_id}',
                product=review.product,
                description='Review submission reward',
                metadata={'source': 'products.review_create', 'review_id': review.pk},
            )
            record_behavior(
                user=self.request.user,
                event_type=EventType.REVIEW,
                product=review.product,
                source='review_create',
                idempotency_key=f'review:{review.pk}',
                metadata={'review_id': review.pk},
            )

    def perform_update(self, serializer):
        if serializer.instance.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("فقط نویسنده نظر می‌تواند آن را ویرایش کند.")
        review = serializer.save()
        review.product.update_rating()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.user != request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("فقط نویسنده نظر می‌تواند آن را حذف کند.")
        product = instance.product
        response = super().destroy(request, *args, **kwargs)
        product.update_rating()
        return response


class SizeGuideViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SizeGuide.objects.order_by('category_id', 'size_id', 'id')
    serializer_class = SizeGuideSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['category']


class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user).select_related(
            'product', 'product__brand', 'product__category',
        ).prefetch_related('product__images').order_by('-created_at', '-id')

    def perform_create(self, serializer):
        product_id = serializer.validated_data.get('product_id')
        if product_id and Wishlist.objects.filter(user=self.request.user, product_id=product_id).exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'product_id': ['این محصول قبلاً به لیست علاقه‌مندی اضافه شده است.']})
        wishlist = serializer.save(user=self.request.user)
        record_behavior(
            user=self.request.user,
            event_type=EventType.WISHLIST_ADD,
            product=wishlist.product,
            source='wishlist_add',
            idempotency_key=f'wishlist-add:{wishlist.pk}',
            metadata={'wishlist_id': wishlist.pk},
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        record_behavior(
            user=request.user,
            event_type=EventType.WISHLIST_REMOVE,
            product=instance.product,
            source='wishlist_remove',
            idempotency_key=f'wishlist-remove:{instance.pk}',
            metadata={'wishlist_id': instance.pk},
        )
        return super().destroy(request, *args, **kwargs)


class HomepageSectionsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        sections = list(HomepageSection.objects.filter(is_active=True))
        _prepare_homepage_sections(sections)
        serializer = HomepageSectionSerializer(sections, many=True)
        return Response(serializer.data)


def _prepare_homepage_sections(sections):
    """Resolve section membership first, then hydrate every unique product once."""
    product_ids_by_key = {}
    for section in sections:
        key = (section.filter_type, section.filter_value)
        if key not in product_ids_by_key:
            product_ids_by_key[key] = list(
                section.get_products().values_list('id', flat=True)
            )

    all_ids = {pk for ids in product_ids_by_key.values() for pk in ids}
    products = Product.objects.filter(pk__in=all_ids).select_related(
        'brand', 'category',
    ).prefetch_related(
        Prefetch(
            'images',
            queryset=ProductImage.objects.only(
                'id', 'product_id', 'image', 'is_primary', 'order',
            ).order_by('order', 'id'),
            to_attr='_prefetched_images',
        )
    )
    products_by_id = {product.id: product for product in products}
    for section in sections:
        ids = product_ids_by_key[(section.filter_type, section.filter_value)]
        section._optimized_products = [products_by_id[pk] for pk in ids if pk in products_by_id]


class BannerListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        banners = Banner.objects.filter(is_active=True)
        serializer = BannerSerializer(banners, many=True, context={'request': request})
        return Response(serializer.data)


class StyleLookListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from django.db.models import Prefetch
        styles = StyleLook.objects.filter(is_active=True).prefetch_related(
            Prefetch(
                'products',
                queryset=Product.objects.filter(is_active=True).select_related(
                    'brand', 'category',
                ).prefetch_related('images'),
            )
        )
        serializer = StyleLookSerializer(styles, many=True, context={'request': request})
        return Response(serializer.data)


class StyleLookDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        from django.db.models import Prefetch
        try:
            style = StyleLook.objects.prefetch_related(
                Prefetch(
                    'products',
                    queryset=Product.objects.filter(is_active=True).select_related(
                        'brand', 'category',
                    ).prefetch_related('images'),
                )
            ).get(slug=slug, is_active=True)
        except StyleLook.DoesNotExist:
            return Response({'error': 'استایل یافت نشد'}, status=404)
        serializer = StyleLookSerializer(style, context={'request': request})
        return Response(serializer.data)


class RecommendationsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        product_id = request.query_params.get('product_id')
        base_qs = Product.objects.filter(is_active=True).select_related(
            'brand', 'category',
        ).prefetch_related('images')
        if product_id:
            try:
                product = Product.objects.get(id=product_id)
                recommendations = base_qs.filter(
                    category=product.category,
                ).exclude(id=product.id).order_by('-rating', '-created_at')[:8]
            except Product.DoesNotExist:
                recommendations = base_qs.filter(
                    is_trending=True
                ).order_by('-rating')[:8]
        else:
            recommendations = base_qs.filter(
                is_trending=True
            ).order_by('-rating')[:8]

        serializer = ProductListSerializer(recommendations, many=True)
        return Response(serializer.data)


class SizeRecommendationView(APIView):
    """
    Product-driven size recommendation engine.
    Accepts flexible measurements per category and returns:
      - recommended size + confidence
      - fit suggestion (based on fitPreference)
      - alternative sizes
      - human-readable reason
    """
    permission_classes = [AllowAny]

    # ── Weights: how much each measurement matters ────────────────
    WEIGHTS = {
        'height': 3,
        'weight': 3,
        'chest': 3,
        'neck': 2,
        'waist': 3,
        'hip': 3,
        'inseam': 3,
        'shoulder': 2,
        'sleeve': 2,
        'footLength': 5,
        'footWidth': 3,
        'bust': 3,
        'underBust': 3,
        'thigh': 2,
        'outseam': 2,
        'headCircumference': 5,
        'handLength': 3,
        'palmCircumference': 3,
        'waistCircumference': 5,
        'calfCircumference': 2,
        'desiredLength': 2,
    }

    # field name on SizeGuide model that maps to each measurement key
    FIELD_MAP = {
        'height_min': 'height_min',
        'height_max': 'height_max',
        'weight_min': 'weight_min',
        'weight_max': 'weight_max',
        'chest': 'chest',
        'neck': None,  # no neck field on SizeGuide
        'waist': 'waist',
        'hip': 'hips',
        'inseam': 'inseam',
        'shoulder': 'shoulder',
        'sleeve': 'sleeve',
        'footLength': 'foot_length',
        'footWidth': None,
        'bust': 'chest',  # reuse chest for bra
        'underBust': None,
        'thigh': None,
        'outseam': None,
        'headCircumference': None,
        'handLength': None,
        'palmCircumference': None,
        'waistCircumference': 'waist',
        'calfCircumference': None,
        'desiredLength': None,
    }

    def post(self, request):
        gender = request.data.get('gender', 'unisex')
        product_type = request.data.get('product_type', 'clothing')
        fit_preference = request.data.get('fitPreference', 'regular')
        measurements = request.data.get('measurements', {})

        # parse numeric measurements
        parsed = {}
        for k, v in measurements.items():
            if v is not None and v != '':
                try:
                    parsed[k] = float(v)
                except (ValueError, TypeError):
                    pass

        if not parsed:
            return Response(
                {'error': 'حداقل یک اندازه الزامی است.'},
                status=400
            )

        height = parsed.get('height')
        weight = parsed.get('weight')

        # filter guides
        guides = SizeGuide.objects.filter(
            gender__in=[gender, 'unisex'],
            product_type=product_type,
        ).select_related('size', 'category').order_by('size__name')

        if not guides.exists():
            return Response({
                'recommendations': [],
                'message': 'راهنمای سایزی برای این دسته یافت نشد.',
            })

        # group by category
        cat_groups = {}
        for guide in guides:
            cid = guide.category.id
            if cid not in cat_groups:
                cat_groups[cid] = {
                    'category_id': cid,
                    'category_name': guide.category.name,
                    'guides': [],
                }
            cat_groups[cid]['guides'].append(guide)

        results = []
        for cid, cdata in cat_groups.items():
            scored = self._score_sizes(cdata['guides'], parsed, fit_preference)
            if scored:
                results.append({
                    'category_id': cdata['category_id'],
                    'category_name': cdata['category_name'],
                    **scored,
                })

        return Response({
            'recommendations': results,
            'profile': parsed,
            'fit_preference': fit_preference,
        })

    # ── scoring ──────────────────────────────────────────────────

    def _score_sizes(self, guides, user, fit_preference):
        """Return best size info or None."""
        scored = []
        for guide in guides:
            pts, max_pts, matched_fields, missed_fields = self._compare(guide, user)
            if max_pts > 0:
                conf = round(pts / max_pts * 100)
            else:
                conf = 50  # no data → default
            conf = max(0, min(100, conf))
            scored.append({
                'guide': guide,
                'size_name': guide.size.name,
                'size_id': guide.size.id,
                'confidence': conf,
                'matched': matched_fields,
                'missed': missed_fields,
            })

        if not scored:
            return None

        # sort by confidence desc
        scored.sort(key=lambda x: x['confidence'], reverse=True)
        best = scored[0]

        # build alternatives (up to 2, confidence >= 60)
        alts = []
        for s in scored[1:4]:
            if s['confidence'] >= 60 and len(alts) < 2:
                alts.append({
                    'size': s['size_name'],
                    'confidence': s['confidence'],
                })

        # fit label
        fit_map = {
            'slim': 'چسبان (Slim Fit)',
            'regular': 'نرمال (Regular Fit)',
            'loose': 'آزاد (Loose Fit)',
        }
        fit_label = fit_map.get(fit_preference, 'نرمال')

        # reason
        used = [f for f in best['matched'] if f in self.WEIGHTS and self.WEIGHTS[f] >= 2]
        if used:
            field_labels = {
                'height': 'قد', 'weight': 'وزن', 'chest': 'سینه',
                'waist': 'کمر', 'hip': 'باسن', 'inseam': 'قد داخل پا',
                'shoulder': 'شانه', 'sleeve': 'آستین', 'footLength': 'قد پا',
                'neck': 'گردن', 'bust': 'سینه', 'underBust': 'زیر سینه',
                'headCircumference': 'دور سر', 'waistCircumference': 'دور کمر',
                'handLength': 'قد دست', 'palmCircumference': 'دور کف دست',
                'thigh': 'ران', 'calfCircumference': 'دور ساق',
            }
            labels = [field_labels.get(f, f) for f in used[:3]]
            reason = f'بر اساس {", ".join(labels)} شما.'
        else:
            reason = 'بر اساس اندازه‌های وارد شده.'

        return {
            'recommended_size': best['size_name'],
            'size_id': best['size_id'],
            'confidence': best['confidence'],
            'fit': fit_label,
            'alternatives': alts,
            'reason': reason,
            'guide_id': best['guide'].id,
        }

    def _compare(self, guide, user):
        """
        Compare a single SizeGuide row against user measurements.
        Returns (points_earned, max_points, matched_fields, missed_fields).
        """
        pts = 0
        max_pts = 0
        matched = []
        missed = []

        # ── range fields (height, weight) ──
        for dim, gmin_attr, gmax_attr, tol5, tol10 in [
            ('height', 'height_min', 'height_max', 5, 10),
            ('weight', 'weight_min', 'weight_max', 5, 10),
        ]:
            gmin = getattr(guide, gmin_attr, None)
            gmax = getattr(guide, gmax_attr, None)
            uval = user.get(dim)
            if gmin is not None and gmax is not None and uval is not None:
                w = self.WEIGHTS.get(dim, 2)
                max_pts += w
                if gmin <= uval <= gmax:
                    pts += w
                    matched.append(dim)
                else:
                    dist = min(abs(uval - gmin), abs(uval - gmax))
                    if dist <= tol5:
                        pts += w * 0.6
                        matched.append(dim)
                    elif dist <= tol10:
                        pts += w * 0.3
                        matched.append(dim)
                    else:
                        missed.append(dim)

        # ── direct numeric fields (chest, waist, hips, etc.) ──
        direct_fields = [
            ('chest', 'chest'), ('waist', 'waist'), ('hip', 'hips'),
            ('inseam', 'inseam'), ('shoulder', 'shoulder'), ('sleeve', 'sleeve'),
            ('footLength', 'foot_length'), ('bust', 'chest'),
        ]
        for ukey, gattr in direct_fields:
            gval_str = getattr(guide, gattr, None) if gattr else None
            uval = user.get(ukey)
            if gval_str and uval is not None:
                try:
                    gval = float(gval_str)
                except (ValueError, TypeError):
                    continue
                w = self.WEIGHTS.get(ukey, 2)
                max_pts += w
                diff = abs(uval - gval)
                if diff <= 1.5:
                    pts += w
                    matched.append(ukey)
                elif diff <= 3:
                    pts += w * 0.7
                    matched.append(ukey)
                elif diff <= 5:
                    pts += w * 0.4
                    matched.append(ukey)
                else:
                    missed.append(ukey)

        return pts, max_pts, matched, missed


class MeasurementGuideView(APIView):
    """Size chart data for a given product type + gender."""
    permission_classes = [AllowAny]

    def get(self, request):
        product_type = request.query_params.get('product_type', 'clothing')
        gender = request.query_params.get('gender', 'unisex')
        category_id = request.query_params.get('category_id')

        qs = SizeGuide.objects.filter(
            product_type=product_type,
            gender__in=[gender, 'unisex'],
        )
        if category_id:
            qs = qs.filter(category_id=category_id)

        guides = qs.select_related('size', 'category').values(
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


class InheritedSizesView(APIView):
    """
    سایزهای قابل استفاده برای یک دسته‌بندی (ارث‌بری از والدها).
    برای فیلتر زنده dropdown سایز در ادمین محصول استفاده می‌شود.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        category_id = request.query_params.get('category')
        category = None
        if category_id and str(category_id).isdigit():
            category = Category.objects.filter(pk=int(category_id)).select_related('parent').first()

        sizes = sizes_for_category(category, fallback_all=True)
        data = [
            {
                'id': s.id,
                'name': s.name,
                'category': s.category_id,
                'category_name': s.category.name,
                'label': f'{s.category.name} - {s.name}',
            }
            for s in sizes
        ]
        return Response({
            'category_id': category.id if category else None,
            'inherited': bool(category),
            'count': len(data),
            'sizes': data,
        })


class CategoriesByRootView(APIView):
    """دسته‌بندی‌ها بر اساس ریشه - برای فیلتر ادمین"""
    permission_classes = [AllowAny]

    def get(self, request):
        root_name = request.query_params.get('root', '')
        if not root_name:
            return Response([])

        root_cats = Category.objects.filter(name=root_name, parent__isnull=True)
        if not root_cats.exists():
            return Response([])

        root = root_cats.prefetch_related('children').first()

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


class AdminProductSearchView(APIView):
    """جستجوی سریع محصولات برای ادمین (با دیبانس ۱ ثانیه)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if len(q) < 2:
            return Response([])
        products = Product.objects.filter(
            Q(name__icontains=q) | Q(sku__icontains=q)
        ).prefetch_related('images')[:10]
        results = []
        for p in products:
            primary = next((img for img in p.images.all() if img.is_primary), None)
            if not primary:
                primary = next(iter(p.images.all()), None)
            results.append({
                'id': p.pk,
                'name': p.name,
                'sku': p.sku or '',
                'price': str(p.price),
                'image': primary.image.url if primary and primary.image else '',
            })
        return Response(results)
