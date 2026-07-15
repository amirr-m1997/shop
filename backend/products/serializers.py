from rest_framework import serializers
from .models import Category, Brand, Size, Color, Fabric, Product, ProductImage, ProductVariant, Review, SizeGuide


class CategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'parent', 'image', 'description', 'order', 'children']

    def get_children(self, obj):
        return CategorySerializer(obj.children.all(), many=True).data


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ['id', 'name', 'slug', 'logo', 'description']


class SizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Size
        fields = ['id', 'name', 'category']


class ColorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Color
        fields = ['id', 'name', 'hex_code']


class FabricSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fabric
        fields = ['id', 'name', 'description']


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'alt_text', 'order', 'is_primary']


class ProductVariantSerializer(serializers.ModelSerializer):
    size_name = serializers.CharField(source='size.name', read_only=True)
    color_name = serializers.CharField(source='color.name', read_only=True)
    color_hex = serializers.CharField(source='color.hex_code', read_only=True)

    class Meta:
        model = ProductVariant
        fields = ['id', 'size', 'size_name', 'color', 'color_name', 'color_hex', 'stock', 'price_adjustment', 'sku']


class ProductListSerializer(serializers.ModelSerializer):
    primary_image = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    brand_name = serializers.SerializerMethodField()
    discount_percentage = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'category', 'category_name', 'brand', 'brand_name',
                  'main_category', 'price', 'compare_price', 'discount_percentage', 'rating',
                  'review_count', 'is_active', 'is_featured', 'is_new_arrival', 'is_trending',
                  'primary_image']

    def get_brand_name(self, obj):
        return obj.brand.name if obj.brand else None

    def get_primary_image(self, obj):
        primary = obj.images.filter(is_primary=True).first()
        if primary:
            return primary.image.url
        image = obj.images.first()
        return image.image.url if image else None


class ProductDetailSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    brand_name = serializers.SerializerMethodField()
    fabric_name = serializers.SerializerMethodField()
    discount_percentage = serializers.ReadOnlyField()
    available_sizes = serializers.SerializerMethodField()
    available_colors = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'description', 'category', 'category_name',
                  'brand', 'brand_name', 'main_category', 'fabric', 'fabric_name',
                  'price', 'compare_price', 'discount_percentage', 'sku', 'stock',
                  'is_active', 'is_featured', 'is_new_arrival', 'is_trending',
                  'rating', 'review_count', 'images', 'variants', 'available_sizes',
                  'available_colors', 'created_at', 'updated_at']

    def get_brand_name(self, obj):
        return obj.brand.name if obj.brand else None

    def get_fabric_name(self, obj):
        return obj.fabric.name if obj.fabric else None

    def get_available_sizes(self, obj):
        # ✅ استفاده از dictionary برای جلوگیری از تکراری بودن
        sizes_dict = {}
        for variant in obj.variants.all():
            sizes_dict[variant.size.id] = {
                'id': variant.size.id,
                'name': variant.size.name
            }
        return list(sizes_dict.values())

    def get_available_colors(self, obj):
        # ✅ استفاده از dictionary برای جلوگیری از تکراری بودن
        colors_dict = {}

        for variant in obj.variants.all():
            colors_dict[variant.color.id] = {
                'id': variant.color.id,
                'name': variant.color.name,
                'hex_code': variant.color.hex_code
            }
        return list(colors_dict.values())


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'product', 'user', 'user_name', 'rating', 'title', 'comment',
                  'is_verified_purchase', 'created_at']
        read_only_fields = ['user', 'is_verified_purchase']


class SizeGuideSerializer(serializers.ModelSerializer):
    size_name = serializers.CharField(source='size.name', read_only=True)

    class Meta:
        model = SizeGuide
        fields = ['id', 'category', 'size', 'size_name', 'chest', 'waist', 'hips', 'length']