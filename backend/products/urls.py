from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (CategoryViewSet, BrandViewSet, SizeViewSet, ColorViewSet,
                    FabricViewSet, ProductViewSet, ReviewViewSet, SizeGuideViewSet,
                    HomepageSectionsView, RecommendationsView, BannerListView, StyleLookListView,
                    SizeRecommendationView, MeasurementGuideView, WishlistViewSet,
                    CategoriesByRootView)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'brands', BrandViewSet)
router.register(r'sizes', SizeViewSet)
router.register(r'colors', ColorViewSet)
router.register(r'fabrics', FabricViewSet)
router.register(r'products', ProductViewSet)
router.register(r'reviews', ReviewViewSet)
router.register(r'size-guides', SizeGuideViewSet)
router.register(r'wishlist', WishlistViewSet, basename='wishlist')

urlpatterns = [
    path('', include(router.urls)),
    path('homepage-sections/', HomepageSectionsView.as_view(), name='homepage-sections'),
    path('banners/', BannerListView.as_view(), name='banners'),
    path('styles/', StyleLookListView.as_view(), name='styles'),
    path('recommendations/', RecommendationsView.as_view(), name='recommendations'),
    path('size-recommendation/', SizeRecommendationView.as_view(), name='size-recommendation'),
    path('measurement-guide/', MeasurementGuideView.as_view(), name='measurement-guide'),
    path('categories/by-root/', CategoriesByRootView.as_view(), name='categories-by-root'),
]
