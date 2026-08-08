from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from .models import BlogCategory, BlogPost


@admin.register(BlogCategory)
class BlogCategoryAdmin(ModelAdmin):
    list_display = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']


@admin.register(BlogPost)
class BlogPostAdmin(ModelAdmin):
    list_display = ['title', 'category', 'author', 'is_published', 'published_at']
    list_filter = ['is_published', 'category', 'published_at']
    search_fields = ['title', 'content']
    prepopulated_fields = {'slug': ('title',)}
    raw_id_fields = ['author']
    date_hierarchy = 'published_at'
    list_editable = ['is_published']
