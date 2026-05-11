import api, { BASE_URL } from './axios';
import axios from 'axios';

export const authAPI = {
  register: (data) => api.post('/auth/register/', data),
  login: (data) => api.post('/auth/login/', data),
  logout: (refresh) => api.post('/auth/logout/', { refresh }),
  me: () => api.get('/auth/me/'),
  // These use axios directly as they're called before auth may exist,
  // and go through the same proxy in dev (relative URL)
  verifyEmail: (token) =>
    axios.get(`${BASE_URL}/auth/verify-email/?token=${token}`),
  resendVerification: (email) =>
    axios.post(`${BASE_URL}/auth/resend-verification/`, { email }),
  forgotPassword: (email) =>
    axios.post(`${BASE_URL}/auth/password-reset/`, { email }),
  resetPassword: (data) =>
    axios.post(`${BASE_URL}/auth/password-reset/confirm/`, data),
  deleteAccount: (data) => api.post('/auth/delete-account/', data),
};
