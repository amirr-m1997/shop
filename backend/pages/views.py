from django.db.models import Prefetch
from django.http import HttpResponse
from rest_framework import viewsets, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth.models import User
from products.models import Product, Brand, Category, HomepageSection, Banner, StyleLook
from products.views import _prepare_homepage_sections
from products.serializers import (
    CategorySerializer, HomepageSectionSerializer,
    BannerSerializer, StyleLookSerializer,
)
from .models import FAQ, ContactInfo, ContactMessage, SiteSettings, Testimonial, SiteFeature, CustomerSatisfaction
from .serializers import (
    FAQSerializer, ContactInfoSerializer, ContactMessageSerializer,
    SiteSettingsSerializer,
    TestimonialReadSerializer, TestimonialWriteSerializer,
    SiteFeatureSerializer,
)


class FAQViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = FAQSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return FAQ.objects.filter(is_active=True)


class ContactInfoView(viewsets.ReadOnlyModelViewSet):
    serializer_class = ContactInfoSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return ContactInfo.objects.all()

    def list(self, request, *args, **kwargs):
        obj, _ = ContactInfo.objects.get_or_create(pk=1)
        return Response(self.get_serializer(obj).data)


class ContactMessageViewSet(viewsets.ModelViewSet):
    serializer_class = ContactMessageSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        if self.request.user.is_staff:
            return ContactMessage.objects.all()
        return ContactMessage.objects.none()



class SiteSettingsView(viewsets.ReadOnlyModelViewSet):
    serializer_class = SiteSettingsSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return SiteSettings.objects.all()

    def list(self, request, *args, **kwargs):
        obj = SiteSettings.load()
        return Response(self.get_serializer(obj).data)


class TestimonialViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.AllowAny]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return TestimonialWriteSerializer
        return TestimonialReadSerializer

    def get_queryset(self):
        if self.request.user.is_staff:
            return Testimonial.objects.all()
        return Testimonial.objects.filter(is_approved=True, is_featured=True)

    def perform_create(self, serializer):
        serializer.save()


class SiteFeatureViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SiteFeatureSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return SiteFeature.objects.filter(is_active=True)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def about_stats(request):
    """Public endpoint returning dynamic stats for the About page."""
    sat = CustomerSatisfaction.load()
    return Response({
        'products_count': Product.objects.filter(is_active=True).count(),
        'users_count': User.objects.filter(is_active=True).count(),
        'brands_count': Brand.objects.count(),
        'customer_satisfaction': sat.value,
        'satisfaction_title': sat.title,
        'satisfaction_description': sat.description,
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def home_data(request):
    """
    Single aggregated endpoint for all homepage data.
    Returns banners, categories, settings, styles, sections,
    testimonials, and features in one response.
    """
    categories = Category.objects.filter(parent__isnull=True).prefetch_related('children')
    sections = list(HomepageSection.objects.filter(is_active=True))
    _prepare_homepage_sections(sections)
    banners = Banner.objects.filter(is_active=True)
    styles = StyleLook.objects.filter(is_active=True).prefetch_related(
        Prefetch(
            'products',
            queryset=Product.objects.filter(is_active=True).select_related(
                'brand', 'category',
            ).prefetch_related('images'),
        )
    )
    testimonials = Testimonial.objects.filter(is_approved=True, is_featured=True)
    features = SiteFeature.objects.filter(is_active=True)

    return Response({
        'banners': BannerSerializer(banners, many=True, context={'request': request}).data,
        'categories': CategorySerializer(categories, many=True, context={'request': request}).data,
        'settings': SiteSettingsSerializer(SiteSettings.load()).data,
        'styles': StyleLookSerializer(styles, many=True, context={'request': request}).data,
        'sections': HomepageSectionSerializer(sections, many=True).data,
        'testimonials': TestimonialReadSerializer(testimonials, many=True).data,
        'features': SiteFeatureSerializer(features, many=True).data,
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def sitemap_xml(request):
    """
    Generate a dynamic sitemap.xml with all public URLs.
    Includes: static pages, categories, products, blog posts, style pages.
    """
    from django.utils import timezone
    from blog.models import BlogPost

    site_url = 'https://fashionshop.ir'
    now = timezone.now().strftime('%Y-%m-%d')

    urls = []

    # Static pages
    static_pages = [
        ('/', '1.0', 'daily'),
        ('/about', '0.6', 'monthly'),
        ('/contact', '0.6', 'monthly'),
        ('/faq', '0.5', 'monthly'),
        ('/shipping', '0.5', 'monthly'),
        ('/returns', '0.5', 'monthly'),
        ('/products', '0.9', 'daily'),
        ('/new-arrivals', '0.8', 'daily'),
        ('/sale', '0.8', 'daily'),
        ('/trending', '0.7', 'daily'),
        ('/blog', '0.7', 'weekly'),
    ]
    for path, priority, freq in static_pages:
        urls.append({
            'loc': f'{site_url}{path}',
            'lastmod': now,
            'changefreq': freq,
            'priority': priority,
        })

    # Categories (Category has no is_active flag — list them all)
    for cat in Category.objects.all():
        urls.append({
            'loc': f'{site_url}/category/{cat.slug}',
            'lastmod': now,
            'changefreq': 'weekly',
            'priority': '0.8',
        })

    # Products
    for product in Product.objects.filter(is_active=True):
        urls.append({
            'loc': f'{site_url}/product/{product.slug}',
            'lastmod': product.updated_at.strftime('%Y-%m-%d') if product.updated_at else now,
            'changefreq': 'weekly',
            'priority': '0.9',
        })

    # Blog posts
    for post in BlogPost.objects.filter(is_published=True):
        lastmod = post.published_at.strftime('%Y-%m-%d') if post.published_at else now
        urls.append({
            'loc': f'{site_url}/blog/{post.slug}',
            'lastmod': lastmod,
            'changefreq': 'monthly',
            'priority': '0.7',
        })

    # Style pages
    for style in StyleLook.objects.filter(is_active=True):
        urls.append({
            'loc': f'{site_url}/style/{style.slug}',
            'lastmod': now,
            'changefreq': 'weekly',
            'priority': '0.7',
        })

    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for url in urls:
        xml += '  <url>\n'
        xml += f'    <loc>{url["loc"]}</loc>\n'
        xml += f'    <lastmod>{url["lastmod"]}</lastmod>\n'
        xml += f'    <changefreq>{url["changefreq"]}</changefreq>\n'
        xml += f'    <priority>{url["priority"]}</priority>\n'
        xml += '  </url>\n'
    xml += '</urlset>'

    return HttpResponse(xml, content_type='application/xml')
