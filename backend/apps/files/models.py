import uuid
import secrets
from django.db import models
from django.conf import settings
from django.utils import timezone
import logging
from django.db.models import Sum, Q
from django.core.validators import (
    MinValueValidator,
    MaxValueValidator
)

logger = logging.getLogger(__name__)

def file_upload_path(instance, filename):
    ext = filename.rsplit('.', 1)[-1] if '.' in filename else ''
    unique_name = f"{uuid.uuid4().hex}.{ext}" if ext else uuid.uuid4().hex
    return f"uploads/{instance.owner.id}/{unique_name}"


def get_user_storage_summary(user):
    result = UserFile.objects.filter(owner=user).aggregate(
        active=Sum('size', filter=Q(is_deleted=False)),
        trash=Sum('size', filter=Q(is_deleted=True)),
    )
    return {
        'used': result['active'] or 0,
        'trash': result['trash'] or 0,
    }


class UserFile(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='files'
    )

    original_name = models.CharField(max_length=255)
    file = models.FileField(upload_to=file_upload_path)
    size = models.BigIntegerField()
    mime_type = models.CharField(max_length=100)

    uploaded_at = models.DateTimeField(auto_now_add=True)

    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    is_favorite = models.BooleanField(default=False)

    def soft_delete(self):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.shares.filter(is_revoked=False).update(is_revoked=True) 
        self.save(update_fields=['is_deleted', 'deleted_at'])

    def restore(self):
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=['is_deleted', 'deleted_at'])

    def toggle_favorite(self):
        self.is_favorite = not self.is_favorite
        self.save(update_fields=['is_favorite'])

    def hard_delete(self):
        self.is_favorite = False
        self.delete()

    def __str__(self):
        return f"{self.original_name} ({self.owner})"
    

VIEWABLE_MIME_TYPES = {'image/jpeg', 'image/png', 'application/pdf', 'text/plain'}

class FileShare(models.Model):
    file = models.ForeignKey(
        UserFile,
        on_delete=models.CASCADE,
        related_name='shares'
    )

    shared_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='shared_files'
    )
    shared_with_email = models.EmailField()
    shared_with_user  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True, related_name='received_shares'
    )

    token = models.CharField(max_length=64, unique=True, db_index=True)

    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_revoked = models.BooleanField(default=False)

    max_downloads = models.PositiveIntegerField(
        null=True, blank=True,
        validators=[
            MinValueValidator(1),
            MaxValueValidator(10)
        ]
    )
    download_count = models.PositiveIntegerField(default=0)

    max_views  = models.PositiveIntegerField(
        null=True, blank=True, 
        validators=[
            MinValueValidator(1),
            MaxValueValidator(20)
        ]
    )
    view_count = models.PositiveIntegerField(default=0)

    first_accessed_at = models.DateTimeField(null=True, blank=True)
    first_viewed_at   = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return bool(self.expires_at and timezone.now() > self.expires_at)

    @property
    def is_download_limit_reached(self):
        return self.max_downloads is not None and self.download_count >= self.max_downloads

    @property
    def is_view_limit_reached(self):
        return self.max_views is not None and self.view_count >= self.max_views

    @property
    def can_download(self):
        return not self.is_revoked and not self.is_expired and not self.is_download_limit_reached

    @property
    def can_view(self):
        return (
            not self.is_revoked and not self.is_expired
            and not self.is_view_limit_reached
            and self.file.mime_type in VIEWABLE_MIME_TYPES
        )

    @property
    def is_active(self):
        return not self.is_revoked and not self.is_expired and (
            self.can_download or self.can_view
        )


class ShareAccessLog(models.Model):
    class Action(models.TextChoices):
        ACCESS = 'access', 'Access'
        VIEW = 'view', 'View'
        DOWNLOAD = 'download', 'Download'

    share = models.ForeignKey(
        FileShare,
        on_delete=models.CASCADE,
        related_name='logs'
    )

    action = models.CharField(max_length=12, choices=Action.choices)
    accessed_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True, default='')

    def __str__(self):
        return (f'''{self.action} at {self.accessed_at}
        share={self.share.token} file={self.share.file.original_name}
        ip={self.ip_address} agent={self.user_agent[:50]}''')