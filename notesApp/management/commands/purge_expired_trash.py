from django.core.management.base import BaseCommand
from notesApp.views import purge_expired_trash

class Command(BaseCommand):
    help = 'Purge trashed notes older than 30 days via scheduled task/cron'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting purge of expired trash notes...'))
        purge_expired_trash()
        self.stdout.write(self.style.SUCCESS('Finished purging expired trash notes.'))
