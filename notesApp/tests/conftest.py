import pytest
import mongoengine
import mongomock
from django.core.cache import cache
from rest_framework.test import APIClient
from notesApp.models import User
from unittest.mock import patch
from notesApp.utils import generate_token

@pytest.fixture(autouse=True)
def setup_test_db():
    """Har test se pehle real MongoDB se disconnect karke fake in-memory DB connect karta hai,
    aur test khatam hone ke baad clean kar deta hai."""
    mongoengine.disconnect(alias='default')
    conn = mongoengine.connect('test_notes_db', host='localhost', mongo_client_class=mongomock.MongoClient, uuidRepresentation='standard')
    cache.clear()

    yield conn

    conn.drop_database('test_notes_db')
    mongoengine.disconnect(alias='default')
    cache.clear()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def no_throttle():
    """Is fixture ko use karne wale test me DRF throttling band rehti hai."""
    with patch('rest_framework.throttling.SimpleRateThrottle.allow_request', return_value=True):
        yield

@pytest.fixture
def user():
    """Ek ready-made test user (DB me saved)."""
    u = User(username="john", email="john@example.com")
    u.set_password("SecretPassword123!")
    u.save()
    return u

@pytest.fixture
def auth_client(user):
    """Ek APIClient jisme is user ka valid JWT token pehle se laga hua hai."""
    client = APIClient()
    token = generate_token(user.id, user.username, user.token_version)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client

@pytest.fixture
def other_user():
    """Doosra test user (User B)."""
    u = User(username="alice", email="alice@example.com")
    u.set_password("AlicePassword123!")
    u.save()
    return u

@pytest.fixture
def other_auth_client(other_user):
    """Alice ka authenticated client."""
    client = APIClient()
    token = generate_token(other_user.id, other_user.username, other_user.token_version)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client