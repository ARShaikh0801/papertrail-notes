import math
import secrets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import User, Note, Stats, VerificationCode
from .permissions import IsAdmin
from .utils import generate_token


class AdminLoginView(APIView):
    """Authenticate as admin - returns JWT only if user has is_admin=True"""
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        if not username or not password:
            return Response({'error': 'Username and password are required.'}, status=400)

        user = User.objects(username=username).first()

        if not user or not user.check_password(password):
            return Response({'error': 'Invalid credentials.'}, status=401)

        if not user.is_admin:
            return Response({'error': 'Admin access required.'}, status=403)

        token = generate_token(user.id, user.username, user.token_version or 0)
        return Response({
            'token': token,
            'username': user.username,
        })


class AdminDashboardView(APIView):
    """Aggregate stats for the dashboard overview"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        user_count = User.objects.count()
        note_count = Note.objects(is_deleted__ne=True).count()
        trash_count = Note.objects(is_deleted=True).count()

        try:
            visitor_stats = Stats.objects.get(name='visitors')
            visitor_count = visitor_stats.count
        except Stats.DoesNotExist:
            visitor_count = 0

        # Recent signups (last 10 users, ordered by id descending - newest first)
        recent_users = User.objects.order_by('-id')[:10]
        recent_signups = [{
            'id': str(u.id),
            'username': u.username,
            'email': u.email,
            'is_admin': u.is_admin,
        } for u in recent_users]

        return Response({
            'user_count': user_count,
            'note_count': note_count,
            'trash_count': trash_count,
            'visitor_count': visitor_count,
            'recent_signups': recent_signups,
        })


class AdminUsersListView(APIView):
    """Paginated user list with search"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        search = request.query_params.get('search', '').strip()
        page = int(request.query_params.get('page', 1))
        per_page = int(request.query_params.get('per_page', 20))
        per_page = min(per_page, 100)  # cap

        queryset = User.objects
        if search:
            # Case-insensitive search across username and email
            import re
            regex = re.compile(re.escape(search), re.IGNORECASE)
            queryset = queryset.filter(
                __raw__={'$or': [
                    {'username': {'$regex': regex.pattern, '$options': 'i'}},
                    {'email': {'$regex': regex.pattern, '$options': 'i'}},
                ]}
            )

        total = queryset.count()
        total_pages = math.ceil(total / per_page) if total > 0 else 1
        offset = (page - 1) * per_page
        users = queryset.order_by('-id').skip(offset).limit(per_page)

        data = [{
            'id': str(u.id),
            'username': u.username,
            'email': u.email,
            'is_admin': u.is_admin,
            'note_count': Note.objects(user=u, is_deleted__ne=True).count(),
        } for u in users]

        return Response({
            'users': data,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': total_pages,
        })


class AdminUserDetailView(APIView):
    """View, update, or delete a specific user"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except (User.DoesNotExist, Exception):
            return Response({'error': 'User not found.'}, status=404)

        notes = Note.objects(user=user, is_deleted__ne=True)
        trash = Note.objects(user=user, is_deleted=True)

        return Response({
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'is_admin': user.is_admin,
            'note_count': notes.count(),
            'trash_count': trash.count(),
            'notes': [{
                'id': str(n.id),
                'title': n.title,
                'is_pinned': n.is_pinned,
                'is_checklist': n.is_checklist,
                'is_locked': n.is_locked,
                'created_at': n.created_at.isoformat() if n.created_at else None,
                'updated_at': n.updated_at.isoformat() if n.updated_at else None,
            } for n in notes.order_by('-created_at')[:50]],
        })

    def patch(self, request, user_id):
        """Reset password or toggle admin status"""
        try:
            user = User.objects.get(id=user_id)
        except (User.DoesNotExist, Exception):
            return Response({'error': 'User not found.'}, status=404)

        # Prevent self-demotion
        if str(user.id) == str(request.user.id):
            if 'is_admin' in request.data and not request.data['is_admin']:
                return Response({'error': 'Cannot remove your own admin access.'}, status=400)

        if 'password' in request.data:
            new_password = request.data['password']
            if len(new_password) < 6:
                return Response({'error': 'Password must be at least 6 characters.'}, status=400)
            user.set_password(new_password)

        if 'is_admin' in request.data:
            user.is_admin = bool(request.data['is_admin'])
            user.save()

        return Response({
            'message': 'User updated successfully.',
            'id': str(user.id),
            'username': user.username,
            'is_admin': user.is_admin,
        })

    def delete(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except (User.DoesNotExist, Exception):
            return Response({'error': 'User not found.'}, status=404)

        # Prevent self-deletion
        if str(user.id) == str(request.user.id):
            return Response({'error': 'Cannot delete your own account from admin.'}, status=400)

        # Delete all user's notes first
        Note.objects(user=user).delete()
        username = user.username
        user.delete()

        return Response({'message': f'User "{username}" and all their notes have been deleted.'})


class AdminNotesListView(APIView):
    """Paginated notes list with filters"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        page = int(request.query_params.get('page', 1))
        per_page = int(request.query_params.get('per_page', 20))
        per_page = min(per_page, 100)

        # Filters
        user_filter = request.query_params.get('user', '').strip()
        search = request.query_params.get('search', '').strip()
        status_filter = request.query_params.get('status', '')  # active, deleted, pinned, locked

        queryset = Note.objects

        if user_filter:
            user_obj = User.objects(username=user_filter).first()
            if user_obj:
                queryset = queryset.filter(user=user_obj)
            else:
                return Response({
                    'notes': [], 'total': 0, 'page': 1,
                    'per_page': per_page, 'total_pages': 1,
                })

        if status_filter == 'active':
            queryset = queryset.filter(is_deleted__ne=True)
        elif status_filter == 'deleted':
            queryset = queryset.filter(is_deleted=True)
        elif status_filter == 'pinned':
            queryset = queryset.filter(is_pinned=True, is_deleted__ne=True)
        elif status_filter == 'locked':
            queryset = queryset.filter(is_locked=True, is_deleted__ne=True)

        if search:
            import re
            regex = re.compile(re.escape(search), re.IGNORECASE)
            queryset = queryset.filter(title=regex)

        total = queryset.count()
        total_pages = math.ceil(total / per_page) if total > 0 else 1
        offset = (page - 1) * per_page
        notes = queryset.order_by('-updated_at').skip(offset).limit(per_page)

        data = []
        for n in notes:
            try:
                username = n.user.username if n.user else 'Unknown'
            except Exception:
                username = 'Unknown'

            data.append({
                'id': str(n.id),
                'title': n.title,
                'content_preview': (n.content or '')[:150],
                'user': username,
                'is_pinned': n.is_pinned,
                'is_checklist': n.is_checklist,
                'is_locked': n.is_locked,
                'is_deleted': n.is_deleted,
                'items_count': len(n.items) if n.items else 0,
                'created_at': n.created_at.isoformat() if n.created_at else None,
                'updated_at': n.updated_at.isoformat() if n.updated_at else None,
            })

        return Response({
            'notes': data,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': total_pages,
        })


class AdminNoteDetailView(APIView):
    """View or delete a specific note"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, note_id):
        try:
            note = Note.objects.get(id=note_id)
        except (Note.DoesNotExist, Exception):
            return Response({'error': 'Note not found.'}, status=404)

        try:
            username = note.user.username if note.user else 'Unknown'
        except Exception:
            username = 'Unknown'

        return Response({
            'id': str(note.id),
            'title': note.title,
            'content': note.content or '',
            'user': username,
            'is_pinned': note.is_pinned,
            'is_checklist': note.is_checklist,
            'is_locked': note.is_locked,
            'is_deleted': note.is_deleted,
            'items': [{'text': item.text, 'checked': item.checked} for item in (note.items or [])],
            'created_at': note.created_at.isoformat() if note.created_at else None,
            'updated_at': note.updated_at.isoformat() if note.updated_at else None,
            'deleted_at': note.deleted_at.isoformat() if note.deleted_at else None,
        })

    def delete(self, request, note_id):
        try:
            note = Note.objects.get(id=note_id)
        except (Note.DoesNotExist, Exception):
            return Response({'error': 'Note not found.'}, status=404)

        note.delete()
        return Response({'message': 'Note permanently deleted.'})


class AdminStatsView(APIView):
    """View and edit stats counters"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        stats = Stats.objects.all()
        data = [{
            'name': s.name,
            'count': s.count,
        } for s in stats]
        return Response({'stats': data})

    def patch(self, request):
        name = request.data.get('name', '').strip()
        count = request.data.get('count')

        if not name:
            return Response({'error': 'Stat name is required.'}, status=400)

        if count is None:
            return Response({'error': 'Count value is required.'}, status=400)

        try:
            count = int(count)
        except (ValueError, TypeError):
            return Response({'error': 'Count must be an integer.'}, status=400)

        stat = Stats.objects(name=name).first()
        if not stat:
            return Response({'error': f'Stat "{name}" not found.'}, status=404)

        stat.count = count
        stat.save()
        return Response({'message': f'Stat "{name}" updated to {count}.'})
