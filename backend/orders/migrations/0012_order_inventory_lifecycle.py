from django.db import migrations, models


def mark_existing_pending_reservations(apps, schema_editor):
    Order = apps.get_model('orders', 'Order')
    for order in Order.objects.filter(
        status='pending_payment', payment_status='unpaid', inventory_reserved_at__isnull=True,
    ).iterator():
        order.inventory_reserved_at = order.created_at
        order.save(update_fields=['inventory_reserved_at'])


class Migration(migrations.Migration):
    dependencies = [('orders', '0011_order_coupon')]

    operations = [
        migrations.AddField(
            model_name='order',
            name='inventory_reserved_at',
            field=models.DateTimeField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='inventory_released_at',
            field=models.DateTimeField(blank=True, editable=False, null=True),
        ),
        migrations.RunPython(mark_existing_pending_reservations, migrations.RunPython.noop),
    ]
