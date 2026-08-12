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


def release_coupon_hold(order):
    """
    Release the coupon consumed by an order that never got paid.

    A coupon is "held" when the order is created: authenticated users get a
    CouponUsage row, guests only bump used_count. This reverses exactly one
    hold and is idempotent — after release order.coupon is cleared so a
    second call does nothing.
    """
    from django.db.models import F
    from .models import Coupon, CouponUsage

    if not order.coupon_id:
        return False

    coupon_id = order.coupon_id
    usage_deleted, _ = CouponUsage.objects.filter(order=order).delete()

    # Authenticated orders hold via their CouponUsage row; guest orders
    # only bumped used_count at creation.
    if usage_deleted or order.user_id is None:
        Coupon.objects.filter(id=coupon_id, used_count__gt=0).update(
            used_count=F('used_count') - 1
        )

    order.coupon = None
    order.save(update_fields=['coupon', 'updated_at'])

    logger.info(
        '[coupon_hold_released] order_id=%d coupon_id=%d',
        order.id, coupon_id,
    )
    return True


def reserve_inventory(order):
    """
    Decrease stock for all items in an order.

    Called once when the order is created (status = pending_payment).
    Each item is decremented atomically using F() expressions.

    Returns: True on success, raises on failure.
    """
    from products.models import Product, ProductVariant

    with transaction.atomic():
        locked_order = order.__class__.objects.select_for_update().get(pk=order.pk)
        # A verified late payment may revive an expired order whose stock was
        # already released.  In that case reserve it again.  An active
        # reservation, however, must never be decremented twice.
        if locked_order.inventory_reserved_at and not locked_order.inventory_released_at:
            return False
        for item in locked_order.items.select_related('product', 'variant').all():
            if item.product:
                updated = Product.objects.filter(
                    id=item.product.id, stock__gte=item.quantity,
                ).update(stock=F('stock') - item.quantity)
                if updated != 1:
                    raise ValueError(f'Insufficient product stock: {item.product_id}')
            if item.variant:
                # Only variants that track their own stock (stock IS NOT
                # NULL) are decremented; inheriting variants rely on the
                # product-level stock decremented above.
                updated = ProductVariant.objects.filter(
                    id=item.variant.id,
                    stock__isnull=False,
                    stock__gte=item.quantity,
                ).update(stock=F('stock') - item.quantity)
                if item.variant.stock is not None and updated != 1:
                    raise ValueError(f'Insufficient variant stock: {item.variant_id}')
        locked_order.inventory_reserved_at = timezone.now()
        locked_order.inventory_released_at = None
        locked_order.save(update_fields=['inventory_reserved_at', 'inventory_released_at', 'updated_at'])
        order.inventory_reserved_at = locked_order.inventory_reserved_at
        order.inventory_released_at = None
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
        locked_order = order.__class__.objects.select_for_update().get(pk=order.pk)
        if not locked_order.inventory_reserved_at or locked_order.inventory_released_at:
            return False
        for item in locked_order.items.select_related('product', 'variant').all():
            if item.product:
                Product.objects.filter(
                    id=item.product.id
                ).update(stock=F('stock') + item.quantity)
            if item.variant:
                ProductVariant.objects.filter(
                    id=item.variant.id,
                    stock__isnull=False,
                ).update(stock=F('stock') + item.quantity)
        locked_order.inventory_released_at = timezone.now()
        locked_order.save(update_fields=['inventory_released_at', 'updated_at'])
        order.inventory_released_at = locked_order.inventory_released_at
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

    for candidate in expired_orders:
        customer = candidate.user.username if candidate.user_id else (candidate.guest_email or 'مهمان')
        try:
            with transaction.atomic():
                # Re-check eligibility after locking. A successful payment
                # callback may have completed since the outer query ran.
                order = Order.objects.select_for_update().get(pk=candidate.pk)
                if not (
                    order.status == 'pending_payment'
                    and order.payment_status == 'unpaid'
                    and order.expires_at
                    and order.expires_at < timezone.now()
                ):
                    continue
                release_inventory(order)
                release_coupon_hold(order)
                order.status = 'expired'
                order.save(update_fields=['status', 'updated_at'])

            cancelled_count += 1
            log_order_expired(order.id, order.order_number, order.user_id)
            log_inventory_released(order.id, order.items.count(), reason='order_expired')
            logger.info(
                '[order_expired] order_id=%d order_number=%s user=%s',
                order.id, order.order_number, customer,
            )

        except Exception as e:
            failed_count += 1
            log_exception('orders', e, context={
                'order_id': order.id,
                'order_number': order.order_number,
                'user': customer,
            })
            logger.exception(
                '[order_expire_failed] order_id=%d order_number=%s user=%s',
                order.id, order.order_number, customer,
            )

    return cancelled_count, failed_count
