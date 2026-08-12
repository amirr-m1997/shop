import shutil
import tempfile
from pathlib import Path
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image

from products.models import ImageVariantGeneration, ProductImage
from products.serializers import ProductImageSerializer
from products.tasks import generate_product_image_variants
from shop.image_pipeline import VARIANT_WIDTHS, generate_variants, generation_lock
from shop.tests import ProductFactory


class ImagePipelineTests(TestCase):
    def setUp(self):
        self.media_root = Path(tempfile.mkdtemp())
        self.settings = override_settings(MEDIA_ROOT=self.media_root, MEDIA_URL='/media/')
        self.settings.enable()
        self.product = ProductFactory()

    def tearDown(self):
        self.settings.disable()
        shutil.rmtree(self.media_root, ignore_errors=True)

    def _upload(self, name='product.png', payload=None):
        if payload is None:
            image_path = self.media_root / 'source.png'
            Image.new('RGB', (1800, 1200), '#336699').save(image_path)
            payload = image_path.read_bytes()
        with patch('products.tasks.queue_product_image_variants'):
            with self.captureOnCommitCallbacks(execute=True):
                return ProductImage.objects.create(
                    product=self.product,
                    image=SimpleUploadedFile(name, payload, content_type='image/png'),
                )

    def test_upload_is_saved_and_queued_without_inline_encoding(self):
        with patch('products.tasks.queue_product_image_variants') as queue:
            with self.captureOnCommitCallbacks(execute=True):
                image = ProductImage.objects.create(
                    product=self.product,
                    image=SimpleUploadedFile('upload.png', b'original', content_type='image/png'),
                )
        self.assertTrue(Path(image.image.path).exists())
        queue.assert_called_once_with(image.id)

    def test_task_generates_bounded_variants_and_records_status(self):
        image = self._upload()
        self.assertTrue(generate_product_image_variants(image.id))
        state = ImageVariantGeneration.objects.get(image=image)
        self.assertEqual(state.status, 'ready')
        self.assertEqual(state.generated_count, len(VARIANT_WIDTHS) * 2)
        self.assertEqual(len(list((self.media_root / '.responsive-cache').glob('*/*.*'))), 8)

    def test_filesystem_lock_prevents_duplicate_generation(self):
        image = self._upload()
        source = Path(image.image.path)
        relative = source.relative_to(self.media_root).as_posix()
        with generation_lock(source, relative) as acquired:
            self.assertTrue(acquired)
            generated, second_acquired = generate_variants(source, relative)
        self.assertFalse(second_acquired)
        self.assertEqual(generated, [])

    def test_task_failure_is_persisted(self):
        image = self._upload(payload=b'not-an-image')
        with self.assertRaises(OSError):
            generate_product_image_variants(image.id)
        state = ImageVariantGeneration.objects.get(image=image)
        self.assertEqual(state.status, 'failed')
        self.assertTrue(state.error)

    def test_missing_variant_redirects_to_original_without_processing(self):
        image = self._upload()
        with patch('products.tasks.queue_product_image_variants') as queue:
            response = self.client.get('/api/images/optimized/', {
                'src': image.image.url, 'w': 640, 'format': 'webp',
            })
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, image.image.url)
        queue.assert_called_once_with(image.id)

    def test_serializer_keeps_original_image_url_contract(self):
        image = self._upload()
        self.assertEqual(ProductImageSerializer(image).data['image'], image.image.url)
