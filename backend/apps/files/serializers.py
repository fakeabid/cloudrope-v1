import os

import magic
from datetime import timedelta

from django.utils import timezone
from django.db import transaction
from rest_framework import serializers

from .models import FileShare, UserFile
from .utils import get_user_storage_used, format_size

MAX_FILE_SIZE    = 100 * 1024 * 1024
MAX_USER_STORAGE = 1  * 1024 * 1024 * 1024
MAX_FILES_PER_UPLOAD = 5

BLOCKED_MIME_TYPES = {
    'application/x-msdownload',
    'application/x-sh',
    'application/x-bat',
}


class FileUploadSerializer(serializers.Serializer):
    files = serializers.ListField(
        child=serializers.FileField(),
        allow_empty=False,
    )

    def validate_files(self, files):
        if len(files) > MAX_FILES_PER_UPLOAD:
            raise serializers.ValidationError(
                f"You can upload a maximum of {MAX_FILES_PER_UPLOAD} files at once."
            )
        
        for f in files:
            mime = magic.from_buffer(f.read(2048), mime=True)
            f.seek(0)
            if mime in BLOCKED_MIME_TYPES:
                raise serializers.ValidationError(
                    f"'{f.name}': file type '{mime}' is not allowed."
                )
            
        user = self.context['request'].user
        errors = []

        with transaction.atomic():
            # Lock the user row so concurrent uploads can't both pass the quota check
            user.__class__.objects.select_for_update().get(pk=user.pk)
            storage_used = get_user_storage_used(user)

            for f in files:
                if f.size > MAX_FILE_SIZE:
                    errors.append(f"'{f.name}' exceeds the 100MB file size limit.")
                elif storage_used + f.size > MAX_USER_STORAGE:
                    errors.append(
                        f"'{f.name}' would exceed your 1GB storage limit. "
                        f"You have {format_size(MAX_USER_STORAGE - storage_used)} remaining."
                    )
                else:
                    storage_used += f.size

        if errors:
            raise serializers.ValidationError(errors)

        return files

    def create(self, validated_data):
        user = self.context['request'].user
        uploaded = []

        try:
            with transaction.atomic():
                for f in validated_data['files']:
                    mime = magic.from_buffer(f.read(2048), mime=True)
                    f.seek(0)

                    safe_name = os.path.basename(f.name).replace('"', '').strip() or 'untitled'
                    
                    user_file = UserFile.objects.create(
                        owner=user,
                        original_name=safe_name,
                        file=f,
                        size=f.size,
                        mime_type=mime,
                    )
                    uploaded.append(user_file)
        except Exception:
            # Clean up any S3 objects that were written before the failure
            for uf in uploaded:
                try:
                    uf.file.delete(save=False)
                except Exception:
                    pass
            raise

        return uploaded


class FileListSerializer(serializers.ModelSerializer):
    size_display = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()

    class Meta:
        model  = UserFile
        fields = (
            'id', 'original_name', 'size', 'size_display',
            'mime_type', 'uploaded_at', 'download_url',
        )

    def get_size_display(self, obj):
        return format_size(obj.size)

    def get_download_url(self, obj):
        return self.context['request'].build_absolute_uri(f'/files/{obj.id}/download/')


class FileShareCreateSerializer(serializers.Serializer):
    recipient_email  = serializers.EmailField()
    expiration_hours = serializers.IntegerField(min_value=1, max_value=720)
    message          = serializers.CharField(required=False, allow_blank=True, max_length=1000)
    max_downloads    = serializers.IntegerField(required=False, min_value=1, allow_null=True)
    allow_download   = serializers.BooleanField(default=True)

    def validate(self, data):
        file_obj = self.context['file']
        user     = self.context['request'].user

        # Explicit ownership check in the serializer as a second line of defense.
        # The view already does get_object_or_404(owner=request.user), but
        # serializers can be reused and the view guard shouldn't be the only safeguard.
        if file_obj.owner != user:
            raise serializers.ValidationError("You do not have permission to share this file.")

        if file_obj.is_deleted:
            raise serializers.ValidationError("Cannot share a deleted file.")

        # Prevent sharing with yourself — not a security issue but a logical one
        if data['recipient_email'].lower() == user.email.lower():
            raise serializers.ValidationError("You cannot share a file with yourself.")

        return data

    def create(self, validated_data):
        from .utils import send_share_email
        expiration_hours = validated_data.pop('expiration_hours')

        share = FileShare.objects.create(
            file=self.context['file'],
            shared_by=self.context['request'].user,
            # token is auto-generated in FileShare.save() — no need to pass it
            expires_at=timezone.now() + timedelta(hours=expiration_hours),
            **validated_data,
        )
        send_share_email(share)
        return share


class FileShareListSerializer(serializers.ModelSerializer):
    file_name      = serializers.CharField(source='file.original_name', read_only=True)
    time_remaining = serializers.SerializerMethodField()
    status         = serializers.SerializerMethodField()

    class Meta:
        model  = FileShare
        fields = (
            'id', 'file_name', 'recipient_email', 'message',
            'created_at', 'expires_at', 'time_remaining', 'status',
            'first_accessed_at', 'download_count', 'max_downloads',
            'allow_download', 'is_revoked',
        )

    def get_time_remaining(self, obj):
        if obj.is_expired or obj.is_revoked:
            return None
        delta         = obj.expires_at - timezone.now()
        total_seconds = int(delta.total_seconds())
        hours, rem    = divmod(total_seconds, 3600)
        minutes       = rem // 60
        return f"{hours}h {minutes}m"

    def get_status(self, obj):
        if obj.is_revoked:
            return 'revoked'
        if obj.is_expired:
            return 'expired'
        if obj.is_download_limit_reached:
            return 'limit_reached'
        if obj.download_count > 0:
            return 'downloaded'
        if obj.first_accessed_at:
            return 'opened'
        return 'pending'


class SharedFileAccessSerializer(serializers.ModelSerializer):
    file_name      = serializers.CharField(source='file.original_name', read_only=True)
    file_size      = serializers.IntegerField(source='file.size', read_only=True)
    file_mime_type = serializers.CharField(source='file.mime_type', read_only=True)
    shared_by      = serializers.CharField(source='shared_by.get_full_name', read_only=True)
    download_url   = serializers.SerializerMethodField()

    class Meta:
        model  = FileShare
        fields = (
            'file_name', 'file_size', 'file_mime_type',
            'shared_by', 'message', 'expires_at',
            'allow_download', 'download_url',
        )

    def get_download_url(self, obj):
        if not obj.allow_download:
            return None
        return self.context['request'].build_absolute_uri(f'/files/shared/{obj.token}/download/')