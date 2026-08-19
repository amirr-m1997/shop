from django.db import migrations, models


def merge_duplicate_open_conversations(apps, schema_editor):
    SupportConversation = apps.get_model('support', 'SupportConversation')
    SupportMessage = apps.get_model('support', 'SupportMessage')
    from django.db.models import Count, Max, Q

    groups = (
        SupportConversation.objects
        .filter(~Q(status='closed'))
        .values('customer_id', 'department')
        .annotate(total=Count('id'))
        .filter(total__gt=1)
    )
    for group in groups:
        conversations = list(
            SupportConversation.objects
            .filter(customer_id=group['customer_id'], department=group['department'])
            .exclude(status='closed')
            .order_by('-last_message_at', '-updated_at', '-id')
        )
        keep = conversations[0]
        for duplicate in conversations[1:]:
            SupportMessage.objects.filter(conversation=duplicate).update(conversation=keep)
            duplicate.status = 'closed'
            duplicate.closed_at = None
            duplicate.save(update_fields=['status', 'closed_at', 'updated_at'])
        latest = SupportMessage.objects.filter(conversation=keep).aggregate(at=Max('created_at'))['at']
        if latest is not None:
            keep.last_message_at = latest
            keep.save(update_fields=['last_message_at', 'updated_at'])


class Migration(migrations.Migration):

    dependencies = [
        ('support', '0002_supportdepartmentmembership'),
    ]

    operations = [
        migrations.RunPython(merge_duplicate_open_conversations, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='supportconversation',
            constraint=models.UniqueConstraint(
                condition=models.Q(('status', 'closed'), _negated=True),
                fields=('customer', 'department'),
                name='support_one_open_conversation_per_department',
            ),
        ),
    ]