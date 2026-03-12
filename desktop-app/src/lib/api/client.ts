/**
 * API Client Configuration
 * Base Axios instance with interceptors
 */
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

// API base URL (your backend)
const BASE_URL = 'http://localhost:5000/api';

// Create axios instance
export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds
});

// Request interceptor (runs BEFORE every API call)
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // If token exists, add to headers
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request in development
    if (import.meta.env.DEV) {
      console.log('📤 API Request:', config.method?.toUpperCase(), config.url);
    }
    
    return config;
  },
  (error: AxiosError) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor (runs AFTER every API call)
apiClient.interceptors.response.use(
  (response) => {
    // Log response in development
    if (import.meta.env.DEV) {
      console.log('📥 API Response:', response.config.url, response.data);
    }
    
    return response;
  },
  (error: AxiosError) => {
    // Handle common errors
    if (error.response) {
      const status = error.response.status;
      
      // 401 Unauthorized - Token expired or invalid
      if (status === 401) {
        console.error('🔒 Unauthorized! Redirecting to login...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      
      // 403 Forbidden
      if (status === 403) {
        console.error('⛔ Forbidden! Insufficient permissions');
      }
      
      // 404 Not Found
      if (status === 404) {
        console.error('🔍 Not Found!', error.config?.url);
      }
      
      // 500 Server Error
      if (status === 500) {
        console.error('💥 Server Error!');
      }
      
      // Log error in development
      if (import.meta.env.DEV) {
        console.error('❌ API Error:', {
          url: error.config?.url,
          status,
          data: error.response.data,
        });
      }
    } else if (error.request) {
      // Network error (no response from server)
      console.error('🌐 Network Error! Check your connection or backend.');
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;