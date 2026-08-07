import re
import logging
import requests
from decimal import Decimal
from django.conf import settings
from django.http import HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from .models import Payment
from .serializers import PaymentSerializer, InitiatePaymentSerializer
from orders.models import Order
from accounts.throttles import PaymentInitThrottle, PaymentVerifyThrottle, PaymentWebhookThrottle
from accounts.security import log_security_event
from shop.observability import (
    log_payment_initiation, log_payment_gateway_response,
    log_payment_verification, log_payment_failure,
    log_payment_timeout, log_duplicate_callback,
    log_external_service_failure, log_event,
)

logger = logging.getLogger('payment')


FRONTEND_URL = settings.FRONTEND_URL
ZARINPAL_MERCHANT_ID = getattr(settings, 'ZARINPAL_MERCHANT_ID', '') or ''
ZARINPAL_CALLBACK_URL = getattr(
    settings, 'ZARINPAL_CALLBACK_URL', 'http://localhost:8000/api/payments/verify/'
)
ZARINPAL_SANDBOX = getattr(settings, 'ZARINPAL_SANDBOX', True)

if ZARINPAL_SANDBOX:
    ZARINPAL_REQUEST_URL = 'https://sandbox.zarinpal.com/pg/v4/payment/request.json'
    ZARINPAL_VERIFY_URL = 'https://sandbox.zarinpal.com/pg/v4/payment/verify.json'
    ZARINPAL_GATEWAY_URL = 'https://sandbox.zarinpal.com/pg/StartPay/'
else:
    ZARINPAL_REQUEST_URL = 'https://payment.zarinpal.com/pg/v4/payment/request.json'
    ZARINPAL_VERIFY_URL = 'https://payment.zarinpal.com/pg/v4/payment/verify.json'
    ZARINPAL_GATEWAY_URL = 'https://www.zarinpal.com/pg/StartPay/'

UUID_RE = re.compile(
    r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
)


def _get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    return x_forwarded.split(',')[0].strip() if x_forwarded else request.META.get('REMOTE_ADDR', 'unknown')

ZARINPAL_ERRORS = {
    -9: 'خطای اعتبارسنجی — merchant_id، مبلغ، callback یا توضیحات نامعتبر است.',
    -10: 'مرچنت‌کد یا IP پذیرنده صحیح نیست.',
    -11: 'مرچنت‌کد فعال نیست.',
    -12: 'تعداد درخواست‌ها از حد مجاز گذشته است.',
    -14: 'آدرس callback با دامنه ثبت‌شده درگاه مطابقت ندارد.',
    -15: 'درگاه پرداخت تعلیق شده است.',
    -16: 'سطح تأیید پذیرنده کافی نیست.',
    -50: 'مبلغ پرداخت‌شده با مبلغ درخواستی مطابقت ندارد.',
    -51: 'پرداخت ناموفق بوده است.',
    -52: 'خطای غیرمنتظره از سمت درگاه.',
    -53: 'پرداخت متعلق به این مرچنت‌کد نیست.',
    -54: 'کد authority نامعتبر است.',
    -55: 'تراکنش یافت نشد.',
}


def _parse_zarinpal_response(result):
    data = result.get('data') or {}
    errors = result.get('errors') or {}

    if isinstance(data, list):
        data = data[0] if data else {}
    if isinstance(errors, list):
        errors = errors[0] if errors else {}

    if isinstance(data, dict) and data.get('code') is not None:
        return data.get('code'), data, errors

    if isinstance(errors, dict) and errors.get('code') is not None:
        return errors.get('code'), data if isinstance(data, dict) else {}, errors

    return -9, data if isinstance(data, dict) else {}, errors if isinstance(errors, dict) else {}


def _error_message(code, errors=None):
    msg = ZARINPAL_ERRORS.get(code)
    if not msg and isinstance(errors, dict):
        msg = errors.get('message')
    if not msg:
        msg = f'خطای درگاه پرداخت (کد {code})'
    if isinstance(errors, dict) and errors.get('validations'):
        details = errors['validations']
        if isinstance(details, list) and details:
            msg = f"{msg} — {details}"
        elif isinstance(details, dict) and details:
            msg = f"{msg} — {details}"
    return msg


def _build_metadata(order):
    metadata = {'order_id': str(order.order_number)}
    email = order.guest_email if not order.user_id else (order.user.email or '')
    if email:
        metadata['email'] = email
    mobile = ''
    if order.user_id:
        try:
            profile = order.user.profile
            if profile and profile.phone:
                mobile = str(profile.phone).strip()
        except Exception:
            pass
    if not mobile and order.guest_phone:
        mobile = str(order.guest_phone).strip()
    if mobile:
        metadata['mobile'] = mobile
    return metadata


def _get_order_for_payment(order_id, request):
    """Resolve an order for payment: authenticated users own it via user,
    guests own it via the X-Session-ID header."""
    if request.user.is_authenticated:
        return Order.objects.filter(id=order_id, user=request.user).first()
    session_id = request.META.get('HTTP_X_SESSION_ID', '') or ''
    if not session_id:
        return None
    return Order.objects.filter(id=order_id, guest_session_id=session_id).first()


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [PaymentInitThrottle]

    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user).select_related('order')


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PaymentInitThrottle])
def initiate_payment(request):

    serializer = InitiatePaymentSerializer(
        data=request.data, context={'request': request}
    )
    serializer.is_valid(raise_exception=True)

    if not ZARINPAL_MERCHANT_ID or not UUID_RE.match(ZARINPAL_MERCHANT_ID.strip()):
        logger.warning(
            '[payment_init_invalid_merchant] user=%s ip=%s',
            request.user.username if request.user.is_authenticated else 'guest',
            _get_client_ip(request),
        )
        return Response(
            {
                'error': (
                    'کد پذیرنده (merchant_id) معتبر نیست. '
                    'در حالت تست یک UUID واقعی در فایل .env قرار دهید '
                    '(مثلاً از uuidgenerator.net). '
                    'مقدار xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx معتبر نیست.'
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    order = _get_order_for_payment(serializer.validated_data['order_id'], request)
    if order is None:
        return Response(
            {'error': 'سفارش یافت نشد.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Race condition guard: only pending_payment orders can be paid
    if not order.can_pay:
        if order.status == 'expired':
            return Response(
                {'error': 'این سفارش منقضی شده است. لطفاً سفارش جدیدی ثبت کنید.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if order.status == 'cancelled':
            return Response(
                {'error': 'این سفارش لغو شده است.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if order.payment_status == 'paid':
            return Response(
                {'error': 'این سفارش قبلاً پرداخت شده است.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {'error': 'امکان پرداخت برای این سفارش وجود ندارد.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    existing = Payment.objects.filter(order=order).first()
    if existing:
        if existing.status == 'success':
            return Response(
                {'error': 'این سفارش قبلاً پرداخت شده است.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if existing.status == 'processing' and existing.authority:
            gateway_url = f'{ZARINPAL_GATEWAY_URL}{existing.authority}'
            return Response({
                'gateway_url': gateway_url,
                'authority': existing.authority,
                'payment_id': existing.id,
            })
        payment = existing
        payment.amount = order.total
        payment.status = 'pending'
        payment.authority = None
        payment.error_code = 0
        payment.error_message = ''
        payment.ref_id = None
        payment.save(update_fields=[
            'amount', 'status', 'authority', 'error_code',
            'error_message', 'ref_id', 'updated_at',
        ])
    else:
        payment = Payment.objects.create(
            order=order,
            user=request.user if request.user.is_authenticated else None,
            amount=order.total,
            status='pending',
        )

    amount = int(order.total)
    if amount < 1000:
        payment.status = 'failed'
        payment.error_message = 'مبلغ سفارش کمتر از حداقل مجاز درگاه است.'
        payment.save(update_fields=['status', 'error_message', 'updated_at'])
        log_payment_failure(payment.id, order.id, 0, payment.error_message)
        return Response(
            {'error': payment.error_message},
            status=status.HTTP_400_BAD_REQUEST,
        )

    customer = request.user.username if request.user.is_authenticated else 'guest'
    log_payment_initiation(payment.id, order.id, amount, customer, _get_client_ip(request))

    payload = {
        'merchant_id': ZARINPAL_MERCHANT_ID.strip(),
        'amount': amount,
        'currency': 'IRT',
        'callback_url': f'{ZARINPAL_CALLBACK_URL}?payment_id={payment.id}',
        'description': f'پرداخت سفارش {order.order_number}',
        'metadata': _build_metadata(order),
    }

    try:
        response = requests.post(
            ZARINPAL_REQUEST_URL,
            json=payload,
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            timeout=15,
        )
        try:
            result = response.json()
        except ValueError:
            payment.status = 'failed'
            payment.error_message = f'پاسخ نامعتبر از درگاه (HTTP {response.status_code})'
            payment.save(update_fields=['status', 'error_message', 'updated_at'])
            log_external_service_failure(
                'payment', 'zarinpal', 'initiate_payment',
                response_code=response.status_code,
                payment_id=payment.id, order_id=order.id,
            )
            return Response(
                {'error': payment.error_message},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        code, data, errors = _parse_zarinpal_response(result)

        if code == 100:
            authority = data.get('authority')
            if not authority:
                payment.status = 'failed'
                payment.error_message = 'درگاه authority برنگرداند.'
                payment.save(update_fields=['status', 'error_message', 'updated_at'])
                log_payment_gateway_response(payment.id, code, error='no_authority')
                return Response(
                    {'error': payment.error_message},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            payment.authority = authority
            payment.status = 'processing'
            payment.error_code = 0
            payment.error_message = ''
            payment.save(update_fields=[
                'authority', 'status', 'error_code', 'error_message', 'updated_at',
            ])

            log_payment_gateway_response(payment.id, code, authority=authority)

            return Response({
                'gateway_url': f'{ZARINPAL_GATEWAY_URL}{authority}',
                'authority': authority,
                'payment_id': payment.id,
            })

        msg = _error_message(code, errors)
        payment.status = 'failed'
        payment.error_code = code or 0
        payment.error_message = msg
        payment.save(update_fields=[
            'status', 'error_code', 'error_message', 'updated_at',
        ])
        log_payment_failure(payment.id, order.id, code, msg)
        return Response({'error': msg, 'code': code}, status=status.HTTP_400_BAD_REQUEST)

    except requests.exceptions.RequestException as e:
        payment.status = 'failed'
        payment.error_message = 'خطا در اتصال به درگاه پرداخت.'
        payment.save(update_fields=['status', 'error_message', 'updated_at'])
        log_payment_timeout(payment.id, order.id)
        log_external_service_failure(
            'payment', 'zarinpal', 'initiate_payment',
            error=e, payment_id=payment.id, order_id=order.id,
        )
        return Response(
            {'error': payment.error_message},
            status=status.HTTP_502_BAD_GATEWAY,
        )


@csrf_exempt
@require_GET
def payment_verify_callback(request):
    # Manual throttle check (non-DRF view)
    from django.core.cache import cache
    ident = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR', 'unknown')
    throttle_key = f'throttle_payment_verify_{ident}'
    count = cache.get(throttle_key, 0)
    if count >= 5:
        log_security_event('payment_verify_throttled', request, f'ip={ident}')
        return HttpResponseRedirect(f'{FRONTEND_URL}/payment/callback?error=throttled')
    cache.set(throttle_key, count + 1, 60)

    payment_id = request.GET.get('payment_id')
    authority = request.GET.get('Authority')
    status_param = request.GET.get('Status')

    logger.info(
        '[payment_callback_received] payment_id=%s status=%s authority=%s',
        payment_id, status_param, authority[:20] if authority else None,
    )

    try:
        payment = Payment.objects.select_related('order').get(id=payment_id)
    except (Payment.DoesNotExist, ValueError, TypeError):
        logger.warning('[payment_callback_payment_not_found] payment_id=%s', payment_id)
        return HttpResponseRedirect(f'{FRONTEND_URL}/payment/callback?error=payment_not_found')

    order = payment.order

    # ── Race condition guard ──
    # If the order expired or was cancelled while the user was at the bank,
    # do NOT accept the payment. Refund via gateway if needed.
    if order.status in ('expired', 'cancelled'):
        payment.status = 'failed'
        payment.error_message = 'سفارش منقضی یا لغو شده بود هنگام بازگشت از درگاه.'
        payment.save(update_fields=['status', 'error_message', 'updated_at'])
        log_payment_failure(payment.id, order.id, -1, payment.error_message)
        return HttpResponseRedirect(
            f'{FRONTEND_URL}/payment/callback?error=order_expired&order={order.id}'
        )

    if status_param != 'OK':
        payment.status = 'failed'
        payment.error_message = 'پرداخت توسط کاربر لغو شد.'
        payment.save(update_fields=['status', 'error_message', 'updated_at'])
        log_payment_failure(payment.id, order.id, -1, 'User cancelled payment')
        return HttpResponseRedirect(
            f'{FRONTEND_URL}/payment/callback?error=cancelled&order={order.id}'
        )

    amount = int(payment.amount)
    payload = {
        'merchant_id': ZARINPAL_MERCHANT_ID.strip(),
        'amount': amount,
        'currency': 'IRT',
        'authority': authority,
    }

    try:
        response = requests.post(
            ZARINPAL_VERIFY_URL,
            json=payload,
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            timeout=15,
        )
        try:
            result = response.json()
        except ValueError:
            payment.status = 'failed'
            payment.error_message = 'پاسخ نامعتبر از درگاه هنگام تأیید پرداخت.'
            payment.save(update_fields=['status', 'error_message', 'updated_at'])
            return HttpResponseRedirect(
                f'{FRONTEND_URL}/payment/callback?error=network_error&order={order.id}'
            )

        code, data, errors = _parse_zarinpal_response(result)

        if code in (100, 101):
            # ── Double-check order status inside atomic block ──
            from django.db import transaction as db_transaction

            with db_transaction.atomic():
                fresh_order = Order.objects.select_for_update().get(id=order.id)

                if fresh_order.status not in ('pending_payment',):
                    payment.status = 'failed'
                    payment.error_message = 'وضعیت سفارش تغییر کرده بود.'
                    payment.save(update_fields=['status', 'error_message', 'updated_at'])
                    log_payment_verification(payment.id, order.id, 'race_condition_lost')
                    return HttpResponseRedirect(
                        f'{FRONTEND_URL}/payment/callback?error=order_changed&order={order.id}'
                    )

                payment.status = 'success'
                payment.ref_id = str(data.get('ref_id', ''))
                payment.card_pan = data.get('card_pan', '') or ''
                fee_raw = data.get('fee', 0) or 0
                payment.fee = Decimal(str(fee_raw))
                if authority:
                    payment.authority = authority
                payment.save(update_fields=[
                    'status', 'ref_id', 'card_pan', 'fee', 'authority', 'updated_at',
                ])

                fresh_order.payment_status = 'paid'
                fresh_order.status = 'pending'
                fresh_order.tracking_number = str(data.get('ref_id', ''))
                fresh_order.expires_at = None
                fresh_order.save(update_fields=[
                    'payment_status', 'status', 'tracking_number', 'expires_at', 'updated_at',
                ])

            log_payment_verification(payment.id, order.id, 'success', ref_id=payment.ref_id)

            # Queue background tasks for email notifications
            try:
                from django_q.tasks import async_task
                # Queue payment confirmation email (high priority)
                async_task(
                    'payments.tasks.send_payment_confirmation_email',
                    order.id,
                    payment.id,
                    priority=1,
                )
                # Queue invoice email (medium priority)
                async_task(
                    'payments.tasks.send_invoice_email_task',
                    order.id,
                    priority=2,
                )
                logger.info(
                    '[email_tasks_queued] order=%s payment_id=%d',
                    order.order_number, payment.id,
                )
            except Exception as e:
                # Fallback to direct email sending if task queue fails
                logger.error('[email_task_queue_error] order=%s error=%s, falling back to direct send',
                           order.order_number, e)
                try:
                    from shop.email_service import send_payment_confirmation, send_invoice_email
                    send_payment_confirmation(order, payment)
                    send_invoice_email(order)
                except Exception as e2:
                    logger.error('[email_send_error] order=%s error=%s', order.order_number, e2)

            return HttpResponseRedirect(
                f'{FRONTEND_URL}/payment/callback'
                f'?ref_id={data.get("ref_id", "")}'
                f'&order_number={order.order_number}'
            )

        msg = _error_message(code, errors)
        payment.status = 'failed'
        payment.error_code = code or 0
        payment.error_message = msg
        payment.save(update_fields=[
            'status', 'error_code', 'error_message', 'updated_at',
        ])
        log_payment_failure(payment.id, order.id, code, msg)
        return HttpResponseRedirect(
            f'{FRONTEND_URL}/payment/callback'
            f'?error=verify_failed&code={code}&order={order.id}'
        )
    except requests.exceptions.RequestException as e:
        payment.status = 'failed'
        payment.error_message = str(e)
        payment.save(update_fields=['status', 'error_message', 'updated_at'])
        log_external_service_failure(
            'payment', 'zarinpal', 'verify_payment',
            error=e, payment_id=payment.id, order_id=order.id,
        )
        return HttpResponseRedirect(
            f'{FRONTEND_URL}/payment/callback?error=network_error&order={order.id}'
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def payment_status(request, payment_id):
    try:
        payment = Payment.objects.select_related('order').get(id=payment_id)
    except Payment.DoesNotExist:
        return Response(
            {'error': 'پرداخت یافت نشد.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    order = payment.order
    if request.user.is_authenticated:
        if order.user_id != request.user.id:
            return Response(
                {'error': 'پرداخت یافت نشد.'},
                status=status.HTTP_404_NOT_FOUND,
            )
    else:
        session_id = request.META.get('HTTP_X_SESSION_ID', '') or ''
        if not order.guest_session_id or order.guest_session_id != session_id:
            return Response(
                {'error': 'پرداخت یافت نشد.'},
                status=status.HTTP_404_NOT_FOUND,
            )

    return Response({
        'status': payment.status,
        'ref_id': payment.ref_id,
        'amount': float(payment.amount),
        'order_number': payment.order.order_number,
    })
