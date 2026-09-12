from django.core.management.base import BaseCommand
from notesApp.models import Note as MongoNote, User as MongoUser
from mongoengine import dereference

class Command(BaseCommand):
    help = 'Migrate existing MongoEngine Note documents with string usernames to User ReferenceFields'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting Note user ReferenceField migration...'))
        
        # Access raw pymongo collection to inspect notes stored with string usernames
        raw_notes = MongoNote._get_collection().find({})
        migrated_count = 0
        skipped_count = 0
        error_count = 0

        # Build username -> User map
        users_map = {u.username: u for u in MongoUser.objects.all()}

        for raw_note in raw_notes:
            note_id = raw_note['_id']
            raw_user = raw_note.get('user')

            # If user is a string (username)
            if isinstance(raw_user, str):
                user_obj = users_map.get(raw_user)
                if user_obj:
                    # Update raw MongoDB document to DBRef / ObjectId reference
                    MongoNote._get_collection().update_one(
                        {'_id': note_id},
                        {'$set': {'user': user_obj.id}}
                    )
                    migrated_count += 1
                else:
                    self.stdout.write(self.style.WARNING(f"User '{raw_user}' not found for note {note_id}"))
                    error_count += 1
            else:
                skipped_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'Migration complete: {migrated_count} notes updated to ReferenceField, '
            f'{skipped_count} already references, {error_count} user lookup errors.'
        ))
