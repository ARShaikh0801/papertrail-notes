from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """
    Only grants access to users with is_admin=True.
    Works with the existing JWT authentication - the user object
    on request.user is the MongoEngine User document.
    """
    message = 'Admin access required.'

    def has_permission(self, request, view):
        return (
            request.user
            and getattr(request.user, 'is_authenticated', False)
            and getattr(request.user, 'is_admin', False)
        )
