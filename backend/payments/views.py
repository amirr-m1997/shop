import re
import requests
from decimal import Decimal
from django.conf import settings
from django.http import HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Payment
from .serializers import PaymentSerializer, InitiatePaymentSerializer
from orders.models import Order


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

# UUID v4 pattern (hex digits only — xxxxxxxx placeholder is NOT valid)
UUID_RE = re.compile(
    r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
)

# Zarinpal v4 error codes
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
    """Extract code/message from Zarinpal v4 response (data or errors)."""
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


def _build_metadata(user, order):
    metadata = {'order_id': str(order.order_number)}
    if user.email:
        metadata['email'] = user.email
    mobile = ''
    try:
        profile = user.profile
        if profile and profile.phone:
            mobile = str(profile.phone).strip()
    except Exception:
        pass
    if mobile:
        metadata['mobile'] = mobile
    return metadata


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def initiate_payment(request):
    serializer = InitiatePaymentSerializer(
        data=request.data, context={'request': request}
    )
    serializer.is_valid(raise_exception=True)

    if not ZARINPAL_MERCHANT_ID or not UUID_RE.match(ZARINPAL_MERCHANT_ID.strip()):
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

    order = Order.objects.get(
        id=serializer.validated_data['order_id'],
        user=request.user,
    )

    existing = Payment.objects.filter(order=order).first()
    if existing:
        if existing.status == 'success':
            return Response(
                {'error': 'این سفارش قبلاً پرداخت شده است.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if existing.status == 'processing' and existing.authority:
            # Reuse in-progress payment and send user back to gateway
            gateway_url = f'{ZARINPAL_GATEWAY_URL}{existing.authority}'
            return Response({
                'gateway_url': gateway_url,
                'authority': existing.authority,
                'payment_id': existing.id,
            })
        # failed / pending without authority → reuse row for a new request
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
            user=request.user,
            amount=order.total,
            status='pending',
        )

    # Amounts are stored in Tomans; Zarinpal accepts IRT (Toman) currency
    amount = int(order.total)
    if amount < 1000:
        payment.status = 'failed'
        payment.error_message = 'مبلغ سفارش کمتر از حداقل مجاز درگاه است.'
        payment.save(update_fields=['status', 'error_message', 'updated_at'])
        return Response(
            {'error': payment.error_message},
            status=status.HTTP_400_BAD_REQUEST,
        )

    payload = {
        'merchant_id': ZARINPAL_MERCHANT_ID.strip(),
        'amount': amount,
        'currency': 'IRT',
        'callback_url': f'{ZARINPAL_CALLBACK_URL}?payment_id={payment.id}',
        'description': f'پرداخت سفارش {order.order_number}',
        'metadata': _build_metadata(request.user, order),
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
        return Response({'error': msg, 'code': code}, status=status.HTTP_400_BAD_REQUEST)

    except requests.exceptions.RequestException:
        payment.status = 'failed'
        payment.error_message = 'خطا در اتصال به درگاه پرداخت.'
        payment.save(update_fields=['status', 'error_message', 'updated_at'])
        return Response(
            {'error': payment.error_message},
            status=status.HTTP_502_BAD_GATEWAY,
        )


@csrf_exempt
@require_GET
def payment_verify_callback(request):
    payment_id = request.GET.get('payment_id')
    authority = request.GET.get('Authority')
    status_param = request.GET.get('Status')

    try:
        payment = Payment.objects.select_related('order').get(id=payment_id)
    except (Payment.DoesNotExist, ValueError, TypeError):
        return HttpResponseRedirect(f'{FRONTEND_URL}/order-failed?error=payment_not_found')

    if status_param != 'OK':
        payment.status = 'failed'
        payment.error_message = 'پرداخت توسط کاربر لغو شد.'
        payment.save(update_fields=['status', 'error_message', 'updated_at'])
        return HttpResponseRedirect(
            f'{FRONTEND_URL}/order-failed?error=cancelled&order={payment.order.id}'
        )

    # Must match the amount/currency used at request time (IRT / Tomans)
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
                f'{FRONTEND_URL}/order-failed?error=network_error&order={payment.order.id}'
            )

        code, data, errors = _parse_zarinpal_response(result)

        if code in (100, 101):
            payment.status = 'success'
            payment.ref_id = str(data.get('ref_id', ''))
            payment.card_pan = data.get('card_pan', '') or ''
            fee_raw = data.get('fee', 0) or 0
            # fee from gateway is in same unit as request (IRT)
            payment.fee = Decimal(str(fee_raw))
            if authority:
                payment.authority = authority
            payment.save(update_fields=[
                'status', 'ref_id', 'card_pan', 'fee', 'authority', 'updated_at',
            ])

            order = payment.order
            order.payment_status = 'paid'
            order.tracking_number = str(data.get('ref_id', ''))
            order.save(update_fields=['payment_status', 'tracking_number', 'updated_at'])

            return HttpResponseRedirect(
                f'{FRONTEND_URL}/order-success'
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
        return HttpResponseRedirect(
            f'{FRONTEND_URL}/order-failed'
            f'?error=verify_failed&code={code}&order={payment.order.id}'
        )
    except requests.exceptions.RequestException as e:
        payment.status = 'failed'
        payment.error_message = str(e)
        payment.save(update_fields=['status', 'error_message', 'updated_at'])
        return HttpResponseRedirect(
            f'{FRONTEND_URL}/order-failed?error=network_error&order={payment.order.id}'
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def payment_status(request, payment_id):
    try:
        payment = Payment.objects.select_related('order').get(
            id=payment_id, user=request.user
        )
    except Payment.DoesNotExist:
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
