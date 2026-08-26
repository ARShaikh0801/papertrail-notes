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

class VerificationCode(Document):
    email      = EmailField(required=True, unique=True)
    code       = StringField(required=True)
    created_at = DateTimeField(default=_get_utc_now)
    sent_at    = DateTimeField(default=_get_utc_now)

    meta = {'collection': 'verification_codes'}

from django.db import models

class UserORM(models.Model):
    mongo_id = models.CharField(max_length=24, unique=True)
    username = models.CharField(max_length=150)
    email = models.EmailField()

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return self.username

class NoteORM(models.Model):
    mongo_id = models.CharField(max_length=24, unique=True)
    user = models.CharField(max_length=150)
    title = models.CharField(max_length=200)
    content = models.TextField(blank=True, null=True)
    is_pinned = models.BooleanField(default=False)
    is_checklist = models.BooleanField(default=False)
    is_locked = models.BooleanField(default=False)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        verbose_name = "Note"
        verbose_name_plural = "Notes"

    def __str__(self):
        return f"{self.user} - {self.title}"

class StatsORM(models.Model):
    name = models.CharField(max_length=100, unique=True)
    count = models.IntegerField(default=0)

    class Meta:
        verbose_name = "Stats"
        verbose_name_plural = "Stats"

    def __str__(self):
        return f"{self.name}: {self.count}"

