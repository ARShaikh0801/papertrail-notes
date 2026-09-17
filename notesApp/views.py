from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import ScopedRateThrottle
from .models import User, Note, ChecklistItem, Stats, VerificationCode
from .serializers import RegisterSerializer, LoginSerializer, NoteSerializer
from .utils import generate_token, get_current_utc_time, sanitize_html
from .tasks import send_email_async
import datetime
import math
import secrets
from django.core.mail import EmailMultiAlternatives
from django.http import JsonResponse
from django.core.cache import cache

def get_user_cache_version(user_id):
    """Get or initialize user's cache version number."""
    key = f"user_cache_ver:{user_id}"
    try:
        version = cache.get(key)
        if version is None:
            version = 1
            cache.set(key, version, timeout=86400 * 30)
        return version
    except Exception as e:
        print(f"Cache version read error: {e}")
        return 1

def invalidate_user_cache(user_id):
    """Increment user's cache version to invalidate all cached note views in O(1) time."""
    key = f"user_cache_ver:{user_id}"
    try:
        cache.incr(key)
    except Exception:
        try:
            cache.set(key, 2, timeout=86400 * 30)
        except Exception as e:
            print(f"Cache invalidate error: {e}")


def health_check(request):
    return JsonResponse({'status': 'healthy'})


class StatsView(APIView):
    permission_classes = [AllowAny]

    def get_throttles(self):
        # Only throttle the increment path - reading stats is unrestricted
        if self.request.query_params.get('inc') == 'true':
            self.throttle_scope = 'stats'
            return [ScopedRateThrottle()]
        return []

    def get(self, request):
        if request.query_params.get('inc') == 'true':
            # Atomic increment: prevents race conditions under concurrent requests
            Stats.objects(name='visitors').update_one(upsert=True, inc__count=1)

        try:
            visitor_stats = Stats.objects.get(name='visitors')
            visitor_count = visitor_stats.count
        except Stats.DoesNotExist:
            visitor_count = 0

        user_count = User.objects.count()
        return Response({
            'visitors': visitor_count,
            'users': user_count
        })


def send_verification_code_helper(email, is_forgot_password=False):
    # 1. Check user association
    user = User.objects(email=email).first()
    if is_forgot_password:
        if not user:
            # Return generic success to prevent user enumeration - attacker can't tell
            # whether the email is registered or not from the API response.
            return Response({'message': 'If an account with this email exists, a verification code has been sent.'}, status=200)
    else:
        if user:
            return Response({'error_view': 'Email already exists'}, status=400)

    # 2. Code generation & rate limits
    now = get_current_utc_time().replace(tzinfo=None)
    verification_record = VerificationCode.objects(email=email).first()

    if verification_record:
        # Check 15 min expiration
        time_since_creation = now - verification_record.created_at
        if time_since_creation < datetime.timedelta(minutes=15):
            # Check 2 min send limit
            time_since_last_sent = now - verification_record.sent_at
            if time_since_last_sent < datetime.timedelta(minutes=2):
                seconds_to_wait = int((datetime.timedelta(minutes=2) - time_since_last_sent).total_seconds())
                return Response({
                    'error_view': f'Please wait {seconds_to_wait} seconds before requesting a new code.',
                    'seconds_to_wait': seconds_to_wait
                }, status=429)
            
            # Resend the same code, update sent_at
            code = verification_record.code
            verification_record.sent_at = now
            verification_record.save()
        else:
            # Expired: generate new code
            code = "".join(secrets.choice("0123456789") for _ in range(6))
            verification_record.code = code
            verification_record.created_at = now
            verification_record.sent_at = now
            verification_record.save()
    else:
        # Create new verification record
        code = "".join(secrets.choice("0123456789") for _ in range(6))
        verification_record = VerificationCode(
            email=email,
            code=code,
            created_at=now,
            sent_at=now
        )
        verification_record.save()

    # 3. Dynamic email config
    if is_forgot_password:
        subject = "Reset your Papertrail password"
        email_header = "Reset your password"
        email_body = "You requested a password reset for your Papertrail account. Please use the verification code below to set a new password."
        email_note = "If you did not request this, you can safely ignore this email."
        text_content = f"You requested a password reset for Papertrail. Your verification code is: {code}. It is valid for 15 minutes."
    else:
        subject = "Verify your email for Papertrail"
        email_header = "Verify your email"
        email_body = "Thank you for signing up for Papertrail! Please use the verification code below to verify your email address and activate your account."
        email_note = "If you did not request this, please ignore this email."
        text_content = f"Welcome to Papertrail! Your verification code is: {code}. It is valid for 15 minutes."

    # 4. Send the email
    try:
        current_year = datetime.datetime.now().year
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{email_header}</title>
            <style>
                body {{
                    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    background-color: #faf6ef;
                    color: #1c1a16;
                    margin: 0;
                    padding: 0;
                    -webkit-font-smoothing: antialiased;
                }}
                .container {{
                    max-width: 500px;
                    margin: 40px auto;
                    background-color: #fff9f2;
                    border: 1px solid rgba(200, 136, 58, 0.2);
                    border-radius: 8px;
                    padding: 40px;
                    box-shadow: 0 4px 12px rgba(100, 70, 30, 0.05);
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                }}
                .header h1 {{
                    font-family: 'Lora', Georgia, serif;
                    font-size: 28px;
                    color: #c8883a;
                    margin: 0 0 10px 0;
                    font-weight: 600;
                }}
                .header p {{
                    font-size: 14px;
                    color: #6b6355;
                    margin: 0;
                }}
                .content {{
                    font-size: 16px;
                    line-height: 1.6;
                    color: #1c1a16;
                    text-align: center;
                }}
                .code-container {{
                    background-color: #f5efe4;
                    border: 1px dashed #c8883a;
                    border-radius: 6px;
                    padding: 20px;
                    margin: 30px 0;
                    text-align: center;
                }}
                .code-text {{
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 36px;
                    font-weight: bold;
                    letter-spacing: 6px;
                    color: #a0522d;
                    margin: 0;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 40px;
                    font-size: 12px;
                    color: #a09585;
                    border-top: 1px solid rgba(200, 136, 58, 0.15);
                    padding-top: 20px;
                }}
                .note {{
                    font-size: 14px;
                    color: #6b6355;
                    margin-top: 20px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Papertrail</h1>
                    <p>Your digital journal & notebook</p>
                </div>
                <div class="content">
                    <p>Hello,</p>
                    <p>{email_body}</p>
                    <div class="code-container">
                        <p class="code-text">{code}</p>
                    </div>
                    <p class="note">This verification code is valid for <strong>15 minutes</strong>. {email_note}</p>
                </div>
                <div class="footer">
                    <p>Papertrail &copy; {current_year} | Your private space for thoughts</p>
                </div>
            </div>
        </body>
        </html>
        """
        # Dispatch email task asynchronously via Celery - returns immediately to the HTTP client!
        send_email_async.delay(subject, text_content, html_content, email)
    except Exception as e:
        return Response({'error_view': f'Failed to queue email: {str(e)}'}, status=500)

    return Response({'message': 'Verification code sent successfully.'}, status=200)


class SendVerificationCodeView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'sensitive'

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error_view': 'Email is required'}, status=400)
        return send_verification_code_helper(email, is_forgot_password=False)


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'sensitive'

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        data = serializer.validated_data
        username = data['username'].strip()
        email = data['email'].strip().lower()
        code = data['code'].strip()
        password = data['password']

        if User.objects(username=username).first():
            return Response({'error_view': 'Username already exists'}, status=400)
        
        if User.objects(email=email).first():
            return Response({'error_view': 'Email already exists'}, status=400)

        # Check verification code
        verification_record = VerificationCode.objects(email=email).first()
        if not verification_record:
            return Response({'error_view': 'No verification code found for this email. Please request one.'}, status=400)

        # Verify expiry (15 mins)
        now = get_current_utc_time().replace(tzinfo=None)
        if now - verification_record.created_at > datetime.timedelta(minutes=15):
            return Response({'error_view': 'Verification code has expired. Please request a new one.'}, status=400)

        # Brute-force protection: max 10 attempts per code
        if (verification_record.attempts or 0) >= 10:
            verification_record.delete()
            return Response({'error_view': 'Too many failed attempts. Please request a new verification code.'}, status=429)

        # Verify code matching
        if verification_record.code != code:
            verification_record.attempts = (verification_record.attempts or 0) + 1
            verification_record.save()
            remaining = 10 - verification_record.attempts
            return Response({'error_view': f'Invalid verification code. {remaining} attempts remaining.'}, status=400)

        # Success: consume the code and register user
        verification_record.delete()

        user = User(username=username, email=email)
        user.set_password(password)
        token = generate_token(user.id, user.username, user.token_version or 0)
        return Response({'token': token, 'username': user.username}, status=201)


class SendForgotPasswordCodeView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'sensitive'

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error_view': 'Email is required'}, status=400)
        return send_verification_code_helper(email, is_forgot_password=True)


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'sensitive'

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        code = request.data.get('code', '').strip()
        password = request.data.get('password', '')

        if not email:
            return Response({'error_view': 'Email is required'}, status=400)
        if not code:
            return Response({'error_view': 'code is required'}, status=400)
        if not password:
            return Response({'error_view': 'new password is required'}, status=400)

        if len(password) < 6:
            return Response({'error_view': 'Password must be at least 6 characters'}, status=400)

        user = User.objects(email=email).first()
        if not user:
            return Response({'error_view': 'No account associated with this email'}, status=400)

        # Check verification code
        verification_record = VerificationCode.objects(email=email).first()
        if not verification_record:
            return Response({'error_view': 'No verification code found for this email. Please request one.'}, status=400)

        # Verify expiry (15 mins)
        now = get_current_utc_time().replace(tzinfo=None)
        if now - verification_record.created_at > datetime.timedelta(minutes=15):
            return Response({'error_view': 'Verification code has expired. Please request a new one.'}, status=400)

        # Brute-force protection: max 10 attempts per code
        if (verification_record.attempts or 0) >= 10:
            verification_record.delete()
            return Response({'error_view': 'Too many failed attempts. Please request a new verification code.'}, status=429)

        # Verify code matching
        if verification_record.code != code:
            verification_record.attempts = (verification_record.attempts or 0) + 1
            verification_record.save()
            remaining = 10 - verification_record.attempts
            return Response({'error_view': f'Invalid verification code. {remaining} attempts remaining.'}, status=400)

        # Success: consume the code, update password and log user in
        verification_record.delete()

        user.set_password(password)
        token = generate_token(user.id, user.username, user.token_version or 0)
        return Response({'token': token, 'username': user.username}, status=200)


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

        token = generate_token(user.id, user.username, user.token_version or 0)
        return Response({'token': token, 'username': user.username})


def purge_expired_trash(user_input=None):
    """
    Purge trashed notes older than 30 days.
    Intended to be run periodically as a background task / cron job rather than on every GET request.
    """
    try:
        cutoff = get_current_utc_time() - datetime.timedelta(days=30)
        if user_input:
            target_user = User.objects(username=user_input).first() if isinstance(user_input, str) else user_input
            if target_user:
                Note.objects(user=target_user, is_deleted=True, deleted_at__lt=cutoff).delete()
        else:
            Note.objects(is_deleted=True, deleted_at__lt=cutoff).delete()
    except Exception as e:
        print(f"Error purging expired trash: {e}")


def paginate_queryset(request, queryset, cursor_field='created_at', default_per_page=50, max_per_page=100):
    """
    Supports offset (page & per_page/limit) and cursor-based pagination for MongoEngine querysets.
    Returns: (meta_dict, paginated_queryset)
    """
    page_param = request.query_params.get('page')
    per_page_param = request.query_params.get('per_page') or request.query_params.get('limit')
    cursor = request.query_params.get('cursor')
    paginate = request.query_params.get('paginate')

    should_paginate = (page_param is not None or per_page_param is not None or cursor or paginate == 'true')

    if not should_paginate:
        return None, queryset

    try:
        per_page = int(per_page_param) if per_page_param else default_per_page
    except ValueError:
        per_page = default_per_page
    per_page = max(1, min(per_page, max_per_page))

    try:
        page = int(page_param) if page_param else 1
    except ValueError:
        page = 1
    page = max(1, page)

    if cursor:
        try:
            cursor_dt = datetime.datetime.fromisoformat(cursor.replace('Z', '+00:00'))
            filter_kwargs = {f"{cursor_field}__lt": cursor_dt}
            queryset = queryset.filter(**filter_kwargs)
        except Exception:
            pass

    total_count = queryset.count()
    total_pages = math.ceil(total_count / per_page) if total_count > 0 else 1
    offset = (page - 1) * per_page
    paginated_qs = queryset.skip(offset).limit(per_page)

    meta = {
        'count': total_count,
        'total_pages': total_pages,
        'current_page': page,
        'per_page': per_page,
        'has_next': page < total_pages,
        'has_prev': page > 1,
    }
    return meta, paginated_qs


class NoteListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get_throttles(self):
        if self.request.method == 'POST':
            self.throttle_scope = 'note_create'
            return [ScopedRateThrottle()]
        return super().get_throttles()

    def get(self, request):
        user_id = str(request.user.id)
        version = get_user_cache_version(user_id)

        # Build query fingerprint for cache key
        page = request.query_params.get('page', '1')
        per_page = request.query_params.get('per_page') or request.query_params.get('limit', '50')
        cursor = request.query_params.get('cursor', '')
        paginate = request.query_params.get('paginate', '')
        cache_key = f"notes:{user_id}:v{version}:p{page}:l{per_page}:c{cursor}:pag{paginate}"

        try:
            cached_response = cache.get(cache_key)
            if cached_response is not None:
                return Response(cached_response)
        except Exception as e:
            print(f"Cache read error: {e}")

        notes_qs = Note.objects(user=request.user, is_deleted__ne=True).order_by('-is_pinned', '-created_at')
        meta, notes = paginate_queryset(request, notes_qs, cursor_field='created_at')
        serializer = NoteSerializer(notes, many=True)
        
        if meta is not None:
            next_cursor = None
            if serializer.data:
                last_note = serializer.data[-1]
                next_cursor = last_note.get('created_at')
            meta['next_cursor'] = next_cursor
            response_data = {
                **meta,
                'results': serializer.data
            }
        else:
            response_data = serializer.data

        try:
            cache.set(cache_key, response_data, timeout=300)  # Cache for 5 mins
        except Exception as e:
            print(f"Cache set error: {e}")

        return Response(response_data)

    def post(self, request):
        serializer = NoteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        data = serializer.validated_data
        raw_items = data.get('items', [])
        checklist_items = [
            ChecklistItem(
                text=sanitize_html(i.get('text', '')[:500]),
                checked=i.get('checked', False)
            ) for i in raw_items[:100]
        ]

        note = Note(
            user=request.user,
            title=data.get('title', 'Untitled') or 'Untitled',
            content=data.get('content', ''),
            is_pinned=data.get('is_pinned', False),
            is_checklist=data.get('is_checklist', False),
            items=checklist_items
        )
        note.save()
        invalidate_user_cache(str(request.user.id))
        return Response(NoteSerializer(note).data, status=201)


class NoteTrashView(APIView):
    permission_classes = [IsAuthenticated]

    def get_throttles(self):
        if self.request.method == 'DELETE':
            self.throttle_scope = 'note_crud'
            return [ScopedRateThrottle()]
        return super().get_throttles()

    def get(self, request):
        user_id = str(request.user.id)
        version = get_user_cache_version(user_id)

        page = request.query_params.get('page', '1')
        per_page = request.query_params.get('per_page') or request.query_params.get('limit', '50')
        cursor = request.query_params.get('cursor', '')
        paginate = request.query_params.get('paginate', '')
        cache_key = f"trash:{user_id}:v{version}:p{page}:l{per_page}:c{cursor}:pag{paginate}"

        try:
            cached_response = cache.get(cache_key)
            if cached_response is not None:
                return Response(cached_response)
        except Exception as e:
            print(f"Cache read error: {e}")

        notes_qs = Note.objects(user=request.user, is_deleted=True).order_by('-deleted_at')
        meta, notes = paginate_queryset(request, notes_qs, cursor_field='deleted_at')
        serializer = NoteSerializer(notes, many=True)

        if meta is not None:
            next_cursor = None
            if serializer.data:
                last_note = serializer.data[-1]
                next_cursor = last_note.get('deleted_at')
            meta['next_cursor'] = next_cursor
            response_data = {
                **meta,
                'results': serializer.data
            }
        else:
            response_data = serializer.data

        try:
            cache.set(cache_key, response_data, timeout=300)
        except Exception as e:
            print(f"Cache set error: {e}")

        return Response(response_data)

    def delete(self, request):
        """Empty trash: permanently delete all trashed notes for user"""
        Note.objects(user=request.user, is_deleted=True).delete()
        invalidate_user_cache(str(request.user.id))
        return Response({'message': 'Trash emptied'}, status=200)


class NoteRestoreView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'note_crud'

    def post(self, request, note_id):
        try:
            note = Note.objects.get(id=note_id, user=request.user)
        except Note.DoesNotExist:
            return Response({'error': 'Note not found'}, status=404)

        note.is_deleted = False
        note.deleted_at = None
        note.updated_at = get_current_utc_time()
        note.save()
        invalidate_user_cache(str(request.user.id))
        return Response(NoteSerializer(note).data, status=200)


class NotePermanentDeleteView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'note_crud'

    def delete(self, request, note_id):
        try:
            note = Note.objects.get(id=note_id, user=request.user)
        except Note.DoesNotExist:
            return Response({'error': 'Note not found'}, status=404)

        note.delete()
        invalidate_user_cache(str(request.user.id))
        return Response({'message': 'Note permanently deleted'}, status=200)


class NoteDetailView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'note_crud'

    def patch(self, request, note_id):
        try:
            note = Note.objects.get(id=note_id, user=request.user)
        except Note.DoesNotExist:
            return Response({'error': 'Note not found'}, status=404)

        data = request.data
        if 'title' in data:
            title_val = str(data['title']).strip() if data['title'] else ''
            note.title = sanitize_html(title_val[:200]) or 'Untitled'
        if 'is_checklist' in data:
            note.is_checklist = bool(data['is_checklist'])
        if 'items' in data:
            raw_items = data['items'] if isinstance(data['items'], list) else []
            if len(raw_items) > 100:
                return Response({'error': 'Checklist cannot exceed 100 items.'}, status=400)
            note.items = [
                ChecklistItem(
                    text=sanitize_html(str(i.get('text', ''))[:500]),
                    checked=bool(i.get('checked', False))
                ) for i in raw_items[:100]
            ]
        if 'content' in data:
            content_val = str(data['content']) if data['content'] else ''
            if len(content_val) > 50000:
                return Response({'error': 'Note content exceeds maximum allowed size (50,000 characters).'}, status=400)
            note.content = sanitize_html(content_val)
        if 'is_pinned' in data:
            note.is_pinned = bool(data['is_pinned'])

        note.updated_at = get_current_utc_time()
        note.save()
        invalidate_user_cache(str(request.user.id))
        return Response(NoteSerializer(note).data)

    def delete(self, request, note_id):
        try:
            note = Note.objects.get(id=note_id, user=request.user)
        except Note.DoesNotExist:
            return Response({'error': 'Note not found'}, status=404)

        note.is_deleted = True
        note.deleted_at = get_current_utc_time()
        note.save()
        invalidate_user_cache(str(request.user.id))
        return Response({'message': 'Note moved to trash'}, status=200)


class NoteLockView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, note_id):
        try:
            note = Note.objects.get(id=note_id, user=request.user)
        except Note.DoesNotExist:
            return Response({'error': 'Note not found'}, status=404)

        password = request.data.get('password')
        if not password:
            return Response({'error': 'Password is required'}, status=400)

        if request.user.check_password(password):
            note.is_locked = True
            note.save()
            invalidate_user_cache(str(request.user.id))
            return Response(NoteSerializer(note).data)
        else:
            return Response({'error': 'Incorrect password'}, status=403)


class NoteUnlockView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, note_id):
        try:
            note = Note.objects.get(id=note_id, user=request.user)
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
            note = Note.objects.get(id=note_id, user=request.user)
        except Note.DoesNotExist:
            return Response({'error': 'Note not found'}, status=404)

        password = request.data.get('password')
        if not password:
            return Response({'error': 'Password is required'}, status=400)

        if request.user.check_password(password):
            note.is_locked = False
            note.save()
            invalidate_user_cache(str(request.user.id))
            return Response(NoteSerializer(note).data)
        else:
            return Response({'error': 'Incorrect password'}, status=403)

