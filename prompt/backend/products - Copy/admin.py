from django.contrib import admin
from django.contrib.admin import widgets as admin_widgets
from django import forms
from django.conf import settings
from django.utils.html import format_html
from .models import (
    Category, Brand, Size, Color, Fabric, Product, ProductImage,
    ProductVariant, Review, SizeGuide, HomepageSection, Banner, StyleLook, Wishlist,
    sizes_for_category,
)

try:
    import jdatetime
    HAS_JALALI = True
except ImportError:
    HAS_JALALI = False


def to_jalali(dt):
    if not dt or not HAS_JALALI:
        return dt
    return jdatetime.datetime.fromgregorian(datetime=dt).strftime('%Y/%m/%d - %H:%M')


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    verbose_name = "تصویر محصول"
    verbose_name_plural = "تصاویر محصول"
    fields = ['color', 'image', 'alt_text', 'order', 'is_primary']


class ProductVariantForm(forms.ModelForm):
    class Meta:
        model = ProductVariant
        fields = '__all__'


class ProductVariantInline(admin.TabularInline):
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
class ProductAdmin(admin.ModelAdmin):
    list_display = ['product_thumbnail', 'product_name_link', 'category', 'brand', 'price', 'compare_price_display', 'stock', 'is_active', 'is_featured', 'rating', 'created_at_jalali']
    list_filter = ['category', 'brand', 'main_category', 'is_active', 'is_featured', 'is_new_arrival', 'is_trending']
    search_fields = ['name', 'sku', 'description']
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

    @admin.display(description='تصویر')
    def product_thumbnail(self, obj):
        img = obj.images.filter(is_primary=True).first() or obj.images.first()
        if img and img.image:
            return format_html(
                '<img class="product-thumb" src="{}" data-preview="{}" />',
                img.image.url, img.image.url
            )
        return '-'

    @admin.display(description='نام محصول')
    def product_name_link(self, obj):
        url = f'{settings.FRONTEND_URL}/product/{obj.slug}'
        return format_html('<a href="{}" target="_blank">{}</a>', url, obj.name)

    @admin.display(description='قیمت اصلی / تخفیف')
    def compare_price_display(self, obj):
        if obj.compare_price:
            discount = obj.discount_percentage
            return format_html(
                '<span style="text-decoration:line-through; color:#999;">{}</span> '
                '<span style="color:#ef4444; font-weight:bold;">-{}%</span>',
                f'{obj.compare_price:,.0f}', discount
            )
        return '-'

    @admin.display(description='تاریخ ایجاد')
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
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['product', 'user', 'rating', 'is_verified_purchase', 'created_at']
    list_filter = ['rating', 'is_verified_purchase']
    search_fields = ['product__name', 'user__username']
    readonly_fields = ['created_at']


@admin.register(SizeGuide)
class SizeGuideAdmin(admin.ModelAdmin):
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
class HomepageSectionAdmin(admin.ModelAdmin):
    list_display = ['title', 'filter_type', 'filter_value', 'order', 'is_active']
    list_filter = ['filter_type', 'is_active']
    list_editable = ['order', 'is_active']
    ordering = ['order']


@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display = ['title', 'link', 'order', 'is_active']
    list_filter = ['is_active']
    list_editable = ['order', 'is_active']
    search_fields = ['title', 'subtitle']
    ordering = ['order']


@admin.register(StyleLook)
class StyleLookAdmin(admin.ModelAdmin):
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
class WishlistAdmin(admin.ModelAdmin):
    list_display = ['user', 'product', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__username', 'product__name']
    readonly_fields = ['created_at']