import axios from 'axios';

// In dev, Vite proxies /auth and /files to http://localhost:8000
// In production, set VITE_API_BASE to your backend origin.
export const BASE_URL = import.meta.env.VITE_API_BASE || '';

const api = axios.create({
  baseURL: BASE_URL,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const tokens = JSON.parse(localStorage.getItem('cr_tokens') || 'null');
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
}

// Handle 401 — try silent token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const tokens = JSON.parse(localStorage.getItem('cr_tokens') || 'null');
        if (!tokens?.refresh) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE_URL}/auth/token/refresh/`, {
          refresh: tokens.refresh,
        });

        const newTokens = { access: data.access, refresh: data.refresh };
        localStorage.setItem('cr_tokens', JSON.stringify(newTokens));
        if (data.user) localStorage.setItem('cr_user', JSON.stringify(data.user));

        api.defaults.headers.common.Authorization = `Bearer ${data.access}`;
        originalRequest.headers.Authorization = `Bearer ${data.access}`;

        processQueue(null, data.access);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('cr_tokens');
        localStorage.removeItem('cr_user');
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
