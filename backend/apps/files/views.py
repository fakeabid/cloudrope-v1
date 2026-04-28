from django.db.models import F
from django.http import HttpResponseRedirect
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import generics, filters, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import FileShare, ShareAccessLog, UserFile
from .pagination import FilePagination
from .permissions import IsFileOwner
from .serializers import (
    FileListSerializer,
    FileShareCreateSerializer,
    FileShareListSerializer,
    FileUploadSerializer,
    SharedFileAccessSerializer,
)
from .utils import format_size, get_presigned_download_url, get_presigned_view_url, get_user_storage_used


def get_client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def _validate_share(token):
    """
    Central share validation used by both access and download views.
    Returns (share, error_response) — one of which is always None.
    """
    share = get_object_or_404(FileShare, token=token)

    if share.is_revoked:
        return None, Response({'error': 'This link has been revoked.'}, status=status.HTTP_403_FORBIDDEN)
    if share.is_expired:
        return None, Response({'error': 'This link has expired.'}, status=status.HTTP_410_GONE)
    if share.file.is_deleted:
        return None, Response({'error': 'This file is no longer available.'}, status=status.HTTP_404_NOT_FOUND)
    if not share.file.owner.is_active:
        return None, Response({'error': 'This file is no longer available.'}, status=status.HTTP_404_NOT_FOUND)

    return share, None


class FileUploadView(APIView):
    permission_classes = (IsAuthenticated,)
    parser_classes     = (MultiPartParser, FormParser)

    def post(self, request):
        serializer = FileUploadSerializer(
            data={'files': request.FILES.getlist('files')},
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        uploaded = serializer.save()

        return Response(
            FileListSerializer(uploaded, many=True, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class FileListView(generics.ListAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class   = FileListSerializer
    pagination_class   = FilePagination
    filter_backends    = (filters.SearchFilter, filters.OrderingFilter)
    search_fields      = ('original_name', 'mime_type')
    ordering_fields    = ('uploaded_at', 'size', 'original_name')
    ordering           = ('-uploaded_at',)

    def get_queryset(self):
        return UserFile.objects.filter(owner=self.request.user, is_deleted=False)

    def list(self, request, *args, **kwargs):
        queryset   = self.filter_queryset(self.get_queryset())
        page       = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page, many=True)
        response   = self.get_paginated_response(serializer.data)

        storage_used = get_user_storage_used(request.user)
        response.data['storage'] = {
            'used':          storage_used,
            'limit':         1 * 1024 * 1024 * 1024,
            'used_display':  format_size(storage_used),
            'limit_display': '1.0 GB',
        }
        return response


class FileDeleteView(APIView):
    permission_classes = (IsAuthenticated, IsFileOwner)

    def delete(self, request, pk):
        file_obj = get_object_or_404(UserFile, pk=pk, owner=request.user, is_deleted=False)
        self.check_object_permissions(request, file_obj)
        file_obj.soft_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class FileDownloadView(APIView):
    permission_classes = (IsAuthenticated, IsFileOwner)

    def get(self, request, pk):
        file_obj = get_object_or_404(UserFile, pk=pk, owner=request.user, is_deleted=False)
        self.check_object_permissions(request, file_obj)
        url = get_presigned_download_url(file_obj)
        return HttpResponseRedirect(url)


class FileShareCreateView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, pk):
        file_obj   = get_object_or_404(UserFile, pk=pk, owner=request.user, is_deleted=False)
        serializer = FileShareCreateSerializer(
            data=request.data,
            context={'request': request, 'file': file_obj},
        )
        serializer.is_valid(raise_exception=True)
        share = serializer.save()

        return Response(
            FileShareListSerializer(share).data,
            status=status.HTTP_201_CREATED,
        )


class SharedFileListView(generics.ListAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class   = FileShareListSerializer
    pagination_class   = FilePagination

    def get_queryset(self):
        return (
            FileShare.objects
            .filter(shared_by=self.request.user, file__is_deleted=False)
            .select_related('file', 'file__owner')
        )


class RevokeShareView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, share_id):
        share = get_object_or_404(FileShare, pk=share_id, shared_by=request.user)

        if share.is_revoked:
            return Response(
                {'error': 'This share is already revoked.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        share.is_revoked = True
        share.save(update_fields=['is_revoked'])
        return Response({'message': 'Share revoked successfully.'}, status=status.HTTP_200_OK)


class SharedFileAccessView(APIView):
    """
    Unauthenticated. Returns file metadata for a valid share link.
    Also logs the view event and marks first_accessed_at if unset.
    """
    permission_classes = (AllowAny,)

    def get(self, request, token):
        share, error = _validate_share(token)
        if error:
            return error

        # Mark first access atomically — filter on null prevents overwrite
        # if two requests arrive simultaneously
        if not share.first_accessed_at:
            FileShare.objects.filter(
                pk=share.pk,
                first_accessed_at__isnull=True
            ).update(first_accessed_at=timezone.now())

        # Log the view event
        ShareAccessLog.objects.create(
            share=share,
            action=ShareAccessLog.ACTION_VIEW,
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )

        serializer = SharedFileAccessSerializer(share, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class SharedFileDownloadView(APIView):
    """
    Unauthenticated. Validates the share, enforces download permissions and
    limits, increments download count, logs the event, then redirects to
    a pre-signed S3 URL.
    """
    permission_classes = (AllowAny,)

    def get(self, request, token):
        share, error = _validate_share(token)
        if error:
            return error

        if share.allow_download and share.is_download_limit_reached:
            return Response(
                {'error': 'This link has reached its download limit.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Atomically increment count and set first_accessed_at if needed
        update = {'download_count': F('download_count') + 1}
        if not share.first_accessed_at:
            update['first_accessed_at'] = timezone.now()
        FileShare.objects.filter(pk=share.pk).update(**update)

        # Log the download event
        ShareAccessLog.objects.create(
            share=share,
            action=ShareAccessLog.ACTION_DOWNLOAD,
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )

        url = (
            get_presigned_view_url(share.file)
            if not share.allow_download
            else get_presigned_download_url(share.file)
        )
        return HttpResponseRedirect(url)