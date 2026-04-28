# apps/users/backends.py
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password as dummy_check

User = get_user_model()

class CloudropeBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None or password is None:
            return None
        
        try:
            user = User.all_objects.get(email=username)
        except User.DoesNotExist:
            dummy_check(password, "!")
            return None

        if not user.check_password(password):
            return None

        # Return user regardless of is_active — let the caller handle that
        return user

    def user_can_authenticate(self, user):
        return user.deleted_at is None