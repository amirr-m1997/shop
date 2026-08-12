from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('accounts', '0007_userprofile_style_preferences')]

    operations = [
        migrations.AddField(
            model_name='userprofile', name='code_generated_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='زمان تولید کد تأیید'),
        ),
        migrations.AddField(
            model_name='userprofile', name='reset_token_created_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='زمان تولید توکن بازیابی'),
        ),
    ]
