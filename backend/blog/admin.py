from django.contrib import admin
from django.contrib.admin import ModelAdmin
from .models import BlogCategory, BlogPost
from shop.jalali import jalali_date, jalali_datetime


@admin.register(BlogCategory)
class BlogCategoryAdmin(ModelAdmin):
    list_display = ['name', 'slug', 'posts_count']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']

    def posts_count(self, obj):
        return obj.posts.count()
    posts_count.short_description = 'تعداد مقالات'

    def created_at_jalali(self, obj):
        return jalali_date(obj.created_at)
    created_at_jalali.short_description = 'تاریخ ایجاد'


@admin.register(BlogPost)
class BlogPostAdmin(ModelAdmin):
    list_display = ['title_link', 'category', 'author', 'is_published', 'published_at_jalali']
    list_filter = ['is_published', 'category', 'published_at']
    search_fields = ['title', 'content', 'author__username']
    prepopulated_fields = {'slug': ('title',)}
    raw_id_fields = ['author']
    list_editable = ['is_published']
    list_select_related = ['category', 'author']
    list_per_page = 30
    readonly_fields = ['published_at_jalali']

    fieldsets = (
        ('محتوای مقاله', {
            'fields': ('title', 'slug', 'category', 'author', 'excerpt', 'content', 'image_upload', 'image')
        }),
        ('انتشار', {
            'fields': ('is_published', 'published_at_jalali')
        }),
    )

    def title_link(self, obj):
        from django.urls import reverse
        from django.utils.html import format_html
        url = reverse('admin:blog_blogpost_change', args=[obj.pk])
        return format_html(
            '<div class="admin-blog-title"><a href="{}">{}</a><span>{}</span></div>',
            url,
            obj.title,
            obj.excerpt[:90] if obj.excerpt else ''
        )
    title_link.short_description = 'عنوان مقاله'

    def published_at_jalali(self, obj):
        return jalali_datetime(obj.published_at)
    published_at_jalali.short_description = 'تاریخ انتشار'
    published_at_jalali.admin_order_field = 'published_at'

