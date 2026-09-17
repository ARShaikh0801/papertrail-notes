from django.core.management.base import BaseCommand, CommandError
from notesApp.models import User


class Command(BaseCommand):
    help = 'Grant admin dashboard access to a user by username'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='Username to promote to admin')

    def handle(self, *args, **options):
        username = options['username']
        user = User.objects(username=username).first()
        if not user:
            raise CommandError(f'User "{username}" not found.')

        if user.is_admin:
            self.stdout.write(self.style.WARNING(f'User "{username}" is already an admin.'))
            return

        user.is_admin = True
        user.save()
        self.stdout.write(self.style.SUCCESS(f'User "{username}" has been granted admin access.'))
