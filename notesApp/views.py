from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import ScopedRateThrottle
from .models import User, Note, ChecklistItem, Stats, VerificationCode
from .serializers import RegisterSerializer, LoginSerializer, NoteSerializer
from .utils import generate_token, get_current_utc_time
import datetime
import secrets
from django.core.mail import EmailMultiAlternatives
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


def send_verification_code_helper(email, is_forgot_password=False):
    # 1. Check user association
    user = User.objects(email=email).first()
    if is_forgot_password:
        if not user:
            return Response({'error_view': 'No account associated with this email'}, status=400)
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
        from django.conf import settings
        msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [email])
        msg.attach_alternative(html_content, "text/html")
        msg.send()
    except Exception as e:
        return Response({'error_view': f'Failed to send email: {str(e)}'}, status=500)

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

        # Verify code matching
        if verification_record.code != code:
            return Response({'error_view': 'Invalid verification code'}, status=400)

        # Success: consume the code and register user
        verification_record.delete()

        user = User(username=username, email=email)
        user.set_password(password)
        token = generate_token(user.id, user.username)
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

        # Verify code matching
        if verification_record.code != code:
            return Response({'error_view': 'Invalid verification code'}, status=400)

        # Success: consume the code, update password and log user in
        verification_record.delete()

        user.set_password(password)
        token = generate_token(user.id, user.username)
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

        token = generate_token(user.id, user.username)
        return Response({'token': token, 'username': user.username})


def purge_expired_trash(username):
    try:
        cutoff = get_current_utc_time() - datetime.timedelta(days=30)
        Note.objects(user=username, is_deleted=True, deleted_at__lt=cutoff).delete()
    except Exception as e:
        print(f"Error purging expired trash for {username}: {e}")


class NoteListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        purge_expired_trash(request.user.username)
        notes = Note.objects(user=request.user.username, is_deleted__ne=True).order_by('-is_pinned', '-created_at')
        serializer = NoteSerializer(notes, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = NoteSerializer(data=request.data)
        raw_items = request.data.get('items', [])
        checklist_items = [ChecklistItem(text=i.get('text', ''), checked=i.get('checked', False)) for i in raw_items]

        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        data = serializer.validated_data
        note = Note(
            user=request.user.username,
            title=data.get('title', 'Untitled') or 'Untitled',
            content=data.get('content', ''),
            is_pinned=data.get('is_pinned', False),
            is_checklist=data.get('is_checklist', False),
            items=checklist_items
        )
        note.save()
        return Response(NoteSerializer(note).data, status=201)


class NoteTrashView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        purge_expired_trash(request.user.username)
        notes = Note.objects(user=request.user.username, is_deleted=True).order_by('-deleted_at')
        serializer = NoteSerializer(notes, many=True)
        return Response(serializer.data)

    def delete(self, request):
        """Empty trash: permanently delete all trashed notes for user"""
        Note.objects(user=request.user.username, is_deleted=True).delete()
        return Response({'message': 'Trash emptied'}, status=200)


class NoteRestoreView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, note_id):
        try:
            note = Note.objects.get(id=note_id, user=request.user.username)
        except Note.DoesNotExist:
            return Response({'error': 'Note not found'}, status=404)

        note.is_deleted = False
        note.deleted_at = None
        note.updated_at = get_current_utc_time()
        note.save()
        return Response(NoteSerializer(note).data, status=200)


class NotePermanentDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, note_id):
        try:
            note = Note.objects.get(id=note_id, user=request.user.username)
        except Note.DoesNotExist:
            return Response({'error': 'Note not found'}, status=404)

        note.delete()
        return Response({'message': 'Note permanently deleted'}, status=200)


class NoteDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, note_id):
        try:
            note = Note.objects.get(id=note_id, user=request.user.username)
        except Note.DoesNotExist:
            return Response({'error': 'Note not found'}, status=404)

        data = request.data
        if 'title' in data:
            note.title = data['title'].strip() if data['title'] and data['title'].strip() else 'Untitled'
        if 'is_checklist' in data:
            note.is_checklist = data['is_checklist']
        if 'items' in data:
            note.items = [ChecklistItem(text=i.get('text', ''), checked=i.get('checked', False)) for i in data['items']]
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

        note.is_deleted = True
        note.deleted_at = get_current_utc_time()
        note.save()
        return Response({'message': 'Note moved to trash'}, status=200)


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
