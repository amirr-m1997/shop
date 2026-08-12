"""
Shop-wide background tasks using Django-Q.

Email tasks are defined here to centralize all async email sending.
All tasks are safe to retry and include proper error handling.
"""
import logging
from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from django_q.tasks import async_task, schedule

logger = logging.getLogger('shop')


def send_email_task(subject, text_body, html_body, to_email, attachments=None, delivery_id=None):
    """
    Send an email via Django-Q background task.

    This replaces the threading-based approach with proper task queuing.
    """
    from django.core.mail import EmailMultiAlternatives
    from django.conf import settings

    from accounts.models import DeliveryAttempt

    delivery = DeliveryAttempt.objects.filter(pk=delivery_id).first()
    if delivery:
        delivery.status = 'sending'
        delivery.attempts += 1
        delivery.save(update_fields=['status', 'attempts', 'updated_at'])
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
        sent = msg.send(fail_silently=False)
        if sent != 1:
            raise RuntimeError('Email backend reported zero messages sent')
        if delivery:
            delivery.status = 'sent'
            delivery.error = ''
            delivery.save(update_fields=['status', 'error', 'updated_at'])
        logger.info('[email_task_completed] to=%s subject=%s', to_email, subject)
        return True
    except Exception as e:
        if delivery:
            delivery.status = 'failed'
            delivery.error = str(e)[:2000]
            delivery.save(update_fields=['status', 'error', 'updated_at'])
        logger.exception('[email_task_failed] to=%s subject=%s error=%s', to_email, subject, e)
        attempts = delivery.attempts if delivery else 1
        if delivery and attempts < settings.EMAIL_MAX_ATTEMPTS:
            delay = min(
                settings.EMAIL_RETRY_BASE_SECONDS * (2 ** (attempts - 1)),
                settings.EMAIL_RETRY_MAX_SECONDS,
            )
            try:
                schedule(
                    'shop.tasks.send_email_task', subject, text_body, html_body,
                    to_email, attachments, delivery.id,
                    schedule_type='O', next_run=timezone.now() + timedelta(seconds=delay),
                    repeats=1,
                )
                delivery.status = 'queued'
                delivery.save(update_fields=['status', 'updated_at'])
                logger.warning(
                    '[email_retry_scheduled] delivery_id=%s attempt=%s delay=%ss',
                    delivery.id, attempts + 1, delay,
                )
                return False
            except Exception:
                logger.exception('[email_retry_queue_failed] delivery_id=%s', delivery.id)
        # A queue failure or exhausted attempts must remain visible to Django-Q.
        raise


def queue_email(subject, text_body, html_body, to_email, attachments=None, priority=1,
                purpose='transactional'):
    """
    Queue an email to be sent in the background.

    Priority: 1=high, 2=medium, 3=low (default=2)
    """
    from accounts.models import DeliveryAttempt

    delivery = DeliveryAttempt.objects.create(
        channel='email', purpose=purpose, recipient=to_email,
        status='queued', provider=settings.EMAIL_BACKEND,
    )
    try:
        task_id = async_task(
            'shop.tasks.send_email_task', subject, text_body, html_body,
            to_email, attachments, delivery.id, priority=priority,
        )
    except Exception as exc:
        delivery.status = 'failed'
        delivery.error = str(exc)[:2000]
        delivery.save(update_fields=['status', 'error', 'updated_at'])
        logger.exception('[email_queue_failed] to=%s subject=%s', to_email, subject)
        raise
    return task_id


def expire_pending_orders():
    """
    Background task to expire unpaid orders and restore inventory.
    Scheduled to run every 5 minutes via Django-Q scheduler.
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


def cleanup_expired_otps():
    """
    Background task to cleanup expired OTP codes and reset tokens.
    Scheduled to run every hour via Django-Q scheduler.

    Verification codes and password-reset tokens live on UserProfile;
    this task clears any that outlived their TTL so stale secrets never
    linger in the database.
    """
    from django.utils import timezone
    from datetime import timedelta
    from accounts.models import UserProfile
    from accounts.security import OTP_CODE_TTL_SECONDS, RESET_TOKEN_TTL_SECONDS

    logger.info('[task_started] task=cleanup_expired_otps')
    try:
        now = timezone.now()

        code_cutoff = now - timedelta(seconds=OTP_CODE_TTL_SECONDS)
        cleared_codes = UserProfile.objects.exclude(verification_code='').filter(
            code_generated_at__lt=code_cutoff
        ).update(verification_code='', verification_type='', code_generated_at=None)

        token_cutoff = now - timedelta(seconds=RESET_TOKEN_TTL_SECONDS)
        cleared_tokens = UserProfile.objects.exclude(reset_token='').filter(
            reset_token_created_at__lt=token_cutoff
        ).update(reset_token='', reset_token_created_at=None)

        logger.info(
            '[task_completed] task=cleanup_expired_otps cleared_codes=%d cleared_tokens=%d',
            cleared_codes, cleared_tokens,
        )
        return {'cleared_codes': cleared_codes, 'cleared_tokens': cleared_tokens}
    except Exception as e:
        logger.exception('[task_failed] task=cleanup_expired_otps error=%s', e)
        raise


def cleanup_old_sessions():
    """
    Background task to cleanup expired sessions.
    Scheduled to run daily via Django-Q scheduler.
    """
    from django.contrib.sessions.models import Session
    from django.utils import timezone

    logger.info('[task_started] task=cleanup_old_sessions')
    try:
        deleted, _ = Session.objects.filter(
            expire_date__lt=timezone.now()
        ).delete()
        logger.info('[task_completed] task=cleanup_old_sessions deleted=%d', deleted)
        return {'deleted': deleted}
    except Exception as e:
        logger.exception('[task_failed] task=cleanup_old_sessions error=%s', e)
        raise


def setup_scheduled_tasks():
    """
    Setup all scheduled tasks for Django-Q scheduler.
    Called from Django's ready() signal or management command.
    """
    # Expire unpaid orders - every 5 minutes
    schedule(
        'shop.tasks.expire_pending_orders',
        schedule_type='M',  # M=Minutely, H=Hourly, D=Daily, W=Weekly
        minutes=5,
        repeats=-1,  # Run forever
        cluster='shop',
    )

    # Cleanup expired OTPs - every hour
    schedule(
        'shop.tasks.cleanup_expired_otps',
        schedule_type='H',
        repeats=-1,
        cluster='shop',
    )

    # Cleanup old sessions - daily at midnight
    schedule(
        'shop.tasks.cleanup_old_sessions',
        schedule_type='D',
        repeats=-1,
        cluster='shop',
    )

    logger.info('[scheduled_tasks] All scheduled tasks configured')
