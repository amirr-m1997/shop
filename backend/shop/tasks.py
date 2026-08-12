"""
Shop-wide background tasks using Django-Q.

Email tasks are defined here to centralize all async email sending.
All tasks are safe to retry and include proper error handling.
"""
import logging
from django_q.tasks import async_task, schedule

logger = logging.getLogger('shop')


def send_email_task(subject, text_body, html_body, to_email, attachments=None):
    """
    Send an email via Django-Q background task.

    This replaces the threading-based approach with proper task queuing.
    """
    from django.core.mail import EmailMultiAlternatives
    from django.conf import settings

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
        logger.info('[email_task_completed] to=%s subject=%s', to_email, subject)
        return True
    except Exception as e:
        logger.error('[email_task_failed] to=%s subject=%s error=%s', to_email, subject, e)
        return False


def queue_email(subject, text_body, html_body, to_email, attachments=None, priority=1):
    """
    Queue an email to be sent in the background.

    Priority: 1=high, 2=medium, 3=low (default=2)
    """
    return async_task(
        'shop.tasks.send_email_task',
        subject,
        text_body,
        html_body,
        to_email,
        attachments,
        priority=priority,
    )


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
