from django.contrib import admin
from .models import FAQ, ContactInfo, ContactMessage, SiteSettings, Testimonial, SiteFeature


@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ['question', 'order', 'is_active']
    list_editable = ['order', 'is_active']
    list_filter = ['is_active']


@admin.register(ContactInfo)
class ContactInfoAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return not ContactInfo.objects.exists()


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'is_read', 'created_at']
    list_filter = ['is_read', 'created_at']
    list_editable = ['is_read']



@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    fieldsets = (
        ('صفحه اصلی', {
            'fields': ('hero_title', 'hero_subtitle', 'hero_image'),
        }),
        ('درباره ما', {
            'fields': ('about_title', 'about_content', 'about_image'),
        }),
        ('ارسال و هزینه', {
            'fields': (
                'shipping_title',
                'shipping_content',
                'free_shipping_threshold',
                'shipping_cost',
                'tax_rate',
            ),
            'description': (
                'آستانه و هزینه ارسال از اینجا کنترل می‌شود و در سبد خرید، '
                'تسویه حساب و ثبت سفارش اعمال می‌گردد. '
                'متن کارت «ارسال رایگان» در «ویژگی‌های سایت» را هم در صورت تغییر هماهنگ کنید.'
            ),
        }),
        ('بازگشت کالا', {
            'fields': ('returns_title', 'returns_content'),
        }),
    )

    def has_add_permission(self, request):
        return not SiteSettings.objects.exists()


@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ['name', 'rating', 'is_approved', 'is_featured', 'created_at']
    list_filter = ['is_approved', 'is_featured', 'rating', 'created_at']
    list_editable = ['is_approved', 'is_featured']
    search_fields = ['name', 'text']


@admin.register(SiteFeature)
class SiteFeatureAdmin(admin.ModelAdmin):
    list_display = ['title', 'icon', 'order', 'is_active']
    list_filter = ['is_active']
    list_editable = ['order', 'is_active']
