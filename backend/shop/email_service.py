"""
Email notification service for the e-commerce platform.

Provides non-blocking (threaded) email sending for:
- Order confirmation
- Payment confirmation
- Order status updates
- Invoice PDF attachment

All sends are fire-and-forget: failures are logged but never
raise exceptions that could break the checkout flow.

Celery-ready: each function is a standalone unit that can be
wrapped in a @shared_task with zero refactoring.
"""
import logging
import threading
from pathlib import Path

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.utils import timezone

import jdatetime

logger = logging.getLogger('email')


def _to_shamsi(dt, fmt='%Y/%m/%d — %H:%M'):
    """Convert a datetime to Solar Hijri (Shamsi) string."""
    if not dt:
        return '—'
    try:
        return jdatetime.datetime.fromgregorian(datetime=dt).strftime(fmt)
    except Exception:
        return str(dt)

# ── Status labels (Persian) ────────────────────────────────
STATUS_LABELS = {
    'pending_payment': 'در انتظار پرداخت',
    'pending': 'در انتظار بررسی',
    'processing': 'در حال پردازش',
    'shipped': 'ارسال شده',
    'delivered': 'تحویل داده شده',
    'cancelled': 'لغو شده',
    'expired': 'منقضی شده',
    'returned': 'مرجوع شده',
}

PAYMENT_STATUS_LABELS = {
    'unpaid': 'پرداخت نشده',
    'paid': 'پرداخت شده',
    'refunded': 'بازپرداخت شده',
}

PAYMENT_METHOD_LABELS = {
    'online': 'پرداخت آنلاین',
}


def _get_store_context():
    """Return common store context used in all email templates."""
    try:
        from pages.models import ContactInfo
        contact = ContactInfo.objects.first()
    except Exception:
        contact = None

    now = timezone.now()
    return {
        'store_name': getattr(contact, 'site_name', 'فروشگاه مد'),
        'store_phone': getattr(contact, 'phone1', ''),
        'store_email': getattr(contact, 'email1', ''),
        'store_address': getattr(contact, 'address', ''),
        'frontend_url': getattr(settings, 'FRONTEND_URL', 'http://localhost:5173'),
        'current_year': now.year,
        'current_year_shamsi': jdatetime.datetime.fromgregorian(datetime=now).year,
    }


def _send_async(subject, text_body, html_body, to_email, attachments=None):
    """
    Send an email in a background thread.

    attachments: list of (filename, content, mimetype) tuples.
    """
    def _send():
        try:
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_body,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
                to=[to_email],
            )
            if html_body:
                msg.attach_alternative(html_body, 'text/html')
            if attachments:
                for filename, content, mimetype in attachments:
                    msg.attach(filename, content, mimetype)
            msg.send(fail_silently=True)
            logger.info('[email_sent] to=%s subject=%s', to_email, subject)
        except Exception as e:
            logger.error('[email_failed] to=%s subject=%s error=%s', to_email, subject, e)

    thread = threading.Thread(target=_send, daemon=True)
    thread.start()


# ─── 1. Order Confirmation ─────────────────────────────────

def send_order_confirmation(order):
    """
    Send order confirmation email immediately after order creation.
    Non-blocking: runs in a background thread.
    """
    if not order.user.email:
        logger.warning(
            '[email_skipped] order=%s reason=no_email user=%s',
            order.order_number, order.user.username,
        )
        return

    ctx = _get_store_context()
    ctx.update({
        'order': order,
        'user': order.user,
        'items': order.items.select_related('product', 'variant').all(),
        'shipping': order.shipping_address,
        'status_label': STATUS_LABELS.get(order.status, order.status),
        'payment_method_label': PAYMENT_METHOD_LABELS.get(order.payment_method, order.payment_method),
        'order_date': _to_shamsi(order.created_at),
    })

    try:
        html_body = render_to_string('emails/order_confirmation.html', ctx)
        text_body = render_to_string('emails/order_confirmation.txt', ctx)
    except Exception as e:
        logger.error('[email_template_error] template=order_confirmation error=%s', e)
        return

    subject = f'تأیید سفارش {order.order_number} — {ctx["store_name"]}'
    _send_async(subject, text_body, html_body, order.user.email)


# ─── 2. Payment Confirmation ───────────────────────────────

def send_payment_confirmation(order, payment):
    """
    Send payment confirmation email after successful payment verification.
    Non-blocking: runs in a background thread.
    """
    if not order.user.email:
        logger.warning(
            '[email_skipped] order=%s reason=no_email user=%s',
            order.order_number, order.user.username,
        )
        return

    ctx = _get_store_context()
    ctx.update({
        'order': order,
        'payment': payment,
        'user': order.user,
        'payment_status_label': PAYMENT_STATUS_LABELS.get(payment.status, payment.status),
        'payment_date': _to_shamsi(payment.updated_at),
        'ref_id': payment.ref_id or '—',
    })

    try:
        html_body = render_to_string('emails/payment_confirmation.html', ctx)
        text_body = render_to_string('emails/payment_confirmation.txt', ctx)
    except Exception as e:
        logger.error('[email_template_error] template=payment_confirmation error=%s', e)
        return

    subject = f'تأیید پرداخت سفارش {order.order_number} — {ctx["store_name"]}'
    _send_async(subject, text_body, html_body, order.user.email)


# ─── 3. Order Status Update ────────────────────────────────

def send_order_status_update(order, old_status):
    """
    Send order status update email.
    Non-blocking: runs in a background thread.
    """
    if not order.user.email:
        logger.warning(
            '[email_skipped] order=%s reason=no_email user=%s',
            order.order_number, order.user.username,
        )
        return

    ctx = _get_store_context()
    ctx.update({
        'order': order,
        'user': order.user,
        'old_status_label': STATUS_LABELS.get(old_status, old_status),
        'new_status_label': STATUS_LABELS.get(order.status, order.status),
        'order_date': _to_shamsi(order.created_at),
        'update_date': _to_shamsi(timezone.now()),
    })

    try:
        html_body = render_to_string('emails/order_status_update.html', ctx)
        text_body = render_to_string('emails/order_status_update.txt', ctx)
    except Exception as e:
        logger.error('[email_template_error] template=order_status_update error=%s', e)
        return

    subject = f'به‌روزرسانی سفارش {order.order_number} — {ctx["store_name"]}'
    _send_async(subject, text_body, html_body, order.user.email)


# ─── 4. Invoice Email with PDF ─────────────────────────────

def send_invoice_email(order):
    """
    Generate a PDF invoice and send it as an email attachment.
    Non-blocking: runs in a background thread.
    """
    if not order.user.email:
        logger.warning(
            '[email_skipped] order=%s reason=no_email user=%s',
            order.order_number, order.user.username,
        )
        return

    # Generate PDF
    try:
        from shop.invoice import generate_invoice_pdf
        pdf_content = generate_invoice_pdf(order)
        pdf_filename = f'invoice_{order.order_number}.pdf'
    except Exception as e:
        logger.error('[invoice_pdf_error] order=%s error=%s', order.order_number, e)
        pdf_content = None

    ctx = _get_store_context()
    ctx.update({
        'order': order,
        'user': order.user,
        'items': order.items.select_related('product', 'variant').all(),
        'shipping': order.shipping_address,
        'status_label': STATUS_LABELS.get(order.status, order.status),
        'payment_method_label': PAYMENT_METHOD_LABELS.get(order.payment_method, order.payment_method),
        'order_date': _to_shamsi(order.created_at),
        'has_pdf': pdf_content is not None,
    })

    try:
        html_body = render_to_string('emails/invoice.html', ctx)
        text_body = render_to_string('emails/invoice.txt', ctx)
    except Exception as e:
        logger.error('[email_template_error] template=invoice error=%s', e)
        return

    attachments = []
    if pdf_content:
        attachments.append((pdf_filename, pdf_content, 'application/pdf'))

    subject = f'فاکتور سفارش {order.order_number} — {ctx["store_name"]}'
    _send_async(subject, text_body, html_body, order.user.email, attachments=attachments)
