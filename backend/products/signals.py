import logging

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from products.models import ProductImage


logger = logging.getLogger(__name__)


@receiver(post_save, sender=ProductImage)
def queue_product_image_processing(sender, instance, **kwargs):
    if not instance.image:
        return
    image_id = instance.pk

    def enqueue():
        from products.tasks import queue_product_image_variants
        try:
            queue_product_image_variants(image_id)
        except Exception:
            # The original upload is the source of truth. A temporary queue
            # outage must not turn a successful upload into a 500 response.
            logger.exception("Could not queue variants for product image %s", image_id)

    transaction.on_commit(enqueue)
