from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify


class BlogCategory(models.Model):
    name = models.CharField(max_length=100, verbose_name='نام')
    slug = models.SlugField(unique=True, allow_unicode=True, verbose_name='اسلاگ')

    class Meta:
        verbose_name = 'دسته‌بندی مجله'
        verbose_name_plural = 'دسته‌بندی‌های مجله'
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name, allow_unicode=True)
        super().save(*args, **kwargs)


class BlogPost(models.Model):
    title = models.CharField(max_length=200, verbose_name='عنوان')
    slug = models.SlugField(unique=True, allow_unicode=True, verbose_name='اسلاگ')
    excerpt = models.TextField(max_length=300, blank=True, verbose_name='خلاصه')
    content = models.TextField(verbose_name='محتوا')
    image = models.URLField(blank=True, verbose_name='تصویر')
    category = models.ForeignKey(BlogCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='posts', verbose_name='دسته‌بندی')
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name='نویسنده')
    is_published = models.BooleanField(default=False, verbose_name='منتشر شده')
    published_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ انتشار')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='تاریخ بروزرسانی')

    class Meta:
        verbose_name = 'مقاله'
        verbose_name_plural = 'مقالات'
        ordering = ['-published_at']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title, allow_unicode=True)
        super().save(*args, **kwargs)
