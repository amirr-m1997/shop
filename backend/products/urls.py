from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (CategoryViewSet, BrandViewSet, SizeViewSet, ColorViewSet, 
                    FabricViewSet, ProductViewSet, ReviewViewSet, SizeGuideViewSet)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'brands', BrandViewSet)
router.register(r'sizes', SizeViewSet)
router.register(r'colors', ColorViewSet)
router.register(r'fabrics', FabricViewSet)
router.register(r'products', ProductViewSet)
router.register(r'reviews', ReviewViewSet)
router.register(r'size-guides', SizeGuideViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
