"""
Delete old chat notifications so the table doesn't grow unbounded.

- Read notifications older than NOTIFICATION_READ_RETENTION_DAYS are deleted.
- Notifications (read or unread) older than NOTIFICATION_MAX_RETENTION_DAYS
  are deleted regardless of read status.

Designed to be run periodically (cron / Django-Q schedule), e.g. daily.
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from django.conf import settings
from chat.models import Notification


class Command(BaseCommand):
    help = 'حذف اعلان‌های قدیمی چت برای جلوگیری از رشد بی‌رویه جدول.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--read-days',
            type=int,
            default=getattr(settings, 'NOTIFICATION_READ_RETENTION_DAYS', 14),
            help='تعداد روز نگهداری اعلان‌های خوانده‌شده',
        )
        parser.add_argument(
            '--max-days',
            type=int,
            default=getattr(settings, 'NOTIFICATION_MAX_RETENTION_DAYS', 90),
            help='حداکثر تعداد روز نگهداری هر اعلان (خوانده‌شده یا نشده)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='فقط تعداد موارد قابل حذف را نمایش می‌دهد',
        )

    def handle(self, *args, **options):
        now = timezone.now()
        read_cutoff = now - timedelta(days=options['read_days'])
        max_cutoff = now - timedelta(days=options['max_days'])

        read_qs = Notification.objects.filter(is_read=True, created_at__lt=read_cutoff)
        old_qs = Notification.objects.filter(created_at__lt=max_cutoff)

        if options['dry_run']:
            self.stdout.write(
                f'Read notifications older than {options["read_days"]} days: {read_qs.count()}\n'
                f'Notifications older than {options["max_days"]} days: {old_qs.count()}'
            )
            return

        deleted_read, _ = read_qs.delete()
        deleted_old, _ = Notification.objects.filter(
            created_at__lt=max_cutoff
        ).delete()
        total = deleted_read + deleted_old if isinstance(deleted_read, int) else (deleted_read or 0) + (deleted_old or 0)

        self.stdout.write(self.style.SUCCESS(
            f'پاک‌سازی اعلان‌ها انجام شد. ({total} رکورد حذف شد)'
        ))
