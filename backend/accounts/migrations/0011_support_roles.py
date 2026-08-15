from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('accounts', '0010_deliveryattempt')]

    operations = [
        migrations.AlterField(
            model_name='userprofile',
            name='role',
            field=models.CharField(
                choices=[
                    ('user', 'کاربر عادی'),
                    ('moderator', 'ناظر'),
                    ('admin', 'مدیر'),
                    ('super_admin', 'مدیر اصلی'),
                    ('support_agent', 'پشتیبان'),
                    ('fashion_stylist', 'استایلیست مد'),
                ],
                default='user',
                max_length=20,
                verbose_name='نقش',
            ),
        ),
    ]
