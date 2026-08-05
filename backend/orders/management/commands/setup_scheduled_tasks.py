"""
Management command to setup Django-Q scheduled tasks.

Usage:
    python manage.py setup_scheduled_tasks

This command is idempotent - safe to run multiple times.
"""
import logging
from django.core.management.base import BaseCommand
from django_q.models import Schedule

logger = logging.getLogger('shop')


class Command(BaseCommand):
    help = 'Setup Django-Q scheduled tasks for background processing'

    def handle(self, *args, **options):
        self.stdout.write('Setting up Django-Q scheduled tasks...')

        # Expire unpaid orders - every 5 minutes
        schedule, created = Schedule.objects.get_or_create(
            func='orders.tasks.expire_pending_orders',
            defaults={
                'schedule_type': 'M',  # M=Minutely
                'minutes': 5,
                'repeats': -1,  # Run forever
                'cluster': 'shop',
                'name': 'expire_pending_orders',
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Created: expire_pending_orders (every 5 minutes)'))
        else:
            self.stdout.write(self.style.WARNING('Already exists: expire_pending_orders'))

        # Cleanup expired OTPs - every hour
        schedule, created = Schedule.objects.get_or_create(
            func='shop.tasks.cleanup_expired_otps',
            defaults={
                'schedule_type': 'H',  # H=Hourly
                'repeats': -1,
                'cluster': 'shop',
                'name': 'cleanup_expired_otps',
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Created: cleanup_expired_otps (every hour)'))
        else:
            self.stdout.write(self.style.WARNING('Already exists: cleanup_expired_otps'))

        # Cleanup old sessions - daily at midnight
        schedule, created = Schedule.objects.get_or_create(
            func='shop.tasks.cleanup_old_sessions',
            defaults={
                'schedule_type': 'D',  # D=Daily
                'repeats': -1,
                'cluster': 'shop',
                'name': 'cleanup_old_sessions',
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Created: cleanup_old_sessions (daily)'))
        else:
            self.stdout.write(self.style.WARNING('Already exists: cleanup_old_sessions'))

        self.stdout.write(self.style.SUCCESS('All scheduled tasks configured successfully!'))
