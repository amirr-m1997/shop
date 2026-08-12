"""Deterministic image variants generated outside HTTP requests."""
import hashlib
import os
from contextlib import contextmanager
from pathlib import Path
from tempfile import NamedTemporaryFile

from django.conf import settings
from PIL import Image, ImageOps, features


VARIANT_WIDTHS = (320, 640, 1024, 1600)
FORMATS = {
    'webp': ('WEBP', 'image/webp', 82, {'method': 5}),
    'avif': ('AVIF', 'image/avif', 68, {'speed': 6}),
}


def source_fingerprint(source_path, relative):
    stat = source_path.stat()
    return hashlib.sha256(
        f'{relative}:{stat.st_mtime_ns}:{stat.st_size}'.encode()
    ).hexdigest()[:24]


def variant_path(source_path, relative, width, image_format):
    fingerprint = source_fingerprint(source_path, relative)
    directory = Path(settings.MEDIA_ROOT) / '.responsive-cache' / fingerprint[:2]
    return directory / f'{fingerprint}-{width}.{image_format}'


@contextmanager
def generation_lock(source_path, relative):
    fingerprint = source_fingerprint(source_path, relative)
    lock_dir = Path(settings.MEDIA_ROOT) / '.responsive-cache' / 'locks'
    lock_dir.mkdir(parents=True, exist_ok=True)
    lock_path = lock_dir / f'{fingerprint}.lock'
    try:
        descriptor = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError:
        yield False
        return
    os.close(descriptor)
    try:
        yield True
    finally:
        lock_path.unlink(missing_ok=True)


def generate_variants(source_path, relative):
    """Generate at most four widths in WebP and AVIF, preserving the original."""
    generated = []
    with generation_lock(source_path, relative) as acquired:
        if not acquired:
            return generated, False
        with Image.open(source_path) as source:
            source.load()
            source = ImageOps.exif_transpose(source)
            source.info.pop('exif', None)
            source.info.pop('icc_profile', None)
            if source.mode not in ('RGB', 'RGBA'):
                source = source.convert('RGBA' if 'transparency' in source.info else 'RGB')
            for width in VARIANT_WIDTHS:
                target_width = min(width, source.width)
                target_height = max(1, round(source.height * target_width / source.width))
                resized = source if source.size == (target_width, target_height) else source.resize(
                    (target_width, target_height), Image.Resampling.LANCZOS,
                )
                for extension, (pil_format, _mime, quality, extra) in FORMATS.items():
                    if extension == 'avif' and not features.check('avif'):
                        continue
                    destination = variant_path(source_path, relative, width, extension)
                    if destination.exists():
                        generated.append(destination)
                        continue
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    with NamedTemporaryFile(dir=destination.parent, suffix=f'.{extension}', delete=False) as tmp:
                        temporary = Path(tmp.name)
                    try:
                        resized.save(
                            temporary, format=pil_format, quality=quality,
                            optimize=True, **extra,
                        )
                        os.replace(temporary, destination)
                    finally:
                        temporary.unlink(missing_ok=True)
                    generated.append(destination)
    return generated, True
