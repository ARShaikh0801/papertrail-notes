from rest_framework import serializers
from .utils import sanitize_html

class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=100)
    email    = serializers.EmailField()
    password = serializers.CharField(min_length=6, write_only=True)
    code     = serializers.CharField(max_length=6, min_length=6)


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

class ChecklistItemSerializer(serializers.Serializer):
    text    = serializers.CharField(default='', allow_blank=True, required=False, max_length=500)
    checked = serializers.BooleanField(default=False)

    def validate_text(self, value):
        return sanitize_html(value)

class NoteSerializer(serializers.Serializer):
    id        = serializers.CharField(read_only=True)
    user      = serializers.SerializerMethodField(read_only=True)
    title     = serializers.CharField(max_length=200, default='Untitled', allow_blank=True, required=False)
    content   = serializers.CharField(default='', allow_blank=True, required=False, max_length=50000)
    is_pinned = serializers.BooleanField(default=False)
    is_checklist = serializers.BooleanField(default=False)
    is_locked = serializers.BooleanField(default=False, read_only=True)
    is_deleted = serializers.BooleanField(default=False, read_only=True)
    deleted_at = serializers.DateTimeField(read_only=True, required=False, allow_null=True)
    items        = ChecklistItemSerializer(many=True, required=False)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def validate_title(self, value):
        if value:
            return sanitize_html(value.strip())
        return 'Untitled'

    def validate_content(self, value):
        if value:
            if len(value) > 50000:
                raise serializers.ValidationError("Note content exceeds maximum allowed size (50,000 characters).")
            return sanitize_html(value)
        return ''

    def validate_items(self, value):
        if value and len(value) > 100:
            raise serializers.ValidationError("Checklist cannot exceed 100 items.")
        return value

    def get_user(self, obj):
        if hasattr(obj.user, 'username'):
            return obj.user.username
        return str(obj.user) if obj.user else ''

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        if rep.get('is_locked') and not self.context.get('bypass_lock'):
            rep['content'] = '****'
            rep['is_checklist'] = False
            rep['items'] = []
        return rep