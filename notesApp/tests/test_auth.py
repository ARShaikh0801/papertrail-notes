import pytest
from notesApp.models import User, VerificationCode
from notesApp.utils import decode_token, get_current_utc_time
import jwt
from django.conf import settings
import datetime

@pytest.mark.django_db
def test_registration_success_with_valid_code(api_client):
    """Test 1.1: Valid verification code se registration successful hona chahiye"""

    # ---- ARRANGE ----
    VerificationCode.objects.create(
        email="test@example.com",
        code="123456"
    )

    payload = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "SecurePassword123!",
        "code": "123456"          # <-- naam "code" hai, "verification_code" nahi
    }

    # ---- ACT ----
    response = api_client.post('/api/auth/register/', payload, format='json')

    # ---- ASSERT ----
    assert response.status_code == 201

    user = User.objects.get(email="test@example.com")
    assert user.check_password("SecurePassword123!") == True
    assert user.is_admin == False   # naya user by default admin nahi hona chahiye

    assert "token" in response.data
    assert response.data["username"] == "testuser"

@pytest.mark.django_db
def test_registration_fails_with_duplicate_email(api_client):
    """Test 1.2a: Duplicate email se registration fail hona chahiye"""

    # ---- ARRANGE: ek existing user pehle se bana do ----
    existing_user = User(username="john", email="john@example.com")
    existing_user.set_password("ExistingPass123!")
    existing_user.save()

    # naye registration ke liye verification code bhi chahiye
    VerificationCode.objects.create(
        email="john@example.com",
        code="654321"
    )

    payload = {
        "username": "john_new",       # username alag hai
        "email": "john@example.com",  # lekin email same hai
        "password": "NewPassword123!",
        "code": "654321"
    }

    # ---- ACT ----
    response = api_client.post('/api/auth/register/', payload, format='json')

    # ---- ASSERT ----
    assert response.status_code == 400
    assert response.data['error_view'] == 'Email already exists' 

    # Sirf ek user hona chahiye DB me - duplicate create nahi hona chahiye
    assert User.objects(email="john@example.com").count() == 1

@pytest.mark.django_db
def test_registration_fails_with_duplicate_username(api_client):
    """Test 1.2b: Duplicate username se registration fail hona chahiye"""

    existing_user = User(username="john", email="original@example.com")
    existing_user.set_password("ExistingPass123!")
    existing_user.save()

    VerificationCode.objects.create(
        email="new@example.com",
        code="111222"
    )

    payload = {
        "username": "john",              # username same hai
        "email": "new@example.com",      # email alag hai
        "password": "NewPassword123!",
        "code": "111222"
    }

    response = api_client.post('/api/auth/register/', payload, format='json')

    assert response.status_code == 400
    assert User.objects(username="john").count() == 1
    assert response.data['error_view'] == 'Username already exists'



@pytest.mark.django_db
def test_login_success(api_client):
    """Test 1.3: Valid credentials se login successful hona chahiye"""

    # ---- ARRANGE ----
    user = User(username="john", email="john@example.com")
    user.set_password("SecretPassword123!")
    user.save()

    payload = {
        "username": "john",
        "password": "SecretPassword123!"
    }

    # ---- ACT ----
    response = api_client.post('/api/auth/login/', payload, format='json')

    # ---- ASSERT: response check ----
    assert response.status_code == 200
    assert "token" in response.data

    # ---- ASSERT: token ke andar ka data verify karo ----
    decoded_payload, error = decode_token(response.data["token"])

    assert error is None
    assert decoded_payload["user_id"] == str(user.id)
    assert decoded_payload["username"] == "john"

    user.reload()
    assert decoded_payload["token_version"] == user.token_version

@pytest.mark.django_db
def test_login_fails_with_wrong_password(api_client):
    """Test 1.4a: Galat password se login reject hona chahiye"""

    # ---- ARRANGE ----
    user = User(username="john", email="john@example.com")
    user.set_password("CorrectPassword123!")
    user.save()

    payload = {
        "username": "john",
        "password": "WrongPassword999!"
    }

    # ---- ACT ----
    response = api_client.post('/api/auth/login/', payload, format='json')

    assert response.data.get("error_view") == 'Invalid credentials'

    # ---- ASSERT ----
    assert response.status_code in (400, 401)
    assert "token" not in response.data


@pytest.mark.django_db
def test_login_fails_with_nonexistent_user(api_client):
    """Test 1.4b: Non-existent user se login reject hona chahiye"""

    # ---- ARRANGE ----
    # Yahan koi user hi nahi bana rahe - DB khaali hai is username ke liye

    payload = {
        "username": "ghost_user",
        "password": "SomePassword123!"
    }

    # ---- ACT ----
    response = api_client.post('/api/auth/login/', payload, format='json')
    
    assert response.data.get("error_view") == 'Invalid credentials'

    # ---- ASSERT ----
    assert response.status_code in (400, 401)
    assert "token" not in response.data


@pytest.mark.django_db
@pytest.mark.parametrize("auth_header", [
    None,                          # header bhi nahi bheja
    "Bearer randomgarbagestring",  # malformed/random token
])
def test_protected_endpoint_rejects_invalid_auth(api_client, auth_header):
    """Test 1.5a: No token / garbage token se protected endpoint access nahi hona chahiye"""

    if auth_header:
        api_client.credentials(HTTP_AUTHORIZATION=auth_header)

    response = api_client.get('/api/notes/')

    assert response.status_code == 401



@pytest.mark.django_db
def test_protected_endpoint_rejects_expired_token(api_client):
    """Test 1.5b: Expired token se protected endpoint access nahi hona chahiye"""

    # ---- ARRANGE: ek already-expired token khud banao ----
    now = get_current_utc_time()
    expired_payload = {
        "user_id": "someuserid123",
        "username": "john",
        "token_version": 0,
        "exp": now - datetime.timedelta(days=1),   # <-- kal expire ho chuka hai
        "iat": now - datetime.timedelta(days=8),
    }
    expired_token = jwt.encode(expired_payload, settings.SECRET_KEY, algorithm='HS256')

    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {expired_token}')

    # ---- ACT ----
    response = api_client.get('/api/notes/')

    # ---- ASSERT ----
    assert response.status_code == 401