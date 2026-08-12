from datetime import date, datetime

from django.test import SimpleTestCase
from django.utils import timezone

from shop.jalali import format_jalali, jalali_date


class JalaliFormattingTests(SimpleTestCase):
    def test_nowruz_is_formatted_with_persian_digits(self):
        value = timezone.make_aware(datetime(2024, 3, 20, 12, 30))
        self.assertEqual(format_jalali(value), '۱۴۰۳/۰۱/۰۱ - ۱۲:۳۰')
        self.assertEqual(jalali_date(date(2024, 3, 20)), '۱۴۰۳/۰۱/۰۱')

    def test_empty_value_uses_readable_placeholder(self):
        self.assertEqual(format_jalali(None), '—')
