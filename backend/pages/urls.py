from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FAQViewSet, ContactInfoView, ContactMessageViewSet,
    SiteSettingsView, TestimonialViewSet,
    SiteFeatureViewSet, about_stats, home_data, sitemap_xml,
)

router = DefaultRouter()
router.register(r'faq', FAQViewSet, basename='faq')
router.register(r'contact-messages', ContactMessageViewSet, basename='contact-messages')
router.register(r'testimonials', TestimonialViewSet, basename='testimonials')
router.register(r'features', SiteFeatureViewSet, basename='features')

urlpatterns = [
    path('', include(router.urls)),
    path('contact-info/', ContactInfoView.as_view({'get': 'list'}), name='contact-info'),
    path('settings/', SiteSettingsView.as_view({'get': 'list'}), name='site-settings'),
    path('about-stats/', about_stats, name='about-stats'),
    path('home/', home_data, name='home-data'),
    path('sitemap.xml', sitemap_xml, name='sitemap'),
]
