from django.contrib import admin
from django.utils.html import format_html
from .models import BlogCategory, BlogPost


@admin.register(BlogCategory)
class BlogCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']


@admin.register(BlogPost)
class BlogPostAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'author', 'is_published', 'published_at', 'image_preview']
    list_filter = ['is_published', 'category', 'published_at']
    search_fields = ['title', 'content']
    prepopulated_fields = {'slug': ('title',)}
    raw_id_fields = ['author']
    date_hierarchy = 'published_at'
    list_editable = ['is_published']
    readonly_fields = ['image_preview']

    def image_preview(self, obj):
        url = obj.display_image
        if url:
            return format_html('<img src="{}" style="height:60px;border-radius:8px;" />', url)
        return '—'

    image_preview.short_description = 'تصویر'
