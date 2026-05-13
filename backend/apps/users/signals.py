import logging
import os
import shutil

from django.conf import settings
from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import CloudropeUser

logger = logging.getLogger(__name__)


@receiver(post_delete, sender=CloudropeUser)
def cleanup_avatar_on_delete(sender, instance, **kwargs):
    try:
        if instance.avatar:
            instance.avatar.delete(save=False)

        avatar_dir = os.path.join(
            settings.MEDIA_ROOT,
            "avatars",
            str(instance.id)
        )

        if os.path.exists(avatar_dir):
            shutil.rmtree(avatar_dir, ignore_errors=True)

    except Exception as e:
        logger.error(
            f"Error deleting avatar for user {instance.id}: {e}"
        )