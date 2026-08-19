# -*- coding: utf-8 -*-
from datetime import timedelta

from django.db.models import Sum, F, DecimalField, ExpressionWrapper
from django.db.models.functions import TruncDate
from django.utils import timezone
from shop.jalali import format_jalali


def dashboard_context(request):
    context = {}
    from django.contrib.auth.models import User
    from orders.models import Order, OrderItem
    from products.models import Product

    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)
    week_start = today_start - timedelta(days=7)

    paid_orders = Order.objects.filter(payment_status='paid')

    revenue_today = paid_orders.filter(created_at__gte=today_start).aggregate(total=Sum('total'))['total'] or 0
    revenue_yesterday = paid_orders.filter(created_at__gte=yesterday_start, created_at__lt=today_start).aggregate(total=Sum('total'))['total'] or 0
    revenue_week = paid_orders.filter(created_at__gte=week_start).aggregate(total=Sum('total'))['total'] or 0

    orders_today_count = Order.objects.filter(created_at__gte=today_start).count()
    orders_yesterday_count = Order.objects.filter(created_at__gte=yesterday_start, created_at__lt=today_start).count()

    low_stock_products = Product.objects.filter(
        is_active=True, stock__lte=5, stock__gt=0
    ).order_by('stock')[:6]
    total_users = User.objects.count()
    out_of_stock_count = Product.objects.filter(is_active=True, stock=0).count()
    recent_orders = Order.objects.select_related('user').order_by('-created_at')[:8]
    sales_rows = list(
        paid_orders.filter(created_at__gte=today_start - timedelta(days=29))
        .annotate(day=TruncDate('created_at'))
        .values('day').annotate(total=Sum('total')).order_by('day')
    )
    sales_map = {row['day']: row['total'] or 0 for row in sales_rows}
    sales_chart = []
    for offset in range(30):
        day = (today_start - timedelta(days=29 - offset)).date()
        sales_chart.append({'date': day, 'total': sales_map.get(day, 0)})
    max_daily_sales = max((point['total'] for point in sales_chart), default=0) or 1
    chart_width, chart_height = 760, 240
    for index, point in enumerate(sales_chart):
        point['x'] = round(index * chart_width / 29, 1)
        point['y'] = round(chart_height - (point['total'] / max_daily_sales * 205), 1)
    chart_points = ' '.join(f"{point['x']},{point['y']}" for point in sales_chart)
    chart_area_points = f"0,{chart_height} {chart_points} {chart_width},{chart_height}"

    line_total = ExpressionWrapper(
        F('quantity') * F('price'),
        output_field=DecimalField(max_digits=16, decimal_places=2),
    )
    best_selling_products = list(
        OrderItem.objects.filter(order__payment_status='paid', product__isnull=False)
        .values('product_id', 'product__name')
        .annotate(units_sold=Sum('quantity'), revenue=Sum(line_total))
        .order_by('-units_sold')[:5]
    )
    from products.models import ProductImage
    image_map = {}
    for row in ProductImage.objects.filter(
            product_id__in=[item['product_id'] for item in best_selling_products]
        ).order_by('product_id', '-is_primary', 'order').values('product_id', 'image'):
        image_map.setdefault(row['product_id'], row['image'])
    for product in best_selling_products:
        product['image'] = image_map.get(product['product_id'])

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
                "title": "سفارش‌های جدید",
                "value": f"{orders_today_count:,}",
                "meta": "نسبت به دیروز",
                "change": pct_change(orders_today_count, orders_yesterday_count),
                "icon": "shopping_cart",
            },
            {
                "title": "مشتریان",
                "value": f"{total_users:,}",
                "meta": "کاربر ثبت‌شده",
                "icon": "group",
            },
            {
                "title": "محصولات کم‌موجود",
                "value": f"{low_stock_products.count() + out_of_stock_count:,}",
                "meta": "نیازمند تأمین",
                "icon": "inventory_2",
            },
        ],
        "total_users": total_users,
        "low_stock_products": low_stock_products,
        "recent_orders": recent_orders,
        "sales_chart": sales_chart,
        "chart_points": chart_points,
        "chart_area_points": chart_area_points,
        "chart_max": toman(max_daily_sales),
        "revenue_week": toman(revenue_week),
        "best_selling_products": best_selling_products,
        "today_jalali": format_jalali(now, with_time=False, long=True),
    })
    return context
