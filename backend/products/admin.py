from django.contrib import admin
from .models import Category, Brand, Size, Color, Fabric, Product, ProductImage, ProductVariant, Review, SizeGuide


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    verbose_name = "تصویر محصول"
    verbose_name_plural = "تصاویر محصول"


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1
    verbose_name = "واریانت محصول"
    verbose_name_plural = "واریانت‌های محصول"


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent', 'order']
    list_filter = ['parent']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Size)
class SizeAdmin(admin.ModelAdmin):
    list_display = ['name', 'category']
    list_filter = ['category']
    search_fields = ['name']


@admin.register(Color)
class ColorAdmin(admin.ModelAdmin):
    list_display = ['name', 'hex_code']
    search_fields = ['name']


@admin.register(Fabric)
class FabricAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'brand', 'price', 'stock', 'is_active', 'is_featured', 'rating']
    list_filter = ['category', 'brand', 'main_category', 'is_active', 'is_featured', 'is_new_arrival', 'is_trending']
    search_fields = ['name', 'sku', 'description']
    inlines = [ProductImageInline, ProductVariantInline]
    prepopulated_fields = {'slug': ('name',)}

    fieldsets = (
        ('اطلاعات اصلی', {
            'fields': ('name', 'slug', 'description', 'sku')
        }),
        ('دسته‌بندی و برند', {
            'fields': ('category', 'brand', 'main_category', 'fabric')
        }),
        ('قیمت‌گذاری', {
            'fields': ('price', 'compare_price', 'cost_price')
        }),
        ('موجودی و وضعیت', {
            'fields': ('stock', 'is_active', 'is_featured', 'is_new_arrival', 'is_trending')
        }),
        ('امتیاز و نظرات', {
            'fields': ('rating', 'review_count'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['product', 'user', 'rating', 'is_verified_purchase', 'created_at']
    list_filter = ['rating', 'is_verified_purchase']
    search_fields = ['product__name', 'user__username']
    readonly_fields = ['created_at']


@admin.register(SizeGuide)
class SizeGuideAdmin(admin.ModelAdmin):
    list_display = ['category', 'size', 'chest', 'waist', 'hips', 'length']
    list_filter = ['category']
    search_fields = ['category__name', 'size__name']