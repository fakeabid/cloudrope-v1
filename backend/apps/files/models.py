import uuid
import secrets
from django.db import models
from django.conf import settings
from django.utils import timezone


def file_upload_path(instance, filename):
    ext = filename.rsplit('.', 1)[-1] if '.' in filename else ''
    unique_name = f"{uuid.uuid4().hex}.{ext}" if ext else uuid.uuid4().hex
    return f"uploads/{instance.owner.id}/{unique_name}"


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

    def soft_delete(self):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=['is_deleted', 'deleted_at'])

    def restore(self):
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=['is_deleted', 'deleted_at'])

    def hard_delete(self):
        if self.file:
            self.file.delete(save=False)

        self.delete()

    def __str__(self):
        return f"{self.original_name} ({self.owner})"
    

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

    token = models.CharField(max_length=64, unique=True, db_index=True)

    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_revoked = models.BooleanField(default=False)
    max_downloads = models.PositiveIntegerField(null=True, blank=True)
    download_count = models.PositiveIntegerField(default=0)
    first_accessed_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        if self.expires_at and timezone.now() > self.expires_at:
            return True
        return False
    
    @property
    def is_active(self):
        if self.is_revoked:
            return False
        if self.is_expired:
            return False
        if self.is_download_limit_reached:
            return False
        return True
        
    @property
    def is_download_limit_reached(self):
        return (
            self.max_downloads is not None and
            self.download_count >= self.max_downloads
        )


class ShareAccessLog(models.Model):
    class Action(models.TextChoices):
            VIEW = 'view', 'View'
            DOWNLOAD = 'download', 'Download'

    share = models.ForeignKey(
        FileShare,
        on_delete=models.CASCADE,
        related_name='logs'
    )

    action = models.CharField(max_length=10, choices=Action.choices)
    accessed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.action} at {self.accessed_at}"