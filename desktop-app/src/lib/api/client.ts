import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { routes } from '@/config/routes';
import { clearStoredSession, getStoredToken } from '@/lib/auth/session';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getStoredToken();

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (import.meta.env.DEV) {
      console.log('API Request:', config.method?.toUpperCase(), config.url);
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log('API Response:', response.config.url, response.data);
    }

    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;

      if (status === 401) {
        console.error('Unauthorized request. Redirecting to login.');
        clearStoredSession();
        window.location.assign(routes.login);
      }

      if (status === 403) {
        console.error('Forbidden request. Insufficient permissions.');
      }

      if (status === 404) {
        console.error('API resource not found:', error.config?.url);
      }

      if (status === 500) {
        console.error('Server error while processing API request.');
      }

      if (import.meta.env.DEV) {
        console.error('API Error:', {
          url: error.config?.url,
          status,
          data: error.response.data,
        });
      }
    } else if (error.request) {
      console.error('Network error. Check the backend server or your connection.');
    }

    return Promise.reject(error);
  },
);

export default apiClient;
