"""Mark stale support-agent presence records as offline.

Run periodically (e.g., every 5 minutes) via cron or Django-Q.
Agents who haven't sent a heartbeat in the configured threshold
are marked offline.
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from support.models import SupportAgentPresence


class Command(BaseCommand):
    help = 'Mark stale support-agent presence records as offline.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--threshold-seconds',
            type=int,
            default=120,
            help='Seconds since last heartbeat before marking offline (default: 120)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Only show counts, do not modify',
        )

    def handle(self, *args, **options):
        threshold = timezone.now() - timedelta(seconds=options['threshold_seconds'])
        stale = SupportAgentPresence.objects.filter(
            status__in=['online', 'away'],
            heartbeat_at__lt=threshold,
        )
        count = stale.count()
        if options['dry_run']:
            self.stdout.write(f'Stale presence records to mark offline: {count}')
            return
        stale.update(status='offline')
        self.stdout.write(self.style.SUCCESS(
            f'Marked {count} stale agent(s) as offline.'
        ))
