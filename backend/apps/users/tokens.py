from rest_framework_simplejwt.tokens import RefreshToken
import hashlib


def hash_password(password_hash: str) -> str:
    return hashlib.sha256(password_hash.encode()).hexdigest()[:16]


class PasswordAwareRefreshToken(RefreshToken):
    @classmethod
    def for_user(cls, user):
        token = super().for_user(user)
        token['pwd_hash'] = hash_password(user.password)
        return token