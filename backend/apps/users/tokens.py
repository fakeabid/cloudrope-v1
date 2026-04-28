from rest_framework_simplejwt.tokens import RefreshToken
from .utils import hash_password


class PasswordAwareRefreshToken(RefreshToken):
    @classmethod
    def for_user(cls, user):
        token = super().for_user(user)
        token['pwd_hash'] = hash_password(user.password)
        return token
    

def get_tokens_for_user(user):
    refresh = PasswordAwareRefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }