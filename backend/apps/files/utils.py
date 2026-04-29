from django.db.models import Sum
from .models import UserFile


def get_user_storage_used(user):
    result = UserFile.objects.filter(owner=user).aggregate(total=Sum('size'))
    return result['total'] or 0