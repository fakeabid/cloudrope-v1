from django.urls import path
from .views import FileUploadView, FileListView, FileDownloadView

urlpatterns = [
    path('', FileListView.as_view(), name='file_list'),
    path('upload/', FileUploadView.as_view(), name='file_upload'),
    path('<int:pk>/download/', FileDownloadView.as_view(), name='file_download'),
]