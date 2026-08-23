from mongoengine import Document, StringField, BooleanField,ListField, DateTimeField, ReferenceField, EmailField, EmbeddedDocument, EmbeddedDocumentField, IntField
from django.contrib.auth.hashers import make_password, check_password
import datetime

def _get_utc_now():
    """Default factory for UTC now datetime"""
    return datetime.datetime.now(datetime.timezone.utc)

class User(Document):
    username   = StringField(required=True, unique=True)
    email      = EmailField(required=True, unique=True)
    password   = StringField(required=True)

    @property
    def is_authenticated(self):
        return True

    def set_password(self, raw_password):
        self.password = make_password(raw_password)
        self.save()

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)

    meta = {'collection': 'users'}

class ChecklistItem(EmbeddedDocument):
    text      = StringField(required=True)
    checked   = BooleanField(default=False)


class Note(Document):
    user       = StringField(required=True)
    title      = StringField(required=True, max_length=200)
    content    = StringField(required=False)
    is_pinned  = BooleanField(default=False)
    is_checklist = BooleanField(default=False)
    is_locked  = BooleanField(default=False)
    items        = ListField(EmbeddedDocumentField(ChecklistItem))
    created_at = DateTimeField(default=_get_utc_now)
    updated_at = DateTimeField(default=_get_utc_now)

    meta = {'collection': 'notes'}

class Stats(Document):
    name = StringField(required=True, unique=True)
    count = IntField(default=0)

    meta = {'collection': 'stats'}
