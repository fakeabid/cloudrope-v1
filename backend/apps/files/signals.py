import logging
from django.db.models.signals import post_delete
from django.dispatch import receiver
from .models import UserFile

logger = logging.getLogger(__name__)

@receiver(post_delete, sender=UserFile)
def cleanup_file_on_disk(sender, instance, **kwargs):
    if instance.file:
        try:
            instance.file.delete(save=False)
        except FileNotFoundError:
            logger.warning(f"File already missing from storage: {instance.file.name}")
        except Exception as e:
            logger.error(f"Error deleting file {instance.file.name}: {e}")