from django.db import migrations
from django.db.models import Count
from django.db.models.functions import Lower, Trim


INDEX_NAME = 'auth_user_email_ci_unique'


def normalize_and_validate_emails(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    duplicates = list(
        User.objects.exclude(email='')
        .annotate(normalized_email=Lower(Trim('email')))
        .values('normalized_email')
        .annotate(total=Count('id'))
        .filter(total__gt=1)
        .values_list('normalized_email', flat=True)
    )
    if duplicates:
        sample = ', '.join(duplicates[:5])
        raise RuntimeError(
            'Cannot enforce unique normalized emails; resolve duplicate accounts first: '
            f'{sample}'
        )

    for user in User.objects.exclude(email='').iterator():
        normalized = user.email.strip().lower()
        if user.email != normalized:
            User.objects.filter(pk=user.pk).update(email=normalized)


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0008_userprofile_verification_timestamps'),
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.RunPython(normalize_and_validate_emails, migrations.RunPython.noop),
        migrations.RunSQL(
            sql=(
                f'CREATE UNIQUE INDEX {INDEX_NAME} '
                'ON auth_user (LOWER(TRIM(email))) WHERE TRIM(email) <> \'\''
            ),
            reverse_sql=f'DROP INDEX IF EXISTS {INDEX_NAME}',
        ),
    ]
