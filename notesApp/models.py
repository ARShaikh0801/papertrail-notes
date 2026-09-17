from mongoengine import Document, StringField, BooleanField, ListField, DateTimeField, ReferenceField, EmailField, EmbeddedDocument, EmbeddedDocumentField, IntField, CASCADE
from django.contrib.auth.hashers import make_password, check_password
import datetime

def _get_utc_now():
    """Default factory for UTC now datetime"""
    return datetime.datetime.now(datetime.timezone.utc)

class User(Document):
    username   = StringField(required=True, unique=True)
    email      = EmailField(required=True, unique=True)
    password   = StringField(required=True)
    is_admin   = BooleanField(default=False)  # Admin dashboard access flag
    token_version = IntField(default=0)  # Incremented on password change to invalidate old JWTs

    @property
    def is_authenticated(self):
        return True

    def set_password(self, raw_password):
        self.password = make_password(raw_password)
        self.token_version = (self.token_version or 0) + 1
        self.save()

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)

    meta = {'collection': 'users'}

class ChecklistItem(EmbeddedDocument):
    text      = StringField(required=True, max_length=500)
    checked   = BooleanField(default=False)


class Note(Document):
    user       = ReferenceField(User, required=True, reverse_delete_rule=CASCADE)
    title      = StringField(required=True, max_length=200)
    content    = StringField(required=False, max_length=50000)
    is_pinned  = BooleanField(default=False)
    is_checklist = BooleanField(default=False)
    is_locked  = BooleanField(default=False)
    is_deleted = BooleanField(default=False)
    deleted_at = DateTimeField(default=None)
    items        = ListField(EmbeddedDocumentField(ChecklistItem), max_length=100)
    created_at = DateTimeField(default=_get_utc_now)
    updated_at = DateTimeField(default=_get_utc_now)

    meta = {
        'collection': 'notes',
        'indexes': [
            {'fields': ['user', 'is_deleted', '-is_pinned', '-created_at']},
            {'fields': ['user', 'is_deleted', '-deleted_at']},
        ]
    }

class Stats(Document):
    name = StringField(required=True, unique=True)
    count = IntField(default=0)

    meta = {'collection': 'stats'}

class VerificationCode(Document):
    email      = EmailField(required=True, unique=True)
    code       = StringField(required=True)
    attempts   = IntField(default=0)  # Tracks failed verification attempts (max 10)
    created_at = DateTimeField(default=_get_utc_now)
    sent_at    = DateTimeField(default=_get_utc_now)

    meta = {'collection': 'verification_codes'}

