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

api.interceptors.request.use(async (config) => {
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

export function formatErrorMessage(err: any): string {
  if (!err) return 'An unexpected error occurred.';
  const detail = err.response?.data?.detail ?? err.response?.data?.message;
  if (Array.isArray(detail)) {
    return detail
      .map((d: any) => {
        if (typeof d === 'string') return d;
        if (d?.msg) {
          const loc = Array.isArray(d.loc) ? d.loc.filter((l: any) => l !== 'body').join('.') : '';
          return loc ? `${loc}: ${d.msg}` : d.msg;
        }
        return JSON.stringify(d);
      })
      .join('\n');
  }
  if (typeof detail === 'string') return detail;
  if (typeof detail === 'object' && detail !== null) return JSON.stringify(detail);
  return err.message || 'An unexpected error occurred.';
}

export { api };
export default api;
