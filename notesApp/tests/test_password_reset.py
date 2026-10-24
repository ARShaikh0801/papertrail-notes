import pytest
from unittest.mock import patch
import datetime
from notesApp.models import User, VerificationCode
from notesApp.utils import get_current_utc_time

@pytest.mark.django_db
@patch('notesApp.tasks.send_email_async.delay')
def test_send_code_cooldown_blocks_second_request(mock_send_email, api_client):
    """Test 2.1: 60 second ke andar dusri send-code request block honi chahiye"""

    # ---- ACT: pehli request ----
    response1 = api_client.post('/api/auth/send-code/', {"email": "alice@example.com"}, format='json')
    assert response1.status_code == 200
    mock_send_email.assert_called_once()
    # ---- ACT: turant dusri request, same email ----
    response2 = api_client.post('/api/auth/send-code/', {"email": "alice@example.com"}, format='json')

    # ---- ASSERT ----
    assert response2.status_code in (400, 429)

@pytest.mark.django_db
def test_registration_fails_with_expired_code(api_client):
    """Test 2.2: 10 minute se purana code registration me reject hona chahiye"""

    # ---- ARRANGE: 15 minute purana code banao ----
    old_time = get_current_utc_time() - datetime.timedelta(minutes=15)

    VerificationCode.objects.create(
        email="test@example.com",
        code="123456",
        created_at=old_time
    )

    payload = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "SecurePassword123!",
        "code": "123456"      # code bilkul sahi hai, sirf purana hai
    }

    # ---- ACT ----
    response = api_client.post('/api/auth/register/', payload, format='json')

    # ---- ASSERT ----
    assert response.status_code == 400
    assert response.data.get("error_view") == 'Verification code has expired. Please request a new one.'
    assert User.objects(email="test@example.com").count() == 0

@pytest.mark.django_db
def test_registration_locked_after_max_wrong_attempts(api_client, no_throttle):
    """Test 2.3: 10 galat attempts ke baad sahi code bhi reject hona chahiye"""

    # ---- ARRANGE ----
    VerificationCode.objects.create(email="user@example.com", code="123456")

    wrong_payload = {
        "username": "testuser",
        "email": "user@example.com",
        "password": "SecurePassword123!",
        "code": "000000"       # galat code
    }

    # ---- ACT 1: 10 baar galat code bhejo ----
    for _ in range(10):
        response = api_client.post('/api/auth/register/', wrong_payload, format='json')
        assert response.status_code == 400

    # ---- ASSERT 1: counter 10 pe pahunch gaya ----
    code_doc = VerificationCode.objects.get(email="user@example.com")
    assert code_doc.attempts == 10

    # ---- ACT 2: ab 11th attempt, is baar SAHI code ke saath ----
    correct_payload = {**wrong_payload, "code": "123456"}
    response = api_client.post('/api/auth/register/', correct_payload, format='json')

    # ---- ASSERT 2: lockout ki wajah se reject hona chahiye ----
    assert response.status_code == 429
    assert response.data.get("error_view") == 'Too many failed attempts. Please request a new verification code.'
    assert User.objects(email="user@example.com").count() == 0

@pytest.mark.django_db
def test_password_reset_updates_password(api_client, no_throttle):
    """Test 2.4: Reset ke baad purana password fail, naya password pass"""

    # ---- ARRANGE ----
    user = User(username="john", email="john@example.com")
    user.set_password("OldPassword123!")
    user.save()

    VerificationCode.objects.create(email="john@example.com", code="123456")

    # ---- ACT 1: password reset ----
    reset_response = api_client.post('/api/auth/forgot-password/reset/', {
        "email": "john@example.com",
        "code": "123456",
        "password": "NewPassword456!"
    }, format='json')

    # ---- ASSERT 1 ----
    assert reset_response.status_code == 200
    assert VerificationCode.objects(email="john@example.com").count() == 0

    # ---- ACT 2 + ASSERT 2: purane password se login fail ----
    old_login = api_client.post('/api/auth/login/', {
        "username": "john",
        "password": "OldPassword123!"
    }, format='json')
    assert old_login.status_code in (400, 401)

    # ---- ACT 3 + ASSERT 3: naye password se login pass ----
    new_login = api_client.post('/api/auth/login/', {
        "username": "john",
        "password": "NewPassword456!"
    }, format='json')
    assert new_login.status_code == 200
    assert "token" in new_login.data

@pytest.mark.django_db
def test_password_reset_invalidates_old_tokens(api_client, no_throttle):
    """Test 2.5: Password reset ke baad purana JWT token revoke ho jana chahiye"""

    # ---- ARRANGE: user banao ----
    user = User(username="john", email="john@example.com")
    user.set_password("OldPassword123!")
    user.save()

    # ---- ACT 1: login karke token_A lo ----
    login_response = api_client.post('/api/auth/login/', {
        "username": "john",
        "password": "OldPassword123!"
    }, format='json')
    assert login_response.status_code == 200
    token_a = login_response.data["token"]

    # ---- ASSERT 1: reset se pehle token_A kaam kar raha hai ----
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_a}')
    before_reset = api_client.get('/api/notes/')
    assert before_reset.status_code == 200

    # ---- ACT 2: password reset karo ----
    VerificationCode.objects.create(email="john@example.com", code="123456")
    api_client.credentials()   # header hata do, reset ke liye token nahi chahiye
    reset_response = api_client.post('/api/auth/forgot-password/reset/', {
        "email": "john@example.com",
        "code": "123456",
        "password": "NewPassword456!"
    }, format='json')
    assert reset_response.status_code == 200

    # ---- ACT 3: wahi purana token_A dobara use karo ----
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_a}')
    after_reset = api_client.get('/api/notes/')
    
    # ---- ASSERT 2: ab reject hona chahiye ----
    assert after_reset.data.get('detail') == "Token has been revoked. Please log in again."
    assert after_reset.status_code == 401