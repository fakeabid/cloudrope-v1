from django.core.mail import send_mail
from django.conf import settings as django_settings


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


from django.core.mail import send_mail
from django.conf import settings as django_settings

def send_share_email(share, request):
    share_url = request.build_absolute_uri(f"/shared/{share.token}/")
    sender_name = share.shared_by.get_full_name()
    file_name = share.file.original_name

    send_mail(
        subject=f"{sender_name} shared a file with you: {file_name}",
        message=(
            f"{sender_name} has shared '{file_name}' with you on Cloudrope.\n\n"
            f"Access it here: {share_url}\n\n"
            + (f"This link expires at {share.expires_at.strftime('%Y-%m-%d %H:%M UTC')}.\n" if share.expires_at else "")
            + (f"Download limit: {share.max_downloads}.\n" if share.max_downloads else "")
        ),
        from_email=django_settings.DEFAULT_FROM_EMAIL,
        recipient_list=[share.shared_with_email],
        fail_silently=True,
    )