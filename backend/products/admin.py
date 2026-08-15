from django.contrib import admin
from django.contrib.admin import ModelAdmin, StackedInline, TabularInline
from django.contrib.admin import display
from django.contrib.admin import widgets as admin_widgets
from django import forms
from django.conf import settings
from django.utils.html import format_html
from shop.jalali import jalali_datetime
from .models import (
    Category, Brand, Size, Color, Fabric, Product, ProductImage,
    ProductVariant, Review, SizeGuide, HomepageSection, Banner, StyleLook, Wishlist,
    sizes_for_category,
)

def to_jalali(dt):
    return jalali_datetime(dt)


class ProductImageInline(StackedInline):
    model = ProductImage
    extra = 1
    verbose_name = "تصویر محصول"
    verbose_name_plural = "تصاویر محصول"
    fields = ['color', 'image', 'alt_text', 'order', 'is_primary']


class ProductVariantForm(forms.ModelForm):
    class Meta:
        model = ProductVariant
        fields = '__all__'


class ProductVariantInline(TabularInline):
    model = ProductVariant
    form = ProductVariantForm
    extra = 1
    verbose_name = "واریانت محصول"
    verbose_name_plural = "واریانت‌های محصول"
    fields = ['size', 'color', 'stock', 'price_adjustment', 'sku']

    def get_formset(self, request, obj=None, **kwargs):
        """
        Filter size choices by product category inheritance:
        sizes on the product category or any parent (root) category.
        Always keep the currently selected size visible, and fall back to all
        sizes if the category lineage has none defined.
        """
        category = obj.category if obj and getattr(obj, 'category_id', None) else None

        class BoundVariantForm(ProductVariantForm):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, **kwargs)
                extra_ids = []
                if self.instance and self.instance.pk and self.instance.size_id:
                    extra_ids.append(self.instance.size_id)
                # POST redisplay: keep submitted size even if category just changed
                if self.data:
                    prefix = self.prefix
                    raw = self.data.get(f'{prefix}-size') if prefix else self.data.get('size')
                    if raw and str(raw).isdigit():
                        extra_ids.append(int(raw))
                self.fields['size'].queryset = sizes_for_category(
                    category,
                    extra_size_ids=extra_ids,
                    fallback_all=True,
                )
                self.fields['size'].help_text = (
                    'سایزها از دسته‌بندی محصول و والدهای آن ارث‌بری می‌شوند. '
                    'اگر برای این دسته سایزی تعریف نشده باشد، همه سایزها نمایش داده می‌شوند.'
                )

        kwargs['form'] = BoundVariantForm
        return super().get_formset(request, obj, **kwargs)


@admin.register(ProductImage)
class ProductImageAdmin(ModelAdmin):
    list_display = ('id', 'product', 'color', 'is_primary', 'order')
    list_filter = ('is_primary', 'color')
    search_fields = ('product__name', 'alt_text')


@admin.register(ProductVariant)
class ProductVariantAdmin(ModelAdmin):
    list_display = ('id', 'product', 'size', 'color', 'stock', 'price_adjustment', 'sku')
    list_filter = ('size', 'color')
    search_fields = ('product__name', 'sku')


@admin.register(Category)
class CategoryAdmin(ModelAdmin):
    list_display = ['name', 'parent', 'order']
    list_filter = ['parent']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Brand)
class BrandAdmin(ModelAdmin):
    list_display = ['name', 'slug']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Size)
class SizeAdmin(ModelAdmin):
    list_display = ['name', 'category']
    list_filter = ['category']
    search_fields = ['name']


@admin.register(Color)
class ColorAdmin(ModelAdmin):
    list_display = ['name', 'hex_code']
    search_fields = ['name']


@admin.register(Fabric)
class FabricAdmin(ModelAdmin):
    list_display = ['name']
    search_fields = ['name']


class ProductAdminForm(forms.ModelForm):
    style_looks = forms.ModelMultipleChoiceField(
        queryset=StyleLook.objects.all(),
        required=False,
        label='استایل‌ها',
        widget=admin_widgets.FilteredSelectMultiple('استایل‌ها', is_stacked=False)
    )

    class Meta:
        model = Product
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['category'].queryset = Category.objects.all()
        if self.instance.pk:
            self.fields['style_looks'].initial = self.instance.style_looks.all()

    def save(self, commit=True):
        instance = super().save(commit=False)
        if commit:
            instance.save()
        if instance.pk:
            instance.style_looks.set(self.cleaned_data['style_looks'])
        return instance


@admin.register(Product)
class ProductAdmin(ModelAdmin):
    list_display = [
        'product_thumbnail', 'product_title_cell', 'category', 'brand',
        'price_display', 'discount_price_display', 'stock_badge',
        'status_badge', 'created_at_jalali',
    ]
    list_display_links = ['product_thumbnail']
    list_filter = ['category', 'brand', 'is_active']
    search_fields = ['name', 'brand__name', 'category__name']
    ordering = ['-created_at']
    inlines = [ProductImageInline, ProductVariantInline]
    prepopulated_fields = {'slug': ('name',)}
    actions = ['mark_featured', 'mark_unfeatured', 'mark_new_arrival', 'mark_active', 'mark_inactive']
    form = ProductAdminForm

    fieldsets = (
        ('اطلاعات اصلی', {
            'fields': ('name', 'slug', 'description'),
            'description': 'کد محصول (SKU) اختیاری است - اگر خالی بگذارید، واریانت‌ها خودکار کد دریافت می‌کنند'
        }),
        ('دسته‌بندی و برند', {
            'fields': ('category', 'brand', 'main_category', 'fabric')
        }),
        ('قیمت‌گذاری (تومان)', {
            'fields': ('price', 'compare_price', 'cost_price'),
            'description': 'قیمت فروش = قیمتی که مشتری می‌پردازد | قیمت اصلی = قیمت قبل از تخفیف (خالی بگذارید اگر تخفیفی ندارد)'
        }),
        ('موجودی و وضعیت', {
            'fields': ('stock', 'is_active', 'is_featured', 'is_new_arrival', 'is_trending'),
            'description': 'موجودی کل محصول (اگر واریانت دارید، موجودی واریانت اولویت دارد)'
        }),
        ('امتیاز و نظرات', {
            'fields': ('rating', 'review_count'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('category', 'brand').prefetch_related('images')

    @display(description='تصویر')
    def product_thumbnail(self, obj):
        images = list(obj.images.all())
        img = next((image for image in images if image.is_primary), None) or (images[0] if images else None)
        if img and img.image:
            return format_html(
                '<span class="product-admin-custom product-admin-custom__thumbnail">'
                '<img src="{}" alt="{}"></span>',
                img.image.url,
                obj.name,
            )
        return format_html(
            '<span class="product-admin-custom product-admin-custom__thumbnail '
            'product-admin-custom__thumbnail--placeholder" aria-label="بدون تصویر">'
            '<span class="material-symbols-outlined">image</span></span>'
        )

    @display(description='نام محصول')
    def product_title_cell(self, obj):
        url = f'{settings.FRONTEND_URL}/product/{obj.slug}'
        meta = f'کد: {obj.sku}' if obj.sku else f'شناسه: {obj.id}'
        return format_html(
            '<span class="product-admin-custom product-admin-custom__title">'
            '<a href="{}" target="_blank" rel="noopener">{}</a><small>{}</small></span>',
            url,
            obj.name,
            meta
        )

    @display(description='قیمت', ordering='price')
    def price_display(self, obj):
        price = obj.compare_price if obj.compare_price and obj.compare_price > obj.price else obj.price
        return format_html(
            '<span class="product-admin-custom product-admin-custom__price">{} تومان</span>',
            f'{price:,.0f}',
        )

    @display(description='قیمت تخفیف', ordering='price')
    def discount_price_display(self, obj):
        if obj.compare_price and obj.compare_price > obj.price:
            return format_html(
                '<span class="product-admin-custom product-admin-custom__price '
                'product-admin-custom__price--sale">{} تومان</span>',
                f'{obj.price:,.0f}',
            )
        return '—'

    @display(description='موجودی', ordering='stock')
    def stock_badge(self, obj):
        if obj.stock <= 5:
            label = 'ناموجود' if obj.stock == 0 else f'{obj.stock} عدد'
            return format_html(
                '<span class="product-admin-custom product-admin-custom__badge '
                'product-admin-custom__badge--danger">{}</span>', label
            )
        return format_html(
            '<span class="product-admin-custom product-admin-custom__badge '
            'product-admin-custom__badge--success">{} عدد</span>', obj.stock
        )

    @display(description='وضعیت', ordering='is_active')
    def status_badge(self, obj):
        label = 'فعال' if obj.is_active else 'غیرفعال'
        modifier = 'success' if obj.is_active else 'muted'
        return format_html(
            '<span class="product-admin-custom product-admin-custom__badge '
            'product-admin-custom__badge--{}">{}</span>', modifier, label
        )

    @display(description='تاریخ ایجاد', ordering='created_at')
    def created_at_jalali(self, obj):
        return to_jalali(obj.created_at)

    @admin.action(description='ویژه کردن محصولات انتخابی')
    def mark_featured(self, request, queryset):
        count = queryset.update(is_featured=True)
        self.message_user(request, f'{count} محصول ویژه شد.')

    @admin.action(description='حذف ویژگی از محصولات انتخابی')
    def mark_unfeatured(self, request, queryset):
        count = queryset.update(is_featured=False)
        self.message_user(request, f'{count} محصول از ویژگی خارج شد.')

    @admin.action(description='جدید کردن محصولات انتخابی')
    def mark_new_arrival(self, request, queryset):
        count = queryset.update(is_new_arrival=True)
        self.message_user(request, f'{count} محصول جدید شد.')

    @admin.action(description='فعال کردن محصولات انتخابی')
    def mark_active(self, request, queryset):
        count = queryset.update(is_active=True)
        self.message_user(request, f'{count} محصول فعال شد.')

    @admin.action(description='غیرفعال کردن محصولات انتخابی')
    def mark_inactive(self, request, queryset):
        count = queryset.update(is_active=False)
        self.message_user(request, f'{count} محصول غیرفعال شد.')

    def save_model(self, request, obj, form, change):
        if obj.category:
            root = obj.category
            while root.parent:
                root = root.parent
            obj.main_category = root.name
        super().save_model(request, obj, form, change)

    class Media:
        js = (
            'admin/js/auto_main_category.js',
            'admin/js/variant_size_filter.js',
            'admin/js/product-hover.js',
            'admin/js/product-search.js',
        )
        css = {'all': ('admin/css/product-hover.css',)}


@admin.register(Review)
class ReviewAdmin(ModelAdmin):
    list_display = ['product', 'user', 'rating', 'is_verified_purchase', 'created_at_jalali']
    list_filter = ['rating', 'is_verified_purchase']
    search_fields = ['product__name', 'user__username']
    readonly_fields = ['created_at_jalali']

    @display(description='تاریخ ثبت', ordering='created_at')
    def created_at_jalali(self, obj):
        return to_jalali(obj.created_at)


@admin.register(SizeGuide)
class SizeGuideAdmin(ModelAdmin):
    list_display = ['category', 'size', 'gender', 'product_type', 'chest', 'waist', 'hips', 'length',
                    'height_min', 'height_max', 'weight_min', 'weight_max']
    list_filter = ['category', 'gender', 'product_type']
    search_fields = ['category__name', 'size__name']

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        # On change form, prefer sizes inherited from the selected guide category
        if db_field.name == 'size':
            object_id = request.resolver_match.kwargs.get('object_id') if request.resolver_match else None
            if object_id:
                try:
                    guide = SizeGuide.objects.select_related('category').get(pk=object_id)
                    kwargs['queryset'] = sizes_for_category(guide.category, extra_size_ids=[guide.size_id])
                except SizeGuide.DoesNotExist:
                    pass
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(HomepageSection)
class HomepageSectionAdmin(ModelAdmin):
    list_display = ['title', 'filter_type', 'filter_value', 'order', 'is_active']
    list_filter = ['filter_type', 'is_active']
    list_editable = ['order', 'is_active']
    ordering = ['order']


@admin.register(Banner)
class BannerAdmin(ModelAdmin):
    list_display = ['title', 'link', 'order', 'is_active']
    list_filter = ['is_active']
    list_editable = ['order', 'is_active']
    search_fields = ['title', 'subtitle']
    ordering = ['order']


@admin.register(StyleLook)
class StyleLookAdmin(ModelAdmin):
    list_display = ['title', 'link', 'order', 'is_active', 'product_count']
    list_filter = ['is_active']
    list_editable = ['order', 'is_active']
    search_fields = ['title', 'description']
    ordering = ['order']
    filter_horizontal = ['products']
    readonly_fields = ['product_count']

    @admin.display(description='تعداد محصولات')
    def product_count(self, obj):
        return obj.products.count()


@admin.register(Wishlist)
class WishlistAdmin(ModelAdmin):
    list_display = ['user', 'product', 'created_at_jalali']
    list_filter = ['created_at']
    search_fields = ['user__username', 'product__name']
    readonly_fields = ['created_at_jalali']

    @display(description='تاریخ افزودن', ordering='created_at')
    def created_at_jalali(self, obj):
        return to_jalali(obj.created_at)
