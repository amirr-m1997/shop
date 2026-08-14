from django.db import migrations


def seed_event_types(apps, schema_editor):
    EventType = apps.get_model('loyalty', 'LoyaltyEventType')
    for code, name, description in (
        ('referral-registration', 'Referral registration', 'Reward for the referrer when a referred user verifies registration.'),
        ('referred-user-registration', 'Referred user registration', 'Reward for a referred user when they verify registration.'),
        ('purchase', 'Purchase', 'Reward for a user after a payment is successfully verified.'),
        ('referral-purchase', 'Referral purchase', 'Reward for a referrer when their verified referred user completes a purchase.'),
    ):
        EventType.objects.get_or_create(code=code, defaults={'name': name, 'description': description})


class Migration(migrations.Migration):

    dependencies = [('loyalty', '0002_referralattribution')]

    operations = [migrations.RunPython(seed_event_types, migrations.RunPython.noop)]
