from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import User
from .utils import decode_token

class JWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None

        if not auth_header.startswith('Bearer '):
            return None

        token = auth_header.split(' ')[1]
        payload, error = decode_token(token)
        if error:
            raise AuthenticationFailed(error)

        try:
            user = User.objects.get(id=payload['user_id'])
        except User.DoesNotExist:
            raise AuthenticationFailed('User not found')

        # Validate token_version — rejects tokens issued before a password change
        token_version = payload.get('token_version', 0)
        user_token_version = user.token_version or 0
        if token_version != user_token_version:
            raise AuthenticationFailed('Token has been revoked. Please log in again.')

        return (user, token)
