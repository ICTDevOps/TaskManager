import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect on 401 if it's an auth token issue (not a password validation error)
    if (error.response?.status === 401) {
      const isPasswordEndpoint = error.config?.url?.includes('/auth/password') ||
                                  error.config?.url?.includes('/auth/email');

      // Don't auto-logout for password/email change endpoints
      if (!isPasswordEndpoint) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Redirect to appropriate login page
        const isAdminPage = window.location.pathname.startsWith('/admin');
        window.location.href = isAdminPage ? '/admin/login' : '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
