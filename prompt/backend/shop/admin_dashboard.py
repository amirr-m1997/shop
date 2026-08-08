# -*- coding: utf-8 -*-
"""
داشبورد سفارشی پنل ادمین (Unfold).
این ماژول کارت‌های آماری صفحه‌ی اصلی جنگو ادمین رو با کوئری‌های واقعی پر می‌کنه
تا جایگزین پنل React جداگانه بشه.
"""
from datetime import timedelta

from django.db.models import Sum, Count, Q
from django.utils import timezone


def dashboard_callback(request, context):
    """
    مقداردهی context صفحه‌ی اصلی ادمین (index).
    خروجی این تابع مستقیم توی تمپلیت داشبورد Unfold استفاده می‌شه.
    """
    from orders.models import Order
    from products.models import Product

    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)

    paid_orders = Order.objects.filter(payment_status='paid')

    revenue_today = paid_orders.filter(
        created_at__gte=today_start
    ).aggregate(total=Sum('total'))['total'] or 0

    revenue_week = paid_orders.filter(
        created_at__gte=week_start
    ).aggregate(total=Sum('total'))['total'] or 0

    orders_today_count = Order.objects.filter(created_at__gte=today_start).count()

    pending_orders_count = Order.objects.filter(
        status__in=['pending_payment', 'pending']
    ).count()

    processing_orders_count = Order.objects.filter(status='processing').count()

    low_stock_products = Product.objects.filter(
        is_active=True, stock__lte=5, stock__gt=0
    ).order_by('stock')[:6]

    out_of_stock_count = Product.objects.filter(is_active=True, stock=0).count()

    recent_orders = Order.objects.select_related('user').order_by('-created_at')[:8]

    # آمار وضعیت سفارش‌ها برای نمودار میله‌ای ساده
    status_breakdown = (
        Order.objects.values('status')
        .annotate(count=Count('id'))
        .order_by('-count')
    )
    status_labels = dict(Order.STATUS_CHOICES)

    context.update({
        "kpi_cards": [
            {
                "title": "فروش امروز",
                "value": f"{int(revenue_today):,} تومان",
                "icon": "payments",
            },
            {
                "title": "فروش ۷ روز اخیر",
                "value": f"{int(revenue_week):,} تومان",
                "icon": "trending_up",
            },
            {
                "title": "سفارش‌های امروز",
                "value": orders_today_count,
                "icon": "shopping_bag",
            },
            {
                "title": "در انتظار پرداخت/بررسی",
                "value": pending_orders_count,
                "icon": "hourglass_top",
            },
            {
                "title": "در حال پردازش",
                "value": processing_orders_count,
                "icon": "local_shipping",
            },
            {
                "title": "ناموجود",
                "value": out_of_stock_count,
                "icon": "production_quantity_limits",
            },
        ],
        "low_stock_products": low_stock_products,
        "recent_orders": recent_orders,
        "status_breakdown": [
            {
                "label": status_labels.get(row["status"], row["status"]),
                "count": row["count"],
            }
            for row in status_breakdown
        ],
    })
    return context
