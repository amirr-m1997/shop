"""Shared Jalali formatting helpers for all user-facing backend output."""

from datetime import date, datetime

import jdatetime
from django.utils import timezone


PERSIAN_DIGITS = str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹')


def persian_digits(value):
    return str(value).translate(PERSIAN_DIGITS)


def _local(value):
    if isinstance(value, datetime) and timezone.is_aware(value):
        return timezone.localtime(value)
    return value


def format_jalali(value, *, with_time=True, long=False, empty='—'):
    """Format a Gregorian date/datetime as a Persian-digit Jalali string."""
    if not value:
        return empty

    value = _local(value)
    try:
        if isinstance(value, datetime):
            converted = jdatetime.datetime.fromgregorian(datetime=value)
        elif isinstance(value, date):
            converted = jdatetime.date.fromgregorian(date=value)
        else:
            return empty

        if long:
            months = (
                'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
                'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
            )
            result = f'{converted.day} {months[converted.month - 1]} {converted.year}'
            if with_time and isinstance(value, datetime):
                result += f'، ساعت {converted.hour:02d}:{converted.minute:02d}'
        else:
            result = f'{converted.year:04d}/{converted.month:02d}/{converted.day:02d}'
            if with_time and isinstance(value, datetime):
                result += f' - {converted.hour:02d}:{converted.minute:02d}'
        return persian_digits(result)
    except (TypeError, ValueError, OverflowError):
        return empty


def jalali_date(value):
    return format_jalali(value, with_time=False)


def jalali_datetime(value):
    return format_jalali(value, with_time=True)
