import hashlib
import os
from pathlib import Path
from tempfile import NamedTemporaryFile

from django.conf import settings
from django.http import FileResponse, Http404, HttpResponseBadRequest
from django.views.decorators.http import require_GET
from PIL import Image, ImageOps, features


ALLOWED_WIDTHS = (160, 240, 320, 384, 480, 640, 768, 960, 1280, 1600)
FORMATS = {
    "webp": ("WEBP", "image/webp", 82),
    "avif": ("AVIF", "image/avif", 68),
}


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
    source_stat = source_path.stat()
    fingerprint = hashlib.sha256(
        f"{relative}:{source_stat.st_mtime_ns}:{source_stat.st_size}:{requested_width}:{requested_format}".encode()
    ).hexdigest()[:24]
    cache_dir = Path(settings.MEDIA_ROOT) / ".responsive-cache" / fingerprint[:2]
    cache_path = cache_dir / f"{fingerprint}-{requested_width}.{requested_format}"
    pil_format, mime_type, quality = FORMATS[requested_format]

    if not cache_path.exists():
        cache_dir.mkdir(parents=True, exist_ok=True)
        try:
            with Image.open(source_path) as source_image:
                image = ImageOps.exif_transpose(source_image)
                if image.mode not in ("RGB", "RGBA"):
                    image = image.convert("RGBA" if "transparency" in image.info else "RGB")
                target_width = min(requested_width, image.width)
                target_height = max(1, round(image.height * target_width / image.width))
                if (target_width, target_height) != image.size:
                    image = image.resize((target_width, target_height), Image.Resampling.LANCZOS)

                save_options = {"format": pil_format, "quality": quality}
                if requested_format == "webp":
                    save_options.update(method=5)
                else:
                    save_options.update(speed=6)
                with NamedTemporaryFile(dir=cache_dir, suffix=f".{requested_format}", delete=False) as tmp:
                    temp_path = Path(tmp.name)
                try:
                    image.save(temp_path, **save_options)
                    os.replace(temp_path, cache_path)
                finally:
                    temp_path.unlink(missing_ok=True)
        except (OSError, ValueError):
            raise Http404

    response = FileResponse(cache_path.open("rb"), content_type=mime_type)
    response["Cache-Control"] = "public, max-age=31536000, immutable"
    response["Content-Length"] = cache_path.stat().st_size
    response["Vary"] = "Accept"
    return response
