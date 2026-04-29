import uuid
from django.db import models
from django.conf import settings


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

    def __str__(self):
        return f"{self.original_name} ({self.owner})"