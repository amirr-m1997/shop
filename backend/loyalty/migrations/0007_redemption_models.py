import django.core.validators
import django.db.models.deletion
import loyalty.models
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('loyalty', '0006_seed_review_event_type'),
        ('orders', '0016_legacyinventoryreconciliation'),
    ]

    operations = [
        migrations.CreateModel(
            name='LoyaltyRedemptionRule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.SlugField(max_length=96, unique=True)),
                ('name', models.CharField(max_length=160)),
                ('reward_type', models.CharField(choices=[('discount', 'Discount'), ('free_shipping', 'Free shipping')], max_length=20)),
                ('points_required', models.PositiveIntegerField(validators=[django.core.validators.MinValueValidator(1)])),
                ('discount_type', models.CharField(blank=True, choices=[('percentage', 'Percentage'), ('fixed', 'Fixed amount')], max_length=20, null=True)),
                ('discount_value', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('minimum_order_value', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('maximum_discount', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('usage_limit', models.PositiveIntegerField(blank=True, null=True)),
                ('used_count', models.PositiveIntegerField(default=0)),
                ('priority', models.IntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('starts_at', models.DateTimeField(blank=True, null=True)),
                ('ends_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={'ordering': ['-priority', 'id']},
        ),
        migrations.CreateModel(
            name='LoyaltyRedemption',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('redemption_code', models.CharField(default=loyalty.models.generate_redemption_code, max_length=96, unique=True)),
                ('idempotency_key', models.CharField(max_length=191, unique=True)),
                ('status', models.CharField(choices=[('available', 'Available'), ('reserved', 'Reserved for checkout'), ('consumed', 'Consumed')], default='available', max_length=16)),
                ('points_cost', models.PositiveIntegerField()),
                ('reward_type', models.CharField(choices=[('discount', 'Discount'), ('free_shipping', 'Free shipping')], max_length=20)),
                ('discount_type', models.CharField(blank=True, choices=[('percentage', 'Percentage'), ('fixed', 'Fixed amount')], max_length=20, null=True)),
                ('discount_value', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('minimum_order_value', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('maximum_discount', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('redeemed_at', models.DateTimeField(auto_now_add=True)),
                ('reserved_at', models.DateTimeField(blank=True, null=True)),
                ('consumed_at', models.DateTimeField(blank=True, null=True)),
                ('released_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('ledger_transaction', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='redemption_record', to='loyalty.loyaltytransaction')),
                ('order', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='loyalty_redemptions', to='orders.order')),
                ('rule', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='redemptions', to='loyalty.loyaltyredemptionrule')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='loyalty_redemptions', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at', '-id']},
        ),
        migrations.AddConstraint(
            model_name='loyaltyredemptionrule',
            constraint=models.CheckConstraint(check=models.Q(ends_at__isnull=True) | models.Q(starts_at__isnull=True) | models.Q(ends_at__gte=models.F('starts_at')), name='loyalty_redeem_rule_valid_dates'),
        ),
        migrations.AddConstraint(
            model_name='loyaltyredemptionrule',
            constraint=models.CheckConstraint(check=models.Q(used_count__gte=0), name='loyalty_redeem_rule_used_nonnegative'),
        ),
    ]
