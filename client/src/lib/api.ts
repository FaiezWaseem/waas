import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Proxy through Next.js API routes
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login if unauthorized
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
