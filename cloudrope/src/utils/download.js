import api from '../api/axios';
import toast from 'react-hot-toast';

/**
 * Download a protected file via Axios (so the Authorization header is sent),
 * then trigger a browser save-as using a temporary object URL.
 *
 * @param {number} fileId
 * @param {string} fileName  — used as the suggested save name
 */
export async function downloadFile(fileId, fileName) {
  try {
    const response = await api.get(`/files/${fileId}/download/`, {
      responseType: 'blob',
    });

    // Extract filename from Content-Disposition if available, fall back to prop
    const disposition = response.headers['content-disposition'] || '';
    const match = disposition.match(/filename[^;=\n]*=(['"]?)([^'";\n]+)\1/);
    const suggestedName = match?.[2] || fileName;

    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    const status = err.response?.status;
    if (status === 403) toast.error('You don\'t have permission to download this file.');
    else if (status === 404) toast.error('File not found or has been deleted.');
    else toast.error('Download failed. Please try again.');
  }
}
