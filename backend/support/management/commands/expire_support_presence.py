from django.core.management.base import BaseCommand

from support.services import expire_stale_support_presence


class Command(BaseCommand):
    help = 'Mark support agents away/offline after missed heartbeats.'

    def add_arguments(self, parser):
        parser.add_argument('--offline-after', type=int, default=90)
        parser.add_argument('--away-after', type=int, default=60)

    def handle(self, *args, **options):
        result = expire_stale_support_presence(
            offline_after_seconds=options['offline_after'],
            away_after_seconds=options['away_after'],
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"support presence expired: away={result['away']} offline={result['offline']}"
            )
        )
