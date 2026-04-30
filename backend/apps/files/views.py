from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny

from django.shortcuts import get_object_or_404
from django.http import FileResponse

from .models import UserFile, FileShare
from .permissions import IsFileOwner
from .serializers import (
    FileUploadSerializer,
    FileListSerializer,
    FileShareCreateSerializer
)


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


class FileDownloadView(APIView):
    permission_classes = (IsAuthenticated, IsFileOwner)

    def get(self, request, pk):
        file_obj = get_object_or_404(
            UserFile,
            pk=pk,
            owner=request.user,
            is_deleted=False
        )
        self.check_object_permissions(request, file_obj)

        return FileResponse(file_obj.file.open('rb'), as_attachment=True)
    

class FileDeleteView(APIView):
    permission_classes = (IsAuthenticated, IsFileOwner)

    def delete(self, request, pk):
        file_obj = get_object_or_404(
            UserFile,
            pk=pk,
            owner=request.user,
            is_deleted=False
        )
        self.check_object_permissions(request, file_obj)
        file_obj.soft_delete()

        return Response(
            {"message": "File moved to trash."},
            status=status.HTTP_204_NO_CONTENT
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
    permission_classes = (IsAuthenticated, IsFileOwner)

    def post(self, request, pk):
        file_obj = get_object_or_404(
            UserFile,
            pk=pk,
            owner=request.user,
            is_deleted=True
        )
        self.check_object_permissions(request, file_obj)
        file_obj.restore()

        return Response(
            {"message": "File restored successfully."},
            status=status.HTTP_200_OK
        )
    

class FilePermanentDeleteView(APIView):
    permission_classes = (IsAuthenticated, IsFileOwner)

    def delete(self, request, pk):
        file_obj = get_object_or_404(
            UserFile,
            pk=pk,
            owner=request.user,
            is_deleted=True 
        )
        self.check_object_permissions(request, file_obj)
        file_obj.hard_delete()

        return Response(
            {"message": "File permanently deleted."},
            status=status.HTTP_204_NO_CONTENT
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
            share = serializer.save()

            share_url = request.build_absolute_uri(
                f"/files/shared/{share.token}/"
            )

            return Response({
                "share_url": share_url,
                "expires_at": share.expires_at
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

class SharedFileAccessView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request, token):
        share = get_object_or_404(FileShare, token=token)

        if share.is_expired:
            return Response(
                {"error": "This link has expired."},
                status=status.HTTP_410_GONE
            )

        file_obj = share.file

        return Response({
            "file_name": file_obj.original_name,
            "file_size": file_obj.size,
            "mime_type": file_obj.mime_type,
            "download_url": request.build_absolute_uri(
                f"/files/shared/{token}/download/"
            )
        })
    

class SharedFileDownloadView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request, token):
        share = get_object_or_404(FileShare, token=token)

        if share.is_expired:
            return Response(
                {"error": "This link has expired."},
                status=status.HTTP_410_GONE
            )

        return FileResponse(
            share.file.file.open('rb'),
            as_attachment=True
        )