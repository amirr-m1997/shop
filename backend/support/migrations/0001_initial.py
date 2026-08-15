from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('products', '0023_imagevariantgeneration'),
        ('accounts', '0010_deliveryattempt'),
    ]

    operations = [
        migrations.CreateModel(
            name='SupportConversation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('department', models.CharField(choices=[('support', 'Support'), ('fashion_stylist', 'Fashion stylist')], max_length=20)),
                ('status', models.CharField(choices=[('queued', 'Queued'), ('assigned', 'Assigned'), ('closed', 'Closed')], default='queued', max_length=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('closed_at', models.DateTimeField(blank=True, null=True)),
                ('last_message_at', models.DateTimeField(blank=True, null=True)),
                ('assigned_agent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assigned_support_conversations', to=settings.AUTH_USER_MODEL)),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='support_conversations', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-last_message_at', '-updated_at', '-id']},
        ),
        migrations.CreateModel(
            name='SupportMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.TextField(blank=True)),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('conversation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='support.supportconversation')),
                ('product', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='support_messages', to='products.product')),
                ('sender', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='support_messages', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['created_at', 'id']},
        ),
        migrations.AddConstraint(
            model_name='supportconversation',
            constraint=models.CheckConstraint(
                check=models.Q(
                    models.Q(('assigned_agent__isnull', True), ('status', 'queued')),
                    models.Q(('assigned_agent__isnull', False), ('status', 'assigned')),
                    ('status', 'closed'),
                    _connector='OR',
                ),
                name='support_status_assignment_consistent',
            ),
        ),
        migrations.AddConstraint(
            model_name='supportmessage',
            constraint=models.CheckConstraint(check=models.Q(('text__gt', '')) | models.Q(('product__isnull', False)), name='support_message_text_or_product'),
        ),
        migrations.AddIndex(model_name='supportconversation', index=models.Index(fields=['customer', '-updated_at'], name='support_customer_updated_idx')),
        migrations.AddIndex(model_name='supportconversation', index=models.Index(fields=['department', 'status', '-updated_at'], name='support_queue_idx')),
        migrations.AddIndex(model_name='supportconversation', index=models.Index(fields=['assigned_agent', 'status', '-updated_at'], name='support_agent_idx')),
        migrations.AddIndex(model_name='supportmessage', index=models.Index(fields=['conversation', 'created_at', 'id'], name='support_msg_conv_created_idx')),
        migrations.AddIndex(model_name='supportmessage', index=models.Index(fields=['conversation', 'is_read'], name='support_msg_conv_read_idx')),
    ]
