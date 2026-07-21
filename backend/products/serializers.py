from rest_framework import serializers
from .models import (
    Category, Brand, Size, Color, Fabric, Product, ProductImage,
    ProductVariant, Review, SizeGuide, HomepageSection, Banner, StyleLook, Wishlist,
)


class CategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'parent', 'image', 'description', 'order', 'children']

    def get_image(self, obj):
        if obj.image:
            request = self.context.get('request')
            url = obj.image.url
            if request:
                return request.build_absolute_uri(url)
            return url
        return ''

    def get_children(self, obj):
        depth = self.context.get('category_depth', 0)
        if depth >= 2:
            return []
        children = obj.children.all()
        return CategorySerializer(children, many=True, context={**self.context, 'category_depth': depth + 1}).data


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
    effective_stock = serializers.ReadOnlyField()
    effective_price = serializers.ReadOnlyField()

    class Meta:
        model = ProductVariant
        fields = ['id', 'size', 'size_name', 'color', 'color_name', 'color_hex',
                  'stock', 'effective_stock', 'price_adjustment', 'effective_price', 'sku']


class ProductListSerializer(serializers.ModelSerializer):
    primary_image = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    brand_name = serializers.SerializerMethodField()
    discount_percentage = serializers.ReadOnlyField()
    original_price = serializers.DecimalField(source='compare_price', max_digits=10, decimal_places=2,
                                               read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'category', 'category_name', 'category_slug',
                  'brand', 'brand_name',
                  'main_category', 'price', 'compare_price', 'original_price',
                  'discount_percentage', 'rating',
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
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    brand_name = serializers.SerializerMethodField()
    fabric_name = serializers.SerializerMethodField()
    discount_percentage = serializers.ReadOnlyField()
    original_price = serializers.DecimalField(source='compare_price', max_digits=10, decimal_places=2,
                                               read_only=True)
    available_sizes = serializers.SerializerMethodField()
    available_colors = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'description', 'category', 'category_name', 'category_slug',
                  'brand', 'brand_name', 'main_category', 'fabric', 'fabric_name',
                  'price', 'compare_price', 'original_price', 'discount_percentage', 'sku', 'stock',
                  'is_active', 'is_featured', 'is_new_arrival', 'is_trending',
                  'rating', 'review_count', 'images', 'variants', 'available_sizes',
                  'available_colors', 'created_at', 'updated_at']

    def get_brand_name(self, obj):
        return obj.brand.name if obj.brand else None

    def get_fabric_name(self, obj):
        return obj.fabric.name if obj.fabric else None

    def get_available_sizes(self, obj):
        # âœ… ط§ط³طھظپط§ط¯ظ‡ ط§ط² dictionary ط¨ط±ط§غŒ ط¬ظ„ظˆع¯غŒط±غŒ ط§ط² طھع©ط±ط§ط±غŒ ط¨ظˆط¯ظ†
        sizes_dict = {}
        for variant in obj.variants.all():
            sizes_dict[variant.size.id] = {
                'id': variant.size.id,
                'name': variant.size.name
            }
        return list(sizes_dict.values())

    def get_available_colors(self, obj):
        # âœ… ط§ط³طھظپط§ط¯ظ‡ ط§ط² dictionary ط¨ط±ط§غŒ ط¬ظ„ظˆع¯غŒط±غŒ ط§ط² طھع©ط±ط§ط±غŒ ط¨ظˆط¯ظ†
        colors_dict = {}

        for variant in obj.variants.all():
            colors_dict[variant.color.id] = {
                'id': variant.color.id,
                'name': variant.color.name,
                'hex_code': variant.color.hex_code
            }
        return list(colors_dict.values())


class ReviewSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'product', 'user', 'owner_name', 'rating', 'title', 'comment',
                  'is_verified_purchase', 'created_at']
        read_only_fields = ['user', 'is_verified_purchase']


class SizeGuideSerializer(serializers.ModelSerializer):
    size_name = serializers.CharField(source='size.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = SizeGuide
        fields = ['id', 'category', 'category_name', 'size', 'size_name', 'gender', 'product_type',
                  'chest', 'waist', 'hips', 'length', 'shoulder', 'sleeve', 'foot_length', 'inseam',
                  'height_min', 'height_max', 'weight_min', 'weight_max', 'measurement_guide']


class HomepageSectionSerializer(serializers.ModelSerializer):
    products = serializers.SerializerMethodField()
    filter_type_display = serializers.CharField(source='get_filter_type_display', read_only=True)

    class Meta:
        model = HomepageSection
        fields = ['id', 'title', 'filter_type', 'filter_type_display', 'filter_value', 'order', 'products']

    def get_products(self, obj):
        products = obj.get_products()
        return ProductListSerializer(products, many=True).data


class BannerSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Banner
        fields = ['id', 'title', 'subtitle', 'image', 'link', 'button_text', 'order']

    def get_image(self, obj):
        if obj.image:
            request = self.context.get('request')
            url = obj.image.url
            if request:
                return request.build_absolute_uri(url)
            return url
        return obj.image_url or ''


class StyleLookSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = StyleLook
        fields = ['id', 'title', 'description', 'image', 'link', 'order']

    def get_image(self, obj):
        if obj.image:
            request = self.context.get('request')
            url = obj.image.url
            if request:
                return request.build_absolute_uri(url)
            return url
        return obj.image_url or ''


class WishlistSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Wishlist
        fields = ['id', 'product', 'product_id', 'created_at']
        read_only_fields = ['created_at']
