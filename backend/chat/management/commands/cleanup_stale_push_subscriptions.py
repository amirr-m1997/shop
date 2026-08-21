"""Remove permanently invalid push subscriptions.

Push providers return HTTP 404/410 for endpoints that no longer exist.
This command removes subscriptions that have been marked as stale during
push delivery attempts.

Run periodically (e.g., daily) via cron or Django-Q.
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from chat.models import PushSubscription


class Command(BaseCommand):
    help = 'Remove stale push subscriptions that are permanently invalid.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--max-age-days',
            type=int,
            default=90,
            help='Remove subscriptions older than this many days (default: 90)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Only show counts, do not delete',
        )

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=options['max_age_days'])
        stale = PushSubscription.objects.filter(created_at__lt=cutoff)
        count = stale.count()
        if options['dry_run']:
            self.stdout.write(f'Stale push subscriptions to remove: {count}')
            return
        stale.delete()
        self.stdout.write(self.style.SUCCESS(
            f'Removed {count} stale push subscription(s).'
        ))
