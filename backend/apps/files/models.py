import logging
import secrets
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


logger = logging.getLogger(__name__)

def file_upload_path(instance, filename):
    ext = filename.rsplit('.', 1)[-1] if '.' in filename else ''
    unique_name = f"{uuid.uuid4().hex}.{ext}" if ext else uuid.uuid4().hex
    return f"uploads/{instance.owner.id}/{unique_name}"


class UserFile(models.Model):
    owner         = models.ForeignKey(
                        settings.AUTH_USER_MODEL,
                        on_delete=models.CASCADE,
                        related_name='files'
                    )
    original_name = models.CharField(max_length=255)
    file          = models.FileField(upload_to=file_upload_path)
    size          = models.PositiveBigIntegerField()
    mime_type     = models.CharField(max_length=100)
    uploaded_at   = models.DateTimeField(auto_now_add=True)
    is_deleted    = models.BooleanField(default=False)
    deleted_at    = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-uploaded_at']
        indexes = [
            # Core access pattern — every file query filters on both
            models.Index(fields=['owner', 'is_deleted']),
            # Sorting by upload date is the default ordering
            models.Index(fields=['uploaded_at']),
        ]

    def __str__(self):
        return f"{self.original_name} ({self.owner.email})"

    def soft_delete(self):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=['is_deleted', 'deleted_at'])

            # Revoke all active shares so they show as 'revoked' not 'pending' in the UI
        self.shares.filter(is_revoked=False).update(is_revoked=True)

        # Actually remove from S3 — without this, soft delete just hides the
        # file in the DB while S3 keeps billing for it indefinitely
        try:
            self.file.delete(save=False)
        except Exception as e:
            logger.error(f"Failed to delete S3 object for UserFile {self.pk}: {e}")


class FileShare(models.Model):
    file              = models.ForeignKey(
                            UserFile,
                            on_delete=models.CASCADE,
                            related_name='shares'
                        )
    shared_by         = models.ForeignKey(
                            settings.AUTH_USER_MODEL,
                            on_delete=models.CASCADE,
                            related_name='shared_files'
                        )
    recipient_email   = models.EmailField()

    # token_urlsafe(48) produces exactly 64 URL-safe base64 characters.
    # token_urlsafe(32) produces 43 — fits in 64, but the mismatch was confusing.
    # Using 48 bytes makes the relationship between nbytes and max_length explicit.
    token             = models.CharField(max_length=64, unique=True, db_index=True)

    message           = models.TextField(blank=True)
    expires_at        = models.DateTimeField()
    created_at        = models.DateTimeField(auto_now_add=True)
    first_accessed_at = models.DateTimeField(null=True, blank=True)
    download_count    = models.PositiveIntegerField(default=0)
    is_revoked        = models.BooleanField(default=False)

    # None = unlimited downloads
    max_downloads     = models.PositiveIntegerField(null=True, blank=True)

    # When False: recipient can view/stream but the download endpoint is blocked
    allow_download    = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            # Used when listing shares for a user
            models.Index(fields=['shared_by', 'created_at']),
            # Used when checking if a share is still valid
            models.Index(fields=['expires_at', 'is_revoked']),
            # Used when revoking all shares for a deleted file
            models.Index(fields=['file', 'is_revoked']),
        ]

    def __str__(self):
        return f"{self.file.original_name} → {self.recipient_email}"

    def save(self, *args, **kwargs):
        # Auto-generate token on creation — never relies on the caller to set it
        if not self.token:
            for _ in range(5):
                token = self.generate_token()
                if not FileShare.objects.filter(token=token).exists():
                    self.token = token
                    break
            else:
                raise RuntimeError("Failed to generate a unique share token.")
        super().save(*args, **kwargs)

    @staticmethod
    def generate_token():
        return secrets.token_urlsafe(48)  # exactly 64 chars

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    @property
    def is_download_limit_reached(self):
        return self.max_downloads is not None and self.download_count >= self.max_downloads

    @property
    def is_active(self):
        if self.is_revoked:
            return False
        if self.is_expired:
            return False
        if self.file.is_deleted:
            return False
        # Edge case: file owner account was deactivated or soft-deleted
        if not self.file.owner.is_active:
            return False
        if self.is_download_limit_reached:
            return False
        return True


class ShareAccessLog(models.Model):
    """
    Immutable audit log for every view and download event on a shared file.
    Separate from the denormalized download_count/first_accessed_at on FileShare
    — those are fast summary fields; this gives full history.
    """
    ACTION_VIEW     = 'view'
    ACTION_DOWNLOAD = 'download'
    ACTION_CHOICES  = [
        (ACTION_VIEW,     'View'),
        (ACTION_DOWNLOAD, 'Download'),
    ]

    share      = models.ForeignKey(FileShare, on_delete=models.CASCADE, related_name='access_logs')
    action     = models.CharField(max_length=10, choices=ACTION_CHOICES)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    accessed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-accessed_at']
        indexes = [
            models.Index(fields=['share', 'action']),
            models.Index(fields=['accessed_at']),
        ]

    def __str__(self):
        return f"{self.action} on {self.share} at {self.accessed_at}"