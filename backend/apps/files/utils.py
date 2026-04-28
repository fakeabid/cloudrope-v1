import boto3
from django.conf import settings
from django.db.models import Sum
from django.core.mail import send_mail


def get_user_storage_used(user):
    from .models import UserFile
    result = UserFile.objects.filter(
        owner=user,
        is_deleted=False
    ).aggregate(total=Sum('size'))
    return result['total'] or 0


def format_size(size):
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size < 1024:
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TB"


def send_share_email(share):
    access_url = f"{settings.FRONTEND_URL}/shared/{share.token}/"
    hours = int((share.expires_at - share.created_at).total_seconds() // 3600)
    message_part = (
        f"\n\nMessage from {share.shared_by.get_full_name()}:\n{share.message}"
        if share.message else ""
    )
    send_mail(
        subject=f"{share.shared_by.get_full_name()} shared a file with you on Cloudrope",
        message=(
            f"You've been given access to: {share.file.original_name}\n\n"
            f"Click to view and download: {access_url}\n\n"
            f"This link expires in {hours} hour{'s' if hours != 1 else ''}."
            f"{message_part}"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[share.recipient_email],
        fail_silently=False,
    )


def _get_s3_client():
    import boto3
    return boto3.client(
        's3',
        region_name=settings.AWS_S3_REGION_NAME,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )


def get_presigned_download_url(file_obj, expiration=900):
    s3_client = _get_s3_client()
    return s3_client.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
            'Key': file_obj.file.name,
            # Forces browser to download rather than render
            'ResponseContentDisposition': f'attachment; filename="{file_obj.original_name}"',
            'ResponseContentType': file_obj.mime_type,
        },
        ExpiresIn=expiration,
    )


def get_presigned_view_url(file_obj, expiration=900):
    """
    Returns a pre-signed URL without the attachment disposition header —
    browser will render inline if it can (PDF, image etc.) rather than download.
    Used for allow_download=False shares.
    """
    s3_client = _get_s3_client()
    return s3_client.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
            'Key': file_obj.file.name,
            'ResponseContentDisposition': f'inline; filename="{file_obj.original_name}"',
            'ResponseContentType': file_obj.mime_type,
        },
        ExpiresIn=expiration,
    )