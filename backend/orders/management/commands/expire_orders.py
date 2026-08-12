"""
Management command to expire unpaid orders and restore inventory.

Usage:
    python manage.py expire_orders

Safe to run multiple times (idempotent). Designed for cron execution
every 5 minutes.
"""
import logging
from django.core.management.base import BaseCommand

from orders.services import expire_orders

logger = logging.getLogger('orders')


class Command(BaseCommand):
    help = 'Cancel expired pending_payment orders and restore reserved inventory.'

    def handle(self, *args, **options):
        cancelled, failed = expire_orders()

        if cancelled:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Expired {cancelled} order(s) and restored inventory.'
                )
            )
        if failed:
            self.stderr.write(
                self.style.ERROR(
                    f'Failed to expire {failed} order(s). Check logs for details.'
                )
            )
        if not cancelled and not failed:
            self.stdout.write('No expired orders found.')
