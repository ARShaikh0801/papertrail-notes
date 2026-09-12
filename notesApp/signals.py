from mongoengine.signals import post_save, post_delete
from .models import User as MongoUser, Note as MongoNote, Stats as MongoStats, UserORM, NoteORM, StatsORM
from django.utils import timezone
import datetime
import logging

logger = logging.getLogger(__name__)

def make_tz_aware(dt):
    if dt is None:
        return None
    if timezone.is_naive(dt):
        return timezone.make_aware(dt, datetime.timezone.utc)
    return dt

def sync_user_post_save(sender, document, created=False, **kwargs):
    try:
        UserORM.objects.update_or_create(
            mongo_id=str(document.id),
            defaults={
                'username': document.username,
                'email': document.email,
            }
        )
    except Exception as e:
        logger.error(f"Error in sync_user_post_save: {e}")

def sync_user_post_delete(sender, document, **kwargs):
    try:
        UserORM.objects.filter(mongo_id=str(document.id)).delete()
    except Exception as e:
        logger.error(f"Error in sync_user_post_delete: {e}")

def sync_note_post_save(sender, document, created=False, **kwargs):
    try:
        username = document.user.username if hasattr(document.user, 'username') else str(document.user)
        created_dt = make_tz_aware(document.created_at) or datetime.datetime.now(datetime.timezone.utc)
        updated_dt = make_tz_aware(document.updated_at) or datetime.datetime.now(datetime.timezone.utc)
        deleted_dt = make_tz_aware(document.deleted_at)
        NoteORM.objects.update_or_create(
            mongo_id=str(document.id),
            defaults={
                'user': username,
                'title': document.title,
                'content': document.content or '',
                'is_pinned': document.is_pinned,
                'is_checklist': document.is_checklist,
                'is_locked': document.is_locked,
                'is_deleted': document.is_deleted,
                'deleted_at': deleted_dt,
                'created_at': created_dt,
                'updated_at': updated_dt,
            }
        )
    except Exception as e:
        logger.error(f"Error in sync_note_post_save: {e}")

def sync_note_post_delete(sender, document, **kwargs):
    try:
        NoteORM.objects.filter(mongo_id=str(document.id)).delete()
    except Exception as e:
        logger.error(f"Error in sync_note_post_delete: {e}")

def sync_stats_post_save(sender, document, created=False, **kwargs):
    try:
        StatsORM.objects.update_or_create(
            name=document.name,
            defaults={'count': document.count}
        )
    except Exception as e:
        logger.error(f"Error in sync_stats_post_save: {e}")

def register_signals():
    try:
        post_save.connect(sync_user_post_save, sender=MongoUser)
        post_delete.connect(sync_user_post_delete, sender=MongoUser)
        post_save.connect(sync_note_post_save, sender=MongoNote)
        post_delete.connect(sync_note_post_delete, sender=MongoNote)
        post_save.connect(sync_stats_post_save, sender=MongoStats)
        logger.info("Successfully registered MongoEngine signals for incremental ORM sync.")
    except Exception as e:
        logger.warning(f"Could not register MongoEngine signals: {e}")
