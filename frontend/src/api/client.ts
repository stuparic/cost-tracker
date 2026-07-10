import axios from 'axios';
import type { ApiError } from '@/types/api';
import { firebaseAuth } from '@/firebase';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach the Firebase ID token to every request (refreshes automatically when stale)
apiClient.interceptors.request.use(
  async config => {
    const user = firebaseAuth.currentUser;
    if (user) {
      config.headers.Authorization = `Bearer ${await user.getIdToken()}`;
    }
    if (import.meta.env.VITE_ENABLE_LOGS === 'true') {
      console.log('API Request:', config.method?.toUpperCase(), config.url);
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    if (error.response) {
      const apiError: ApiError = error.response.data;
      console.error('API Error:', apiError.message);
    } else if (error.request) {
      console.error('Network Error: No response received');
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * Extracts a user-facing message from an API error, falling back to the
 * provided default when the error has no response payload.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as ApiError | undefined)?.message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }
  return fallback;
}

export default apiClient;
