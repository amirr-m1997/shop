"""
Payments background tasks using Django-Q.

Handles all payment-related async operations:
- Payment verification processing
- Payment confirmation emails
- Refund processing
"""
import logging
from django_q.tasks import async_task

logger = logging.getLogger('payments')


def process_payment_verification(payment_id):
    """
    Process payment verification asynchronously.
    Handles the actual verification with Zarinpal gateway.
    """
    from payments.models import Payment

    logger.info('[task_started] task=process_payment_verification payment_id=%d', payment_id)
    try:
        payment = Payment.objects.select_related('order__user').get(id=payment_id)
        # Payment verification is handled synchronously in the view
        # This task is for future async verification if needed
        logger.info(
            '[task_completed] task=process_payment_verification payment_id=%d status=%s',
            payment_id, payment.status,
        )
        return {'payment_id': payment_id, 'status': payment.status}
    except Payment.DoesNotExist:
        logger.error(
            '[task_failed] task=process_payment_verification payment_id=%d reason=not_found',
            payment_id,
        )
        return False
    except Exception as e:
        logger.exception(
            '[task_failed] task=process_payment_verification payment_id=%d error=%s',
            payment_id, e,
        )
        raise


def send_payment_confirmation_email(order_id, payment_id):
    """
    Send payment confirmation email after successful verification.
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


def send_invoice_email_task(order_id):
    """
    Send invoice PDF email after successful payment.
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


def queue_payment_notification(order_id, payment_id):
    """
    Queue all payment-related notifications as background tasks.
    Called after successful payment verification.
    """
    from django_q.tasks import async_task

    logger.info(
        '[task_started] task=queue_payment_notification order_id=%d payment_id=%d',
        order_id, payment_id,
    )

    # Queue payment confirmation email
    async_task(
        'payments.tasks.send_payment_confirmation_email',
        order_id,
        payment_id,
        priority=1,  # High priority for payment emails
    )

    # Queue invoice email
    async_task(
        'payments.tasks.send_invoice_email_task',
        order_id,
        priority=2,  # Medium priority for invoices
    )

    logger.info(
        '[task_completed] task=queue_payment_notification order_id=%d payment_id=%d',
        order_id, payment_id,
    )
    return True
