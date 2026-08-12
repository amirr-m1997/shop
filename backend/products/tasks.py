"""Background product image processing tasks."""
import logging
from pathlib import Path

from django.conf import settings

from shop.image_pipeline import generate_variants, source_fingerprint

logger = logging.getLogger('products')


def generate_product_image_variants(image_id):
    from products.models import ImageVariantGeneration, ProductImage

    image = ProductImage.objects.get(pk=image_id)
    state, _ = ImageVariantGeneration.objects.get_or_create(image=image)
    state.status = 'processing'
    state.error = ''
    state.save(update_fields=['status', 'error', 'updated_at'])
    try:
        source = Path(image.image.path).resolve()
        media_root = Path(settings.MEDIA_ROOT).resolve()
        if media_root not in source.parents or not source.is_file():
            raise FileNotFoundError('Product image source is unavailable')
        relative = source.relative_to(media_root).as_posix()
        generated, acquired = generate_variants(source, relative)
        if not acquired:
            state.status = 'queued'
            state.save(update_fields=['status', 'updated_at'])
            logger.info('[image_generation_skipped_locked] image_id=%s', image_id)
            return False
        state.status = 'ready'
        state.source_fingerprint = source_fingerprint(source, relative)
        state.generated_count = len(generated)
        state.source_bytes = source.stat().st_size
        state.generated_bytes = sum(path.stat().st_size for path in generated)
        state.save(update_fields=[
            'status', 'source_fingerprint', 'generated_count', 'source_bytes',
            'generated_bytes', 'error', 'updated_at',
        ])
        logger.info(
            '[image_generation_ready] image_id=%s variants=%s bytes=%s',
            image_id, len(generated), state.generated_bytes,
        )
        return True
    except Exception as exc:
        state.status = 'failed'
        state.error = str(exc)[:2000]
        state.save(update_fields=['status', 'error', 'updated_at'])
        logger.exception('[image_generation_failed] image_id=%s', image_id)
        raise


def queue_product_image_variants(image_id):
    from django_q.tasks import async_task
    from products.models import ImageVariantGeneration, ProductImage

    image = ProductImage.objects.get(pk=image_id)
    state, _ = ImageVariantGeneration.objects.get_or_create(image=image)
    try:
        source = Path(image.image.path).resolve()
        relative = source.relative_to(Path(settings.MEDIA_ROOT).resolve()).as_posix()
        current_fingerprint = source_fingerprint(source, relative)
    except (FileNotFoundError, ValueError):
        current_fingerprint = ''
    if state.status in ('queued', 'processing') and state.source_fingerprint == current_fingerprint:
        return None
    state.status = 'queued'
    state.source_fingerprint = current_fingerprint
    state.error = ''
    state.save(update_fields=['status', 'source_fingerprint', 'error', 'updated_at'])
    try:
        return async_task(
            'products.tasks.generate_product_image_variants', image_id, priority=3,
        )
    except Exception as exc:
        state.status = 'failed'
        state.error = str(exc)[:2000]
        state.save(update_fields=['status', 'error', 'updated_at'])
        logger.exception('[image_queue_failed] image_id=%s', image_id)
        raise
