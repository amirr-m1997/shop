from django.db import migrations


def forwards(apps, schema_editor):
    Message = apps.get_model('chat', 'Message')
    MessageReaction = apps.get_model('chat', 'MessageReaction')

    batch = []
    for msg in Message.objects.filter(reaction__isnull=False).exclude(reaction=''):
        batch.append(MessageReaction(
            message_id=msg.id,
            user_id=msg.sender_id,
            emoji=msg.reaction,
        ))
    MessageReaction.objects.bulk_create(batch, ignore_conflicts=True)


def backwards(apps, schema_editor):
    MessageReaction = apps.get_model('chat', 'MessageReaction')
    Message = apps.get_model('chat', 'Message')
    # Best-effort: pick one reaction per message to write back to legacy field
    from django.db.models import Min
    for row in MessageReaction.objects.values('message_id').annotate(first_id=Min('id')):
        reaction = MessageReaction.objects.filter(pk=row['first_id']).first()
        if reaction:
            Message.objects.filter(pk=reaction.message_id).update(reaction=reaction.emoji)


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0011_message_reaction_per_user'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
