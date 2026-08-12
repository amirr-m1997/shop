# Generated manually for color-specific product images

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0019_alter_productvariant_stock_alter_review_comment_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='productimage',
            name='color',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='product_images',
                to='products.color',
                verbose_name='رنگ مرتبط',
            ),
        ),
    ]
