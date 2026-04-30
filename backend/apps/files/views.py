from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from django.shortcuts import get_object_or_404
from django.http import FileResponse

from .models import UserFile
from .serializers import FileUploadSerializer, FileListSerializer
from .permissions import IsFileOwner


class FileUploadView(APIView):
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated, IsFileOwner]

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
    permission_classes = [IsAuthenticated, IsFileOwner]

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
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated, IsFileOwner]

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
    permission_classes = [IsAuthenticated, IsFileOwner]

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