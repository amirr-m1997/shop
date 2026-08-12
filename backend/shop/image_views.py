from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse, HttpResponseBadRequest, HttpResponseRedirect
from django.views.decorators.http import require_GET
from PIL import features

from shop.image_pipeline import FORMATS, VARIANT_WIDTHS, variant_path


ALLOWED_WIDTHS = VARIANT_WIDTHS


def _source_path(raw_source):
    # Only files below MEDIA_ROOT can be transformed. Absolute external URLs,
    # traversal and non-media application assets are deliberately rejected.
    source = raw_source.split("?", 1)[0]
    media_prefix = settings.MEDIA_URL.rstrip("/") + "/"
    if source.startswith("http://") or source.startswith("https://"):
        from urllib.parse import urlparse

        source = urlparse(source).path
    if not source.startswith(media_prefix):
        raise Http404

    relative = source[len(media_prefix):].lstrip("/")
    media_root = Path(settings.MEDIA_ROOT).resolve()
    candidate = (media_root / relative).resolve()
    if media_root not in candidate.parents or not candidate.is_file():
        raise Http404
    return candidate, relative


@require_GET
def optimized_image(request):
    requested_format = request.GET.get("format", "webp").lower()
    try:
        requested_width = int(request.GET.get("w", ""))
    except (TypeError, ValueError):
        return HttpResponseBadRequest("Invalid image width")

    if requested_width not in ALLOWED_WIDTHS or requested_format not in FORMATS:
        return HttpResponseBadRequest("Unsupported image variant")
    if requested_format == "avif" and not features.check("avif"):
        raise Http404

    source_path, relative = _source_path(request.GET.get("src", ""))
    cache_path = variant_path(source_path, relative, requested_width, requested_format)
    _pil_format, mime_type, _quality, _extra = FORMATS[requested_format]

    if not cache_path.exists():
        # Never resize/encode in a request. Queue legacy/missing product images
        # and temporarily fall back to the immutable original URL.
        try:
            from products.models import ProductImage
            from products.tasks import queue_product_image_variants
            image = ProductImage.objects.filter(image=relative).only('id').first()
            if image:
                queue_product_image_variants(image.id)
        except Exception:
            # Queue failure is persisted by the task layer; original remains usable.
            pass
        response = HttpResponseRedirect(f'{settings.MEDIA_URL.rstrip("/")}/{relative}')
        response['Cache-Control'] = 'public, max-age=60'
        return response

    accel_prefix = getattr(settings, 'MEDIA_X_ACCEL_REDIRECT_PREFIX', '')
    if accel_prefix:
        response = HttpResponse(content_type=mime_type)
        relative_variant = cache_path.relative_to(Path(settings.MEDIA_ROOT)).as_posix()
        response['X-Accel-Redirect'] = f'{accel_prefix.rstrip("/")}/{relative_variant}'
    else:
        response = FileResponse(cache_path.open("rb"), content_type=mime_type)
    response["Cache-Control"] = "public, max-age=31536000, immutable"
    response["Content-Length"] = cache_path.stat().st_size
    response["Vary"] = "Accept"
    return response
