from datetime import datetime, timedelta

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from orders.models import Order, OrderItem

from .models import TodoItem
from .permissions import IsAdminUser


# ── Phase 3: Custom Reports ──────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def custom_report(request):
    """گزارش سفارشی با بازه تاریخ و گروه‌بندی"""
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    group_by = request.query_params.get('group_by', 'day')
    report_type = request.query_params.get('type', 'orders')

    if not start_date or not end_date:
        return Response({'error': 'تاریخ شروع و پایان الزامی است'}, status=400)

    try:
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
    except ValueError:
        return Response({'error': 'فرمت تاریخ نامعتبر'}, status=400)

    if start > end:
        return Response({'error': 'تاریخ شروع باید قبل از تاریخ پایان باشد'}, status=400)
    if (end - start).days > 366:
        return Response({'error': 'بازه تاریخ حداکثر یک سال است'}, status=400)

    start_aware = timezone.make_aware(start) if timezone.is_naive(start) else start
    end_aware = timezone.make_aware(end) if timezone.is_naive(end) else end

    orders_qs = Order.objects.filter(created_at__gte=start_aware, created_at__lte=end_aware)

    if group_by == 'day':
        date_format = '%Y-%m-%d'
        truncate_func = lambda d: d.strftime('%Y-%m-%d')
    elif group_by == 'week':
        date_format = '%Y-W%W'
        truncate_func = lambda d: d.strftime('%Y-W%W')
    else:
        date_format = '%Y-%m'
        truncate_func = lambda d: d.strftime('%Y-%m')

    groups = {}
    for order in orders_qs.select_related('user').annotate(items_count=Count('items')):
        key = truncate_func(order.created_at)
        if key not in groups:
            groups[key] = {'date': key, 'revenue': 0, 'orders': 0, 'items': 0}
        if order.payment_status == 'paid':
            groups[key]['revenue'] += float(order.total)
        groups[key]['orders'] += 1
        groups[key]['items'] += order.items_count

    data = sorted(groups.values(), key=lambda x: x['date'])

    summary = {
        'total_orders': orders_qs.count(),
        'total_revenue': float(orders_qs.filter(payment_status='paid').aggregate(t=Sum('total'))['t'] or 0),
        'total_items': sum(d['items'] for d in data),
        'avg_order_value': 0,
    }
    if summary['total_orders'] > 0:
        summary['avg_order_value'] = summary['total_revenue'] / summary['total_orders']

    return Response({'data': data, 'summary': summary})


# ── Phase 3: Comparison Chart ────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def comparison_chart(request):
    """نمودار مقایسه‌ای دو دوره زمانی"""
    period = request.query_params.get('period', 'monthly')

    now = timezone.now()

    if period == 'yearly':
        current_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        previous_start = current_start.replace(year=current_start.year - 1)
        previous_end = current_start - timedelta(seconds=1)
        label_current = str(current_start.year)
        label_previous = str(current_start.year - 1)
    else:
        current_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        previous_month_end = current_start - timedelta(days=1)
        previous_start = previous_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        label_current = current_start.strftime('%Y-%m')
        label_previous = previous_start.strftime('%Y-%m')

    def get_period_stats(start, end):
        qs = Order.objects.filter(created_at__gte=start, created_at__lte=end)
        return {
            'revenue': float(qs.filter(payment_status='paid').aggregate(t=Sum('total'))['t'] or 0),
            'orders': qs.count(),
            'items': OrderItem.objects.filter(order__in=qs).aggregate(t=Sum('quantity'))['t'] or 0,
        }

    # Align previous period to same elapsed duration as current (MTD vs MTD)
    elapsed = now - current_start
    previous_end_aligned = previous_start + elapsed

    current = get_period_stats(current_start, now)
    previous = get_period_stats(previous_start, previous_end_aligned)

    changes = {}
    for key in ['revenue', 'orders', 'items']:
        old = previous[key]
        new = current[key]
        if old > 0:
            changes[key] = round(((new - old) / old) * 100, 1)
        else:
            changes[key] = 100.0 if new > 0 else 0

    return Response({
        'period': period,
        'current': {**current, 'label': label_current, 'is_partial': True},
        'previous': {**previous, 'label': label_previous},
        'changes': changes,
    })


# ── Phase 3: Calendar ────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def calendar_data(request):
    """داده تقویم: سفارشات و وظایف بر اساس ماه"""
    try:
        year = int(request.query_params.get('year', timezone.now().year))
        month = int(request.query_params.get('month', timezone.now().month))
        if not (1 <= month <= 12):
            raise ValueError()
    except (ValueError, TypeError):
        return Response({'error': 'ماه یا سال نامعتبر است.'}, status=400)

    start = timezone.make_aware(datetime(year, month, 1))
    if month == 12:
        end = timezone.make_aware(datetime(year + 1, 1, 1))
    else:
        end = timezone.make_aware(datetime(year, month + 1, 1))

    orders = Order.objects.filter(created_at__gte=start, created_at__lt=end)
    todos = TodoItem.objects.filter(
        Q(created_at__gte=start, created_at__lt=end) |
        Q(due_date__gte=start.date(), due_date__lt=end.date())
    )

    calendar = {}
    for order in orders:
        day = order.created_at.strftime('%Y-%m-%d')
        if day not in calendar:
            calendar[day] = {'orders': 0, 'revenue': 0, 'todos': []}
        calendar[day]['orders'] += 1
        if order.payment_status == 'paid':
            calendar[day]['revenue'] += float(order.total)

    for todo in todos:
        day_str = None
        if todo.due_date and start.date() <= todo.due_date < end.date():
            day_str = todo.due_date.strftime('%Y-%m-%d')
        elif start <= todo.created_at < end:
            day_str = todo.created_at.strftime('%Y-%m-%d')
        if day_str:
            if day_str not in calendar:
                calendar[day_str] = {'orders': 0, 'revenue': 0, 'todos': []}
            calendar[day_str]['todos'].append({
                'id': todo.id,
                'title': todo.title,
                'priority': todo.priority,
                'is_done': todo.is_done,
            })

    summary = {
        'total_orders': orders.count(),
        'total_revenue': float(orders.filter(payment_status='paid').aggregate(t=Sum('total'))['t'] or 0),
        'total_todos': todos.count(),
        'pending_todos': todos.filter(is_done=False).count(),
    }

    return Response({'calendar': calendar, 'summary': summary})



