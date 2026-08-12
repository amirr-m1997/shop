from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('products', '0022_postgres_product_search_index')]
    operations = [
        migrations.CreateModel(
            name='ImageVariantGeneration',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('source_fingerprint', models.CharField(blank=True, max_length=64)),
                ('status', models.CharField(choices=[('queued', 'Queued'), ('processing', 'Processing'), ('ready', 'Ready'), ('failed', 'Failed')], default='queued', max_length=12)),
                ('generated_count', models.PositiveSmallIntegerField(default=0)),
                ('source_bytes', models.PositiveBigIntegerField(default=0)),
                ('generated_bytes', models.PositiveBigIntegerField(default=0)),
                ('error', models.TextField(blank=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('image', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='variant_generation', to='products.productimage')),
            ],
        ),
    ]
