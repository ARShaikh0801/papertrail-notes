from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import ScopedRateThrottle
from .models import User, Note, ChecklistItem, Stats
from .serializers import RegisterSerializer, LoginSerializer, NoteSerializer
from .utils import generate_token, get_current_utc_time
import datetime
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({'status': 'healthy'})


class StatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            visitor_stats = Stats.objects.get(name='visitors')
        except Stats.DoesNotExist:
            visitor_stats = Stats(name='visitors', count=0)
        
        if request.query_params.get('inc') == 'true':
            visitor_stats.count += 1
            visitor_stats.save()
        
        user_count = User.objects.count()
        return Response({
            'visitors': visitor_stats.count,
            'users': user_count
        })


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'sensitive'

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        data = serializer.validated_data

        if User.objects(username=data['username']).first():
            return Response({'error_view': 'Username already exists'}, status=400)
        
        if User.objects(email=data['email']).first():
            return Response({'error_view': 'Email already exists'}, status=400)

        user = User(username=data['username'], email=data['email'])
        user.set_password(data['password'])
        token = generate_token(user.id, user.username)
        return Response({'token': token, 'username': user.username}, status=201)


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'sensitive'

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        data = serializer.validated_data
        user = User.objects(username=data['username']).first()

        if not user or not user.check_password(data['password']):
            return Response({'error_view': 'Invalid credentials'}, status=401)

        token = generate_token(user.id, user.username)
        return Response({'token': token, 'username': user.username})


class NoteListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notes = Note.objects(user=request.user.username).order_by('-is_pinned', '-created_at')
        serializer = NoteSerializer(notes, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = NoteSerializer(data=request.data)
        raw_items = request.data.get('items', [])
        checklist_items = [ChecklistItem(text=i['text'], checked=i.get('checked', False)) for i in raw_items]

        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        data = serializer.validated_data
        note = Note(
            user=request.user.username,
            title=data['title'],
            content=data['content'],
            is_pinned=data.get('is_pinned', False),
            is_checklist=data.get('is_checklist', False),
            items=checklist_items
        )
        note.save()
        return Response(NoteSerializer(note).data, status=201)


class NoteDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, note_id):
        try:
            note = Note.objects.get(id=note_id, user=request.user.username)
        except Note.DoesNotExist:
            return Response({'error': 'Note not found'}, status=404)

        data = request.data
        if 'title' in data:
            note.title = data['title']
        if 'is_checklist' in data:
            note.is_checklist = data['is_checklist']
        if 'items' in data:
            note.items = [ChecklistItem(text=i['text'], checked=i.get('checked', False)) for i in data['items']]
        if 'content' in data:
            note.content = data['content']
        if 'is_pinned' in data:
            note.is_pinned = data['is_pinned']

        note.updated_at = get_current_utc_time()
        note.save()
        return Response(NoteSerializer(note).data)

    def delete(self, request, note_id):
        try:
            note = Note.objects.get(id=note_id, user=request.user.username)
        except Note.DoesNotExist:
            return Response({'error': 'Note not found'}, status=404)

        note.delete()
        return Response({'message': 'Note deleted'}, status=204)


class NoteLockView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, note_id):
        try:
            note = Note.objects.get(id=note_id, user=request.user.username)
        except Note.DoesNotExist:
            return Response({'error': 'Note not found'}, status=404)

        password = request.data.get('password')
        if not password:
            return Response({'error': 'Password is required'}, status=400)

        if request.user.check_password(password):
            note.is_locked = True
            note.save()
            return Response(NoteSerializer(note).data)
        else:
            return Response({'error': 'Incorrect password'}, status=403)


class NoteUnlockView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, note_id):
        try:
            note = Note.objects.get(id=note_id, user=request.user.username)
        except Note.DoesNotExist:
            return Response({'error': 'Note not found'}, status=404)

        password = request.data.get('password')
        if not password:
            return Response({'error': 'Password is required'}, status=400)

        if request.user.check_password(password):
            return Response(NoteSerializer(note, context={'bypass_lock': True}).data)
        else:
            return Response({'error': 'Incorrect password'}, status=403)


class NoteRemoveLockView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, note_id):
        try:
            note = Note.objects.get(id=note_id, user=request.user.username)
        except Note.DoesNotExist:
            return Response({'error': 'Note not found'}, status=404)

        password = request.data.get('password')
        if not password:
            return Response({'error': 'Password is required'}, status=400)

        if request.user.check_password(password):
            note.is_locked = False
            note.save()
            return Response(NoteSerializer(note).data)
        else:
            return Response({'error': 'Incorrect password'}, status=403)
