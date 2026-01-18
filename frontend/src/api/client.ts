import axios from 'axios';
import type { ApiError } from '@/types/api';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for logging (development only)
apiClient.interceptors.request.use(
  config => {
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

export default apiClient;
