from django.db import migrations


def seed_review_event_type(apps, schema_editor):
    EventType = apps.get_model('loyalty', 'LoyaltyEventType')
    EventType.objects.get_or_create(
        code='review-submission',
        defaults={
            'name': 'Review submission',
            'description': 'Reward for submitting a valid persisted product review.',
        },
    )


class Migration(migrations.Migration):
    dependencies = [('loyalty', '0005_seed_purchase_event_types')]
    operations = [migrations.RunPython(seed_review_event_type, migrations.RunPython.noop)]
