"""
Orders background tasks using Django-Q.

Handles all order-related async operations:
- Order status notifications
- Payment confirmation emails
- Inventory management
"""
import logging
from django_q.tasks import async_task

logger = logging.getLogger('orders')


def send_order_confirmation_email(order_id):
    """
    Send order confirmation email after order creation.
    Called asynchronously after order is created.
    """
    from orders.models import Order
    from shop.email_service import send_order_confirmation

    logger.info('[task_started] task=send_order_confirmation_email order_id=%d', order_id)
    try:
        order = Order.objects.select_related('user').get(id=order_id)
        send_order_confirmation(order)
        logger.info(
            '[task_completed] task=send_order_confirmation_email order_id=%d order_number=%s',
            order_id, order.order_number,
        )
        return True
    except Order.DoesNotExist:
        logger.error(
            '[task_failed] task=send_order_confirmation_email order_id=%d reason=not_found',
            order_id,
        )
        return False
    except Exception as e:
        logger.exception(
            '[task_failed] task=send_order_confirmation_email order_id=%d error=%s',
            order_id, e,
        )
        raise


def send_payment_confirmation_email(order_id, payment_id):
    """
    Send payment confirmation email after successful verification.
    Called asynchronously after payment is verified.
    """
    from orders.models import Order
    from payments.models import Payment
    from shop.email_service import send_payment_confirmation

    logger.info(
        '[task_started] task=send_payment_confirmation_email order_id=%d payment_id=%d',
        order_id, payment_id,
    )
    try:
        order = Order.objects.select_related('user').get(id=order_id)
        payment = Payment.objects.get(id=payment_id)
        send_payment_confirmation(order, payment)
        logger.info(
            '[task_completed] task=send_payment_confirmation_email order_id=%d payment_id=%d',
            order_id, payment_id,
        )
        return True
    except (Order.DoesNotExist, Payment.DoesNotExist) as e:
        logger.error(
            '[task_failed] task=send_payment_confirmation_email order_id=%d payment_id=%d error=%s',
            order_id, payment_id, e,
        )
        return False
    except Exception as e:
        logger.exception(
            '[task_failed] task=send_payment_confirmation_email order_id=%d payment_id=%d error=%s',
            order_id, payment_id, e,
        )
        raise


def send_order_status_update_email(order_id, old_status):
    """
    Send order status update email.
    Called asynchronously when order status changes.

    old_status is the status the order had before the change and is
    required by shop.email_service.send_order_status_update.
    """
    from orders.models import Order
    from shop.email_service import send_order_status_update

    logger.info(
        '[task_started] task=send_order_status_update_email order_id=%d old_status=%s',
        order_id, old_status,
    )
    try:
        order = Order.objects.select_related('user').get(id=order_id)
        send_order_status_update(order, old_status)
        logger.info(
            '[task_completed] task=send_order_status_update_email order_id=%d status=%s',
            order_id, order.status,
        )
        return True
    except Order.DoesNotExist:
        logger.error(
            '[task_failed] task=send_order_status_update_email order_id=%d reason=not_found',
            order_id,
        )
        return False
    except Exception as e:
        logger.exception(
            '[task_failed] task=send_order_status_update_email order_id=%d error=%s',
            order_id, e,
        )
        raise


def send_invoice_email_task(order_id):
    """
    Send invoice PDF email.
    Called asynchronously after successful payment.
    """
    from orders.models import Order
    from shop.email_service import send_invoice_email

    logger.info('[task_started] task=send_invoice_email_task order_id=%d', order_id)
    try:
        order = Order.objects.select_related('user').get(id=order_id)
        send_invoice_email(order)
        logger.info(
            '[task_completed] task=send_invoice_email_task order_id=%d order_number=%s',
            order_id, order.order_number,
        )
        return True
    except Order.DoesNotExist:
        logger.error(
            '[task_failed] task=send_invoice_email_task order_id=%d reason=not_found',
            order_id,
        )
        return False
    except Exception as e:
        logger.exception(
            '[task_failed] task=send_invoice_email_task order_id=%d error=%s',
            order_id, e,
        )
        raise


def expire_pending_orders():
    """
    Background task to expire unpaid orders.
    Scheduled via Django-Q scheduler (every 5 minutes).
    """
    from orders.services import expire_orders

    logger.info('[task_started] task=expire_pending_orders')
    try:
        cancelled, failed = expire_orders()
        logger.info(
            '[task_completed] task=expire_pending_orders cancelled=%d failed=%d',
            cancelled, failed,
        )
        return {'cancelled': cancelled, 'failed': failed}
    except Exception as e:
        logger.exception('[task_failed] task=expire_pending_orders error=%s', e)
        raise
