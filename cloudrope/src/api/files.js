import api, { BASE_URL } from './axios';
import axios from 'axios';

export const filesAPI = {
  list: () => api.get('/files/'),
  upload: (formData, onUploadProgress) =>
    api.post('/files/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),
  delete: (id) => api.delete(`/files/${id}/delete/`),

  // Trash
  trash: () => api.get('/files/trash/'),
  restore: (id) => api.post(`/files/${id}/restore/`),
  permanentDelete: (id) => api.delete(`/files/${id}/permanent-delete/`),

  // Shares
  share: (id, data) => api.post(`/files/${id}/share/`, data),
  listShares: () => api.get('/files/shares/'),
  revokeShare: (id) => api.post(`/files/shares/${id}/revoke/`),

  // Public shared file — no auth header needed, plain axios
  getSharedFile: (token) =>
    axios.get(`${BASE_URL}/files/shared/${token}/`),
};
