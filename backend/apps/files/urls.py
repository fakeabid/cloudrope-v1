from django.urls import path
from .views import (
    FileUploadView, 
    FileListView, 
    FileDownloadView, 
    FileDeleteView,
    TrashListView,
    FileRestoreView,
    FilePermanentDeleteView
)

urlpatterns = [
    path('', FileListView.as_view(), name='file_list'),
    path('upload/', FileUploadView.as_view(), name='file_upload'),
    path('<int:pk>/download/', FileDownloadView.as_view(), name='file_download'),
    path('<int:pk>/delete/', FileDeleteView.as_view(), name='file_delete'),
    path('trash/', TrashListView.as_view(), name='file_trash'),
    path('<int:pk>/restore/', FileRestoreView.as_view(), name='file_restore'),
    path('<int:pk>/permanent-delete/', FilePermanentDeleteView.as_view(), name='file_permanent_delete'),
]