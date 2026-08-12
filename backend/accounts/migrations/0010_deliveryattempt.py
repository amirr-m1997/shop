from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('accounts', '0009_unique_normalized_user_email')]

    operations = [
        migrations.CreateModel(
            name='DeliveryAttempt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('channel', models.CharField(choices=[('email', 'Email'), ('sms', 'SMS')], max_length=10)),
                ('purpose', models.CharField(max_length=50)),
                ('recipient', models.CharField(max_length=254)),
                ('status', models.CharField(choices=[('queued', 'Queued'), ('sending', 'Sending'), ('sent', 'Sent'), ('failed', 'Failed')], default='queued', max_length=10)),
                ('attempts', models.PositiveSmallIntegerField(default=0)),
                ('provider', models.CharField(blank=True, max_length=150)),
                ('error', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.AddIndex(
            model_name='deliveryattempt',
            index=models.Index(fields=['channel', 'status', '-created_at'], name='accounts_de_channel_b7f34d_idx'),
        ),
    ]
