from django.contrib import admin
from .models import (
    User as MongoUser,
    Note as MongoNote,
    Stats as MongoStats,
    UserORM,
    NoteORM,
    StatsORM
)
import datetime

# Sync helpers
def sync_users_from_mongo():
    try:
        mongo_users = MongoUser.objects.all()
        mongo_ids = []
        for mu in mongo_users:
            mongo_ids.append(str(mu.id))
            UserORM.objects.update_or_create(
                mongo_id=str(mu.id),
                defaults={
                    'username': mu.username,
                    'email': mu.email,
                }
            )
        UserORM.objects.exclude(mongo_id__in=mongo_ids).delete()
    except Exception as e:
        print(f"Error syncing users: {e}")

from django.utils import timezone

def make_tz_aware(dt):
    if dt is None:
        return None
    if timezone.is_naive(dt):
        return timezone.make_aware(dt, datetime.timezone.utc)
    return dt

def sync_notes_from_mongo():
    try:
        mongo_notes = MongoNote.objects.all()
        mongo_ids = []
        for mn in mongo_notes:
            mongo_ids.append(str(mn.id))
            username = mn.user.username if hasattr(mn.user, 'username') else str(mn.user)
            NoteORM.objects.update_or_create(
                mongo_id=str(mn.id),
                defaults={
                    'user': username,
                    'title': mn.title,
                    'content': mn.content or '',
                    'is_pinned': mn.is_pinned,
                    'is_checklist': mn.is_checklist,
                    'is_locked': mn.is_locked,
                    'is_deleted': getattr(mn, 'is_deleted', False),
                    'deleted_at': make_tz_aware(getattr(mn, 'deleted_at', None)),
                    'created_at': make_tz_aware(mn.created_at),
                    'updated_at': make_tz_aware(mn.updated_at),
                }
            )
        NoteORM.objects.exclude(mongo_id__in=mongo_ids).delete()
    except Exception as e:
        print(f"Error syncing notes: {e}")

def sync_stats_from_mongo():
    try:
        mongo_stats = MongoStats.objects.all()
        names = []
        for ms in mongo_stats:
            names.append(ms.name)
            StatsORM.objects.update_or_create(
                name=ms.name,
                defaults={
                    'count': ms.count
                }
            )
        StatsORM.objects.exclude(name__in=names).delete()
    except Exception as e:
        print(f"Error syncing stats: {e}")


@admin.register(UserORM)
class UserORMAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'mongo_id')
    search_fields = ('username', 'email')
    readonly_fields = ('mongo_id',)

    def delete_model(self, request, obj):
        try:
            MongoUser.objects(id=obj.mongo_id).delete()
        except Exception:
            pass
        super().delete_model(request, obj)

    def delete_queryset(self, request, queryset):
        for obj in queryset:
            try:
                MongoUser.objects(id=obj.mongo_id).delete()
            except Exception:
                pass
        queryset.delete()

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        try:
            if obj.mongo_id:
                mu = MongoUser.objects(id=obj.mongo_id).first()
                if mu:
                    mu.username = obj.username
                    mu.email = obj.email
                    mu.save()
            else:
                mu = MongoUser(username=obj.username, email=obj.email)
                # Password must be set. Set dummy password if created via admin
                mu.set_password('AdminUserPass123')
                mu.save()
                obj.mongo_id = str(mu.id)
                obj.save()
        except Exception as e:
            print(f"Error saving user to mongo: {e}")


@admin.register(NoteORM)
class NoteORMAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'is_pinned', 'is_checklist', 'is_locked', 'updated_at')
    list_filter = ('is_pinned', 'is_checklist', 'is_locked')
    search_fields = ('title', 'content', 'user')
    readonly_fields = ('mongo_id', 'created_at', 'updated_at')

    def delete_model(self, request, obj):
        try:
            MongoNote.objects(id=obj.mongo_id).delete()
        except Exception:
            pass
        super().delete_model(request, obj)

    def delete_queryset(self, request, queryset):
        for obj in queryset:
            try:
                MongoNote.objects(id=obj.mongo_id).delete()
            except Exception:
                pass
        queryset.delete()

    def save_model(self, request, obj, form, change):
        if not change:
            # Set default times for new objects
            obj.created_at = datetime.datetime.now(datetime.timezone.utc)
            obj.updated_at = datetime.datetime.now(datetime.timezone.utc)
        else:
            obj.updated_at = datetime.datetime.now(datetime.timezone.utc)
            
        super().save_model(request, obj, form, change)
        try:
            user_obj = MongoUser.objects(username=obj.user).first()
            if not user_obj:
                print(f"Warning: MongoUser matching {obj.user} not found during admin save")
                return

            if obj.mongo_id:
                mn = MongoNote.objects(id=obj.mongo_id).first()
                if mn:
                    mn.user = user_obj
                    mn.title = obj.title
                    mn.content = obj.content
                    mn.is_pinned = obj.is_pinned
                    mn.is_checklist = obj.is_checklist
                    mn.is_locked = obj.is_locked
                    mn.updated_at = obj.updated_at
                    mn.save()
            else:
                mn = MongoNote(
                    user=user_obj,
                    title=obj.title,
                    content=obj.content or '',
                    is_pinned=obj.is_pinned,
                    is_checklist=obj.is_checklist,
                    is_locked=obj.is_locked,
                    created_at=obj.created_at,
                    updated_at=obj.updated_at
                )
                mn.save()
                obj.mongo_id = str(mn.id)
                obj.save()
        except Exception as e:
            print(f"Error saving note to mongo: {e}")


@admin.register(StatsORM)
class StatsORMAdmin(admin.ModelAdmin):
    list_display = ('name', 'count')
    readonly_fields = ('name',)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        try:
            ms = MongoStats.objects(name=obj.name).first()
            if ms:
                ms.count = obj.count
                ms.save()
        except Exception as e:
            print(f"Error saving stats to mongo: {e}")
