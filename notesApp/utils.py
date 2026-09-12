import jwt
import datetime
from django.conf import settings

def get_current_utc_time():
    """Get current UTC time as timezone-aware datetime object"""
    return datetime.datetime.now(datetime.timezone.utc)

def generate_token(user_id, username, token_version=0):
    now = get_current_utc_time()
    payload = {
        'user_id': str(user_id),
        'username': username,
        'token_version': token_version,
        'exp': now + datetime.timedelta(days=7),
        'iat': now
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
    return token


def decode_token(token):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'], options={"verify_exp": True})
        return payload, None
    except jwt.ExpiredSignatureError:
        return None, 'Token expired'
    except jwt.InvalidTokenError as e:
        return None, f'Invalid token: {str(e)}'