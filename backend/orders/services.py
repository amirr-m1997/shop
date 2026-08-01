"""
Order inventory and expiration service.

Centralized business logic for:
- Reserving inventory when an order is created
- Releasing inventory when an order is cancelled or expires
- Expiring unpaid orders via background job

All functions are request-agnostic and safe to call from
management commands, cron jobs, or anywhere.
"""
import logging
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from shop.observability import (
    log_inventory_reserved, log_inventory_released,
    log_order_expired, log_exception,
)

logger = logging.getLogger('orders')
inventory_logger = logging.getLogger('inventory')


def reserve_inventory(order):
    """
    Decrease stock for all items in an order.

    Called once when the order is created (status = pending_payment).
    Each item is decremented atomically using F() expressions.

    Returns: True on success, raises on failure.
    """
    from products.models import Product, ProductVariant

    with transaction.atomic():
        for item in order.items.select_related('product', 'variant').all():
            if item.product:
                Product.objects.filter(
                    id=item.product.id
                ).update(stock=F('stock') - item.quantity)
            if item.variant:
                ProductVariant.objects.filter(
                    id=item.variant.id
                ).update(stock=F('stock') - item.quantity)
    return True


def release_inventory(order):
    """
    Restore stock for all items in an order.

    Called when an order is cancelled, expired, or failed.
    Safe to call multiple times (idempotent via atomic F() increment).

    Returns: True on success, raises on failure.
    """
    from products.models import Product, ProductVariant

    with transaction.atomic():
        for item in order.items.select_related('product', 'variant').all():
            if item.product:
                Product.objects.filter(
                    id=item.product.id
                ).update(stock=F('stock') + item.quantity)
            if item.variant:
                ProductVariant.objects.filter(
                    id=item.variant.id
                ).update(stock=F('stock') + item.quantity)
    return True


def expire_orders():
    """
    Cancel all expired pending_payment orders and restore inventory.

    Safe to run multiple times (idempotent). Each order is processed
    in its own transaction so one failure doesn't block others.

    Returns:
        tuple: (cancelled_count, failed_count)
    """
    from .models import Order

    expired_orders = Order.objects.filter(
        expires_at__lt=timezone.now(),
        status='pending_payment',
        payment_status='unpaid',
    ).select_related('user').prefetch_related('items__product', 'items__variant')

    cancelled_count = 0
    failed_count = 0

    for order in expired_orders:
        try:
            with transaction.atomic():
                release_inventory(order)
                order.status = 'expired'
                order.save(update_fields=['status', 'updated_at'])

            cancelled_count += 1
            log_order_expired(order.id, order.order_number, order.user_id)
            log_inventory_released(order.id, order.items.count(), reason='order_expired')
            logger.info(
                '[order_expired] order_id=%d order_number=%s user=%s',
                order.id, order.order_number, order.user.username,
            )

        except Exception as e:
            failed_count += 1
            log_exception('orders', e, context={
                'order_id': order.id,
                'order_number': order.order_number,
                'user': order.user.username,
            })
            logger.exception(
                '[order_expire_failed] order_id=%d order_number=%s user=%s',
                order.id, order.order_number, order.user.username,
            )

    return cancelled_count, failed_count
