import os
import magic
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from rest_framework import serializers

from .models import UserFile, FileShare
from .utils import get_user_storage_used

ALLOWED_MIME_TYPES = {
    'image/jpeg',
    'image/png',
    'application/pdf',
    'text/plain',
}


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

        used_storage = get_user_storage_used(user)
        if used_storage + file.size > settings.MAX_USER_STORAGE:
            raise serializers.ValidationError("File exceeds maximum size limit.")

        return file

    def create(self, validated_data):
        request = self.context.get('request')
        file = validated_data.get('file')

        original_name = os.path.basename(file.name)

        validated_data['owner'] = request.user
        validated_data['original_name'] = original_name
        validated_data['size'] = file.size
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
            'uploaded_at',
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
    expiration_hours = serializers.IntegerField(required=False, min_value=1, max_value=168)
    max_downloads = serializers.IntegerField(
        required=False,
        min_value=1,
        allow_null=True
    )

    def create(self, validated_data):
        request = self.context['request']
        file_obj = self.context['file']

        expires_at = None
        if 'expiration_hours' in validated_data:
            expires_at = timezone.now() + timedelta(
                hours=validated_data['expiration_hours']
            )

        share = FileShare.objects.create(
            file=file_obj,
            shared_by=request.user,
            expires_at=expires_at,
            max_downloads=validated_data.get('max_downloads')
        )

        return share
    

class FileShareListSerializer(serializers.ModelSerializer):
    file_name = serializers.CharField(source='file.original_name', read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = FileShare
        fields = [
            'id',
            'file_name',
            'token',
            'created_at',
            'expires_at',
            'status'
        ]

    def get_status(self, obj):
        if obj.is_revoked:
            return "revoked"
        if obj.is_expired:
            return "expired"
        return "active"