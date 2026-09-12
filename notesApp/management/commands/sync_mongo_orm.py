from django.core.management.base import BaseCommand
from notesApp.admin import sync_users_from_mongo, sync_notes_from_mongo, sync_stats_from_mongo

class Command(BaseCommand):
    help = 'Bulk sync MongoDB documents into SQLite ORM models for Django Admin'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Syncing Users from MongoDB to SQLite ORM...'))
        sync_users_from_mongo()
        self.stdout.write(self.style.NOTICE('Syncing Notes from MongoDB to SQLite ORM...'))
        sync_notes_from_mongo()
        self.stdout.write(self.style.NOTICE('Syncing Stats from MongoDB to SQLite ORM...'))
        sync_stats_from_mongo()
        self.stdout.write(self.style.SUCCESS('Successfully completed MongoDB -> SQLite ORM sync.'))
