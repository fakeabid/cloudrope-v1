import hashlib
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
from django.core.mail import send_mail
from django.conf import settings
from urllib.parse import quote


def normalize_email(email):
    return email.strip().lower()

def hash_password(password_hash: str) -> str:
    return hashlib.sha256(password_hash.encode()).hexdigest()[:16]

verification_signer = TimestampSigner(salt='email-verification')
reset_signer = TimestampSigner(salt='password-reset')


def generate_verification_token(user):
    return verification_signer.sign(user.pk)


def verify_verification_token(token, max_age=86400):  # 24 hours
    try:
        user_pk = verification_signer.unsign(token, max_age=max_age)
        return user_pk, None
    except SignatureExpired:
        return None, "Verification link has expired. Please request a new one."
    except BadSignature:
        return None, "Invalid verification link."


def send_verification_email(user, token):
    verification_url = f"{settings.FRONTEND_URL}/auth/verify-email/?token={quote(token, safe='')}"
    send_mail(
        subject="Verify your Cloudrope account",
        message=f"Hi {user.first_name},\n\nPlease verify your email by clicking the link below:\n\n{verification_url}\n\nThis link expires in 24 hours.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def generate_reset_token(user):
    return reset_signer.sign(user.pk)


def verify_reset_token(token, max_age=3600):  # 1 hour
    try:
        user_pk = reset_signer.unsign(token, max_age=max_age)
        return user_pk, None
    except SignatureExpired:
        return None, "Reset link has expired. Please request a new one."
    except BadSignature:
        return None, "Invalid reset link."


def send_password_reset_email(user, token):
    reset_url = f"{settings.FRONTEND_URL}/auth/reset-password/?token={token}"
    send_mail(
        subject="Reset your Cloudrope password",
        message=f"Hi {user.first_name},\n\nClick the link below to reset your password:\n\n{reset_url}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )