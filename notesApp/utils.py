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


import bleach

ALLOWED_TAGS = [
    'p', 'b', 'i', 'em', 'strong', 'u', 's', 'strike', 'sub', 'sup',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a',
    'blockquote', 'code', 'pre', 'span', 'br', 'hr', 'div', 'mark',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'input'
]

ALLOWED_ATTRIBUTES = {
    'a': ['href', 'title', 'target', 'rel'],
    'span': ['class', 'style'],
    'div': ['class', 'style'],
    'p': ['class', 'style'],
    'code': ['class'],
    'input': ['type', 'checked', 'disabled']
}

ALLOWED_PROTOCOLS = ['http', 'https', 'mailto']

def sanitize_html(html_content):
    """
    Sanitize HTML input using bleach to prevent Stored XSS attacks.
    Strips script tags, event handlers (e.g. onerror=), and malicious protocols.
    """
    if not html_content or not isinstance(html_content, str):
        return ''
    return bleach.clean(
        html_content,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        protocols=ALLOWED_PROTOCOLS,
        strip=True
    )