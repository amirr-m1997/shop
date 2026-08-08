# -*- coding: utf-8 -*-
from datetime import timedelta

from django.db.models import Sum, Count
from django.utils import timezone


def dashboard_callback(request, context):
    from orders.models import Order
    from products.models import Product

    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)
    week_start = today_start - timedelta(days=7)
    previous_week_start = week_start - timedelta(days=7)

    paid_orders = Order.objects.filter(payment_status='paid')

    revenue_today = paid_orders.filter(created_at__gte=today_start).aggregate(total=Sum('total'))['total'] or 0
    revenue_yesterday = paid_orders.filter(created_at__gte=yesterday_start, created_at__lt=today_start).aggregate(total=Sum('total'))['total'] or 0
    revenue_week = paid_orders.filter(created_at__gte=week_start).aggregate(total=Sum('total'))['total'] or 0
    revenue_previous_week = paid_orders.filter(created_at__gte=previous_week_start, created_at__lt=week_start).aggregate(total=Sum('total'))['total'] or 0

    orders_today_count = Order.objects.filter(created_at__gte=today_start).count()
    orders_yesterday_count = Order.objects.filter(created_at__gte=yesterday_start, created_at__lt=today_start).count()

    pending_orders_count = Order.objects.filter(status__in=['pending_payment', 'pending']).count()
    processing_orders_count = Order.objects.filter(status='processing').count()

    low_stock_products = Product.objects.filter(
        is_active=True, stock__lte=5, stock__gt=0
    ).order_by('stock')[:6]
    out_of_stock_count = Product.objects.filter(is_active=True, stock=0).count()
    recent_orders = Order.objects.select_related('user').order_by('-created_at')[:8]

    status_breakdown = (
        Order.objects.values('status')
        .annotate(count=Count('id'))
        .order_by('-count')
    )
    status_labels = dict(Order.STATUS_CHOICES)
    max_status_count = max((row['count'] for row in status_breakdown), default=0) or 1

    def toman(value):
        return f"{int(value):,} تومان"

    def pct_change(current, previous):
        if not previous:
            return None
        return round(((current - previous) / previous) * 100, 1)

    context.update({
        "kpi_cards": [
            {
                "title": "فروش امروز",
                "value": toman(revenue_today),
                "meta": f"{orders_today_count:,} سفارش امروز",
                "change": pct_change(revenue_today, revenue_yesterday),
                "icon": "payments",
            },
            {
                "title": "فروش ۷ روز اخیر",
                "value": toman(revenue_week),
                "meta": "درآمد پرداخت‌شده",
                "change": pct_change(revenue_week, revenue_previous_week),
                "icon": "trending_up",
            },
            {
                "title": "سفارش‌های امروز",
                "value": orders_today_count,
                "meta": f"{orders_yesterday_count:,} سفارش دیروز",
                "change": pct_change(orders_today_count, orders_yesterday_count),
                "icon": "shopping_bag",
            },
            {
                "title": "در انتظار پرداخت",
                "value": pending_orders_count,
                "meta": "نیازمند پیگیری",
                "icon": "hourglass_top",
            },
            {
                "title": "در حال پردازش",
                "value": processing_orders_count,
                "meta": "آماده عملیات",
                "icon": "local_shipping",
            },
            {
                "title": "ناموجود",
                "value": out_of_stock_count,
                "meta": "کالاهای بدون موجودی",
                "icon": "production_quantity_limits",
            },
        ],
        "low_stock_products": low_stock_products,
        "recent_orders": recent_orders,
        "status_breakdown": [
            {
                "label": status_labels.get(row["status"], row["status"]),
                "count": row["count"],
                "percent": round(row["count"] / max_status_count * 100),
            }
            for row in status_breakdown
        ],
    })
    return context
