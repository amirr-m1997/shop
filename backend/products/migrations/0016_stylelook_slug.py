from django.db import migrations, models


def set_slugs(apps, schema_editor):
    StyleLook = apps.get_model('products', 'StyleLook')
    slugs = ['tabsatanee', 'edari', 'shahr-e', 'minimal']
    for i, style in enumerate(StyleLook.objects.all()):
        style.slug = slugs[i] if i < len(slugs) else f'style-{style.id}'
        style.save(update_fields=['slug'])


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0015_auto_20260721_1805'),
    ]

    operations = [
        migrations.AddField(
            model_name='stylelook',
            name='slug',
            field=models.SlugField(blank=True, max_length=150, default='', verbose_name='اسلاگ'),
        ),
        migrations.RunPython(set_slugs, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='stylelook',
            name='slug',
            field=models.SlugField(blank=True, max_length=150, unique=True, verbose_name='اسلاگ'),
        ),
    ]
