import os
import magic
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.db import transaction
from rest_framework import serializers

from .models import UserFile, FileShare, get_user_storage_summary

ALLOWED_MIME_TYPES = {
    'image/jpeg',
    'image/png',
    'application/pdf',
    'text/plain',
    'application/zip'
}

from django.contrib.auth import get_user_model
User = get_user_model()

# File Upload Serializers

class FileUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserFile
        fields = ['id', 'file', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']

    def validate_file(self, file):
        request = self.context.get('request')
        user = request.user

        if file.size > settings.MAX_FILE_SIZE:
            raise serializers.ValidationError("File exceeds maximum size limit.")

        mime = magic.from_buffer(file.read(2048), mime=True)
        file.seek(0)
        if mime not in ALLOWED_MIME_TYPES:
            raise serializers.ValidationError(f"File type '{mime}' is not allowed.")
        file._detected_mime = mime

        try:
            with transaction.atomic():
                from django.contrib.auth import get_user_model
                User = get_user_model()
                User.objects.select_for_update().get(pk=user.pk)

                usage_data = get_user_storage_summary(user)
                current_usage = usage_data['used'] + usage_data['trash']
    
                if current_usage + file.size > settings.MAX_USER_STORAGE:
                    raise serializers.ValidationError(
                        "Storage quota exceeded. Please delete files or empty your trash."
                    )
        except serializers.ValidationError:
            raise
        except Exception as e:
            raise serializers.ValidationError("Could not verify storage available")

        return file

    def create(self, validated_data):
        request = self.context.get('request')
        file = validated_data.get('file')
        mime = file._detected_mime

        original_name = os.path.basename(file.name)

        validated_data['owner'] = request.user
        validated_data['original_name'] = original_name
        validated_data['size'] = file.size
        validated_data['mime_type'] = mime
        return super().create(validated_data)


class FileListSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    size_display = serializers.SerializerMethodField()

    class Meta:
        model = UserFile
        fields = [
            'id',
            'original_name',
            'size',
            'size_display',
            'mime_type',
            'is_favorite',
            'uploaded_at',
            'is_deleted',
            'deleted_at',
            'file_url'
        ]

    def get_file_url(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.file.url)

    def get_size_display(self, obj):
        size = obj.size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"
    

# File Sharing Serializers

class FileShareCreateSerializer(serializers.Serializer):
    emails = serializers.ListField(
        child=serializers.EmailField(), 
        min_length=1, max_length=20)
    expiration_hours = serializers.IntegerField(required=False, min_value=1, max_value=168)
    max_downloads = serializers.IntegerField(
        required=False,
        min_value=1,
        allow_null=True
    )
    max_views = serializers.IntegerField(
        required=False, 
        min_value=1, 
        allow_null=True
    )

    def validate_emails(self, emails):
        cleaned = list({e.strip().lower() for e in emails if e.strip()})
        return cleaned

    def create(self, validated_data):
        request = self.context['request']
        file_obj = self.context['file']

        expires_at = None
        if 'expiration_hours' in validated_data:
            expires_at = timezone.now() + timedelta(
                hours=validated_data['expiration_hours']
            )

        shares = []
        for email in validated_data['emails']:
            recipient_user = User.objects.filter(email=email).first()
            share = FileShare.objects.create(
                file=file_obj,
                shared_by=request.user,
                shared_with_email=email,
                shared_with_user=recipient_user,
                expires_at=expires_at,
                max_downloads=validated_data.get('max_downloads'),
                max_views=validated_data.get('max_views'),
            )
            shares.append(share)
        return shares
    

class FileShareListSerializer(serializers.ModelSerializer):
    file_name = serializers.CharField(source='file.original_name', read_only=True)
    status = serializers.SerializerMethodField()
    is_viewed         = serializers.SerializerMethodField()

    class Meta:
        model = FileShare
        fields = [
            'id', 'file_name', 'token', 'created_at', 'expires_at',
            'status', 'shared_with_email',
            'max_downloads', 'download_count',
            'max_views', 'view_count',
            'is_viewed', 'first_viewed_at',
            'first_accessed_at'
        ]

    def get_status(self, obj):
        if obj.is_revoked:  return 'revoked'
        if obj.is_expired:  return 'expired'
        if obj.is_download_limit_reached and obj.is_view_limit_reached: return 'exhausted'
        return 'active'

    def get_is_viewed(self, obj):
        return obj.first_viewed_at is not None