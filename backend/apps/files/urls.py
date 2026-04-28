from django.urls import path
from .views import (
    FileUploadView, FileListView, FileDeleteView, FileDownloadView,
    FileShareCreateView, SharedFileListView, RevokeShareView,
    SharedFileAccessView, SharedFileDownloadView,
)

urlpatterns = [
    # Authenticated file management
    path('',                          FileListView.as_view(),       name='file_list'),
    path('upload/',                   FileUploadView.as_view(),     name='file_upload'),
    path('<int:pk>/delete/',          FileDeleteView.as_view(),     name='file_delete'),
    path('<int:pk>/download/',        FileDownloadView.as_view(),   name='file_download'),
    path('<int:pk>/share/',           FileShareCreateView.as_view(),name='file_share'),

    # Share management
    path('shares/',                         SharedFileListView.as_view(), name='share_list'),
    path('shares/<int:share_id>/revoke/',   RevokeShareView.as_view(),    name='share_revoke'),

    # Unauthenticated shared access
    path('shared/<str:token>/',             SharedFileAccessView.as_view(),   name='shared_access'),
    path('shared/<str:token>/download/',    SharedFileDownloadView.as_view(), name='shared_download'),
]