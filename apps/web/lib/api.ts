import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

let _cachedToken: string | null = null;
let _tokenExpiry: number = 0;

api.interceptors.request.use(async (config) => {
  const now = Date.now();
  if (_cachedToken && now < _tokenExpiry) {
    config.headers.Authorization = `Bearer ${_cachedToken}`;
    return config;
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? null;
  if (token) {
    _cachedToken = token;
    _tokenExpiry = now + 4 * 60 * 1000; // Cache for 4 minutes
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      console.error("401 Unauthorized API Call:", error.config?.url);
      // Temporarily disabled automatic signout to debug the login loop
      // await supabase.auth.signOut();
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
