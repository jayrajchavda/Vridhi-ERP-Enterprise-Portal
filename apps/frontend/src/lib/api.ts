import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle auth errors and global error toasts
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;
    const message = error.response?.data?.error?.message;

    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (status === 403) {
      toast.error('Access Denied', { description: 'You do not have permission to perform this action.' });
    } else if (status === 429) {
      toast.error('Too Many Requests', { description: 'Please wait a moment before trying again.' });
    } else if (status === 500) {
      toast.error('Server Error', { description: message || 'An unexpected server error occurred.' });
    }
    // Expose structured error for consuming code
    const structuredError = { status, code, message, details: error.response?.data?.error?.details };
    return Promise.reject(structuredError);
  }
);
