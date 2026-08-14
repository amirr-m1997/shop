from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('loyalty', '0003_seed_referral_event_types')]

    operations = [
        migrations.AddField(
            model_name='loyaltytransaction',
            name='purchase_tier',
            field=models.ForeignKey(
                blank=True, null=True, on_delete=models.deletion.SET_NULL,
                related_name='transactions', to='loyalty.purchaserewardtier',
            ),
        ),
        migrations.AddField(
            model_name='loyaltytransaction',
            name='qualifying_order_amount',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
    ]
