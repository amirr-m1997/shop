from django.core.management.base import BaseCommand
from products.models import Product


class Command(BaseCommand):
    help = 'محاسبه مجدد امتیاز و تعداد نظرات تمام محصولات'

    def handle(self, *args, **options):
        products = Product.objects.all()
        count = 0
        for product in products:
            product.update_rating()
            count += 1
        self.stdout.write(self.style.SUCCESS(f'امتیاز {count} محصول با موفقیت بروزرسانی شد.'))
