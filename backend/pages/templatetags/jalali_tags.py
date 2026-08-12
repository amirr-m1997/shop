from django import template

from shop.jalali import format_jalali


register = template.Library()


@register.filter
def shamsi_date(value, arg='date'):
    """Usage: {{ value|shamsi_date }} or {{ value|shamsi_date:'datetime' }}."""
    return format_jalali(
        value,
        with_time=arg in {'datetime', 'long_datetime'},
        long=arg in {'long', 'long_datetime'},
    )
