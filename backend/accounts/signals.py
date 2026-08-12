from django.contrib.auth.models import User
from django.db.models.signals import post_delete
from django.dispatch import receiver


@receiver(post_delete, sender=User)
def delete_user_tokens(sender, instance, **kwargs):
    """Whenever a user is deleted, remove all of their auth tokens.

    DRF's Token declares on_delete=CASCADE, but SQLite does not emit
    ON DELETE CASCADE in its schema (Django handles the cascade in the ORM
    collector only). This signal guarantees the token rows are removed on
    any ORM-level user deletion path (Django admin, dashboard API, shell).
    """
    from rest_framework.authtoken.models import Token
    Token.objects.filter(user_id=instance.pk).delete()
