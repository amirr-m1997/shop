# Generated for Phase 3A referral attribution; intentionally not applied here.

import django.db.models.deletion
import uuid

from django.conf import settings
from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('chat', '0006_styleroommessageread_message_style_room_and_more'),
        ('loyalty', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ReferralAttribution',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('token_hash', models.CharField(editable=False, max_length=64, unique=True)),
                ('status', models.CharField(choices=[('created', 'Created'), ('landed', 'Opened'), ('claimed', 'Claimed at registration'), ('verified', 'Verified'), ('expired', 'Expired')], default='created', max_length=16)),
                ('expires_at', models.DateTimeField()),
                ('first_landed_at', models.DateTimeField(blank=True, null=True)),
                ('last_landed_at', models.DateTimeField(blank=True, null=True)),
                ('landing_count', models.PositiveIntegerField(default=0)),
                ('claimed_at', models.DateTimeField(blank=True, null=True)),
                ('verified_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('originating_message', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='referral_attributions', to='chat.message')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='referral_attributions', to='products.product')),
                ('qualifying_order', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='referral_attributions', to='orders.order')),
                ('referred_user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='received_product_referrals', to=settings.AUTH_USER_MODEL)),
                ('referrer', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='product_referrals', to=settings.AUTH_USER_MODEL)),
            ],
            options={'verbose_name': 'Referral attribution', 'verbose_name_plural': 'Referral attributions', 'ordering': ['-created_at']},
        ),
        migrations.AddIndex(model_name='referralattribution', index=models.Index(fields=['referrer', '-created_at'], name='referral_referrer_created_idx')),
        migrations.AddIndex(model_name='referralattribution', index=models.Index(fields=['status', 'expires_at'], name='referral_status_expiry_idx')),
        migrations.AddConstraint(model_name='referralattribution', constraint=models.UniqueConstraint(condition=Q(('referred_user__isnull', False)), fields=('referred_user',), name='referral_one_attribution_per_user')),
    ]
