import axios from 'axios';
import { supabase } from './supabase';

const getBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || 'https://medsync-backend-rktc.onrender.com';
  const cleanUrl = envUrl.trim().replace(/\/+$/, '');
  return cleanUrl.endsWith('/api/v1') ? cleanUrl : `${cleanUrl}/api/v1`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

  // Normalize redundant /api/v1 prefix if callers supply it
  if (config.url?.startsWith('/api/v1/')) {
    config.url = config.url.replace(/^\/api\/v1/, '');
  }

  // Allow browser/RN boundary calculation for FormData requests
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.warn('Could not retrieve Supabase session token for mobile API request:', err);
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.warn('401 Unauthorized API call:', error.config?.url);
    }
    return Promise.reject(error);
  }
);

export { api };
export default api;
