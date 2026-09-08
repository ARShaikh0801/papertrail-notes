from rest_framework import serializers

class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=100)
    email    = serializers.EmailField()
    password = serializers.CharField(min_length=6, write_only=True)
    code     = serializers.CharField(max_length=6, min_length=6)


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

class ChecklistItemSerializer(serializers.Serializer):
    text    = serializers.CharField(default='', allow_blank=True, required=False)
    checked = serializers.BooleanField(default=False)
class NoteSerializer(serializers.Serializer):
    id        = serializers.CharField(read_only=True)
    title     = serializers.CharField(max_length=200, default='Untitled', allow_blank=True, required=False)
    content   = serializers.CharField(default='', allow_blank=True, required=False)
    is_pinned = serializers.BooleanField(default=False)
    is_checklist = serializers.BooleanField(default=False)
    is_locked = serializers.BooleanField(default=False, read_only=True)
    is_deleted = serializers.BooleanField(default=False, read_only=True)
    deleted_at = serializers.DateTimeField(read_only=True, required=False, allow_null=True)
    items        = ChecklistItemSerializer(many=True, required=False)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        if rep.get('is_locked') and not self.context.get('bypass_lock'):
            rep['content'] = '****'
            rep['is_checklist'] = False
            rep['items'] = []
        return rep