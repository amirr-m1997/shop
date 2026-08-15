from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('support', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='SupportDepartmentMembership',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('department', models.CharField(choices=[('support', 'Support'), ('fashion_stylist', 'Fashion stylist')], max_length=20)),
                ('active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('staff', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='support_department_memberships', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddConstraint(model_name='supportdepartmentmembership', constraint=models.UniqueConstraint(fields=('staff', 'department'), name='support_staff_department_unique')),
        migrations.AddIndex(model_name='supportdepartmentmembership', index=models.Index(fields=['department', 'active', 'staff'], name='support_membership_lookup_idx')),
    ]
