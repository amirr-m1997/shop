# Generated for safe legacy inventory-source reconciliation; intentionally unapplied.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('orders', '0015_orderitem_inventory_source_snapshot'),
    ]

    operations = [
        migrations.AlterField(
            model_name='orderitem',
            name='inventory_source',
            field=models.CharField(
                blank=True,
                choices=[
                    ('PRODUCT', 'Product inventory'),
                    ('VARIANT', 'Variant inventory'),
                    ('LEGACY_UNKNOWN', 'Legacy source unresolved'),
                ],
                editable=False,
                max_length=14,
                null=True,
            ),
        ),
        migrations.CreateModel(
            name='LegacyInventoryReconciliation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('decision', models.CharField(choices=[('PRODUCT', 'PRODUCT'), ('VARIANT', 'VARIANT'), ('LEGACY_UNKNOWN', 'UNKNOWN / remain unresolved')], max_length=14)),
                ('reason', models.TextField()),
                ('evidence_reference', models.CharField(max_length=300)),
                ('order_id_snapshot', models.PositiveBigIntegerField()),
                ('product_id_snapshot', models.PositiveBigIntegerField(blank=True, null=True)),
                ('variant_id_snapshot', models.PositiveBigIntegerField(blank=True, null=True)),
                ('quantity_snapshot', models.PositiveIntegerField()),
                ('reservation_started_at_snapshot', models.DateTimeField(blank=True, null=True)),
                ('reservation_released_at_snapshot', models.DateTimeField(blank=True, null=True)),
                ('order_status_snapshot', models.CharField(max_length=20)),
                ('payment_status_snapshot', models.CharField(max_length=20)),
                ('reconciled_at', models.DateTimeField(auto_now_add=True)),
                ('operator', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='legacy_inventory_reconciliations', to=settings.AUTH_USER_MODEL)),
                ('order_item', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='legacy_reconciliations', to='orders.orderitem')),
            ],
            options={'ordering': ['-reconciled_at', '-id']},
        ),
        migrations.AddIndex(model_name='legacyinventoryreconciliation', index=models.Index(fields=['order_item', '-reconciled_at'], name='legacy_recon_item_created_idx')),
        migrations.AddIndex(model_name='legacyinventoryreconciliation', index=models.Index(fields=['decision', '-reconciled_at'], name='legacy_recon_decision_idx')),
    ]
