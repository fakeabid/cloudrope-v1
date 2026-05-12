from django.urls import path
from .views import (
    FileUploadView, 
    FileListView, 
    FileDownloadView, 
    FileDeleteView,
    FileToggleFavoriteView,
    TrashListView,
    FileRestoreView,
    FilePermanentDeleteView,
    FileShareCreateView,
    SharedFileAccessView,
    SharedFileDownloadView,
    FileShareListView,
    FileShareRevokeView
)

urlpatterns = [
    path('', FileListView.as_view(), name='file_list'),
    path('upload/', FileUploadView.as_view(), name='file_upload'),
    path('<int:pk>/download/', FileDownloadView.as_view(), name='file_download'),
    path('<int:pk>/favorite/', FileToggleFavoriteView.as_view(), name='file_toggle_favorite'),
    path('<int:pk>/delete/', FileDeleteView.as_view(), name='file_delete'),
    path('trash/', TrashListView.as_view(), name='file_trash'),
    path('<int:pk>/restore/', FileRestoreView.as_view(), name='file_restore'),
    path('<int:pk>/permanent-delete/', FilePermanentDeleteView.as_view(), name='file_permanent_delete'),
    path('<int:pk>/share/', FileShareCreateView.as_view(), name='file_share'),
    path('shared/<str:token>/', SharedFileAccessView.as_view(), name='shared_access'),
    path('shared/<str:token>/download/', SharedFileDownloadView.as_view(), name='shared_download'),
    path('shares/', FileShareListView.as_view(), name='share_list'),
    path('shares/<int:share_id>/revoke/', FileShareRevokeView.as_view(), name='share_revoke'),
]