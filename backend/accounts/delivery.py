"""Provider-based delivery services for OTP messages."""
import logging
from importlib import import_module

from django.conf import settings

from accounts.models import DeliveryAttempt

logger = logging.getLogger('authentication')


class OTPDeliveryError(RuntimeError):
    pass


def _load_provider(path):
    if not path:
        raise OTPDeliveryError('SMS provider is not configured')
    module_name, class_name = path.rsplit('.', 1)
    return getattr(import_module(module_name), class_name)()


def deliver_phone_otp(recipient, code):
    provider_path = getattr(settings, 'SMS_OTP_PROVIDER', '')
    attempt = DeliveryAttempt.objects.create(
        channel='sms', purpose='phone_verification', recipient=recipient,
        provider=provider_path, status='sending', attempts=1,
    )
    try:
        provider = _load_provider(provider_path)
        provider.send_otp(recipient=recipient, code=code)
    except Exception as exc:
        attempt.status = 'failed'
        attempt.error = str(exc)[:2000]
        attempt.save(update_fields=['status', 'error', 'updated_at'])
        logger.exception('[otp_sms_failed] recipient=%s provider=%s', recipient, provider_path or 'missing')
        raise OTPDeliveryError('ارسال پیامک در حال حاضر امکان‌پذیر نیست.') from exc
    attempt.status = 'sent'
    attempt.save(update_fields=['status', 'updated_at'])
    logger.info('[otp_sms_sent] recipient=%s provider=%s', recipient, provider_path)
    return attempt


def queue_email(recipient, subject, body, purpose):
    from shop.tasks import queue_email as enqueue
    return enqueue(subject, body, '', recipient, purpose=purpose)
