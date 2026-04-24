# apps/users/backends.py
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()

class CloudropeBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None or password is None:
            return None
        
        try:
            user = User.all_objects.get(email=username)
        except User.DoesNotExist:
            return None

        if not user.check_password(password):
            return None

        # Return user regardless of is_active — let the caller handle that
        return user

    def user_can_authenticate(self, user):
        # Override ModelBackend's is_active check
        return True