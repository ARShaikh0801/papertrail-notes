import pytest
import mongoengine
import mongomock
from django.core.cache import cache
from rest_framework.test import APIClient
from notesApp.models import User

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