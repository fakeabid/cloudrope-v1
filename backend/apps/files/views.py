from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.utils import timezone 
from django.http import FileResponse
from django.db.models import F

from .models import UserFile, FileShare, ShareAccessLog, VIEWABLE_MIME_TYPES
from .serializers import (
    FileUploadSerializer,
    FileListSerializer,
    FileShareCreateSerializer,
    FileShareListSerializer
)
from .utils import get_client_ip, send_share_email


# File Views

class FileUploadView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        serializer = FileUploadSerializer(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():
            file_obj = serializer.save()
            return Response(
                FileListSerializer(file_obj, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FileListView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        files = UserFile.objects.filter(
            owner=request.user,
            is_deleted=False
        ).order_by('-uploaded_at')

        serializer = FileListSerializer(
            files,
            many=True,
            context={'request': request}
        )

        return Response(serializer.data, status=status.HTTP_200_OK)


class FileToggleFavoriteView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, pk):
        file_obj = get_object_or_404(
            UserFile,
            pk=pk,
            owner=request.user,
            is_deleted=False
        )

        file_obj.toggle_favorite()

        return Response(
            {
                "message": "Favorite status updated.",
                "is_favorite": file_obj.is_favorite
            },
            status=status.HTTP_200_OK
        )


class FileDownloadView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, pk):
        file_obj = get_object_or_404(
            UserFile,
            pk=pk,
            owner=request.user,
            is_deleted=False
        )

        return FileResponse(
            file_obj.file.open('rb'), 
            as_attachment=True, 
            filename=file_obj.original_name
        )
    

class FileDeleteView(APIView):
    permission_classes = (IsAuthenticated,)

    def delete(self, request, pk):
        file_obj = get_object_or_404(
            UserFile,
            pk=pk,
            owner=request.user,
            is_deleted=False
        )
        file_obj.soft_delete()

        return Response(
            {"message": "File moved to trash."},
            status=status.HTTP_200_OK
        )


class TrashListView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        files = UserFile.objects.filter(
            owner=request.user,
            is_deleted=True
        ).order_by('-deleted_at')

        serializer = FileListSerializer(
            files,
            many=True,
            context={'request': request}
        )

        return Response(serializer.data, status=status.HTTP_200_OK)
    

class FileRestoreView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, pk):
        file_obj = get_object_or_404(
            UserFile,
            pk=pk,
            owner=request.user,
            is_deleted=True
        )
        file_obj.restore()

        return Response(
            {"message": "File restored successfully."},
            status=status.HTTP_200_OK
        )
    

class FilePermanentDeleteView(APIView):
    permission_classes = (IsAuthenticated,)

    def delete(self, request, pk):
        file_obj = get_object_or_404(
            UserFile,
            pk=pk,
            owner=request.user,
            is_deleted=True 
        )
        file_obj.hard_delete()

        return Response(
            {"message": "File permanently deleted."},
            status=status.HTTP_200_OK
        )
    

# File Share Views

class FileShareCreateView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, pk):
        file_obj = get_object_or_404(
            UserFile,
            pk=pk,
            owner=request.user,
            is_deleted=False
        )

        serializer = FileShareCreateSerializer(
            data=request.data,
            context={'request': request, 'file': file_obj}
        )

        if serializer.is_valid():
            shares = serializer.save()

            for share in shares:
                send_share_email(share, request)

            return Response(
                FileShareListSerializer(shares, many=True).data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

class SharedFileAccessView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request, token):
        share = get_object_or_404(FileShare, token=token)

        if share.is_revoked:
            return Response(
                {"error": "This link has been revoked."},
                status=status.HTTP_403_FORBIDDEN
            )

        if share.is_expired:
            return Response(
                {"error": "This link has expired."},
                status=status.HTTP_410_GONE
            )
        
        FileShare.objects.filter(
            pk=share.pk, 
            first_accessed_at__isnull=True
        ).update(first_accessed_at=timezone.now())

        file_obj = share.file

        ShareAccessLog.objects.create(
            share=share,
            action=ShareAccessLog.Action.ACCESS,
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:512],
        )

        return Response({
            "file_name": file_obj.original_name,
            "file_size": file_obj.size,
            "mime_type": file_obj.mime_type,
            'can_download': share.can_download,
            'can_view':     share.can_view,
            'download_url': request.build_absolute_uri(f"/files/shared/{token}/download/") if share.can_download else None,
            'view_url':     request.build_absolute_uri(f"/files/shared/{token}/view/")     if share.can_view     else None,
        })
    

class SharedFileBrowserView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request, token):
        share = get_object_or_404(FileShare, token=token)

        if share.is_revoked:
            return Response({'error': 'This link has been revoked.'}, status=status.HTTP_403_FORBIDDEN)
        if share.is_expired:
            return Response({'error': 'This link has expired.'}, status=status.HTTP_410_GONE)
        if share.file.mime_type not in VIEWABLE_MIME_TYPES:
            return Response({'error': 'This file type cannot be viewed in the browser.'}, status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)
        if share.is_view_limit_reached:
            return Response({'error': 'View limit reached.'}, status=status.HTTP_403_FORBIDDEN)

        # Increment view count atomically
        FileShare.objects.filter(pk=share.pk).update(view_count=F('view_count') + 1)

        # Record first_viewed_at
        FileShare.objects.filter(pk=share.pk, first_viewed_at__isnull=True).update(
            first_viewed_at=timezone.now()
        )

        ShareAccessLog.objects.create(
            share=share,
            action=ShareAccessLog.Action.VIEW,
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:512],
        )

        response = FileResponse(
            share.file.file.open('rb'),
            content_type=share.file.mime_type,
            as_attachment=False,
        )
        response['Content-Disposition'] = f'inline; filename="{share.file.original_name}"'
        return response
    

class SharedFileDownloadView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request, token):
        share = get_object_or_404(FileShare, token=token)

        if share.is_revoked:
            return Response(
                {"error": "This link has been revoked/deleted."},
                status=status.HTTP_403_FORBIDDEN
            )

        if share.is_expired:
            return Response(
                {"error": "This link has expired."},
                status=status.HTTP_410_GONE
            )
        
        if share.max_downloads is not None:
            updated = FileShare.objects.filter(
                pk=share.pk,
                download_count__lt=F('max_downloads')
            ).update(download_count=F('download_count') + 1)
            if not updated:
                return Response({"error": "Download limit reached."}, status=status.HTTP_403_FORBIDDEN)
        else:
            FileShare.objects.filter(pk=share.pk).update(
                download_count=F('download_count') + 1
            )

        ShareAccessLog.objects.create(
            share=share,
            action=ShareAccessLog.Action.DOWNLOAD,
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:512],
        )

        return FileResponse(
            share.file.file.open('rb'),
            as_attachment=True,
            filename=share.file.original_name
        )
    

class FileShareListView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        shares = FileShare.objects.filter(
            shared_by=request.user
        ).order_by('-created_at')

        serializer = FileShareListSerializer(shares, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    

class FileShareRevokeView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, share_id):
        share = get_object_or_404(
            FileShare,
            pk=share_id,
            shared_by=request.user
        )

        if share.is_revoked:
            return Response(
                {"error": "Share already revoked."},
                status=status.HTTP_400_BAD_REQUEST
            )

        share.is_revoked = True
        share.save(update_fields=['is_revoked'])

        return Response(
            {"message": "Share revoked successfully."},
            status=status.HTTP_200_OK
        )