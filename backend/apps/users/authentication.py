from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from .utils import hash_password

class PasswordAwareJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)

        pwd_hash = validated_token.get('pwd_hash')

        if pwd_hash is None:
            raise InvalidToken('Token is missing required claims.')

        expected = hash_password(user.password)

        if pwd_hash != expected:
            raise InvalidToken('Token has been invalidated due to a password change.')

        return user