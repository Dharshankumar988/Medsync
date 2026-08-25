import axios, { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { supabase } from './supabase';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL as string,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

let _cachedToken: string | null = null;
let _tokenExpiry: number = 0;

// Performance Optimization: Deduplication and Caching for GET requests
const pendingRequests = new Map<string, Promise<AxiosResponse>>();
const responseCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds cache for identical GET requests

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const now = Date.now();
  if (_cachedToken && now < _tokenExpiry) {
    config.headers.Authorization = `Bearer ${_cachedToken}`;
  } else {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? null;

      if (token) {
        _cachedToken = token;
        _tokenExpiry = now + 4 * 60 * 1000; // Cache for 4 minutes
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('Could not retrieve Supabase session token:', err);
    }
  }

  // Deduplication and caching logic (only for GET requests)
  if (config.method?.toLowerCase() === 'get' && config.url) {
    const cacheKey = `${config.url}?${new URLSearchParams(config.params || {}).toString()}`;
    
    // 1. Check Cache
    const cached = responseCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL) {
      config.adapter = () => Promise.resolve({
        data: cached.data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        request: {}
      });
      return config;
    }

    // 2. Check Pending Requests (Deduplication)
    if (pendingRequests.has(cacheKey)) {
      config.adapter = () => pendingRequests.get(cacheKey) as Promise<AxiosResponse>;
      return config;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Cache the successful GET response
    if (response.config.method?.toLowerCase() === 'get' && response.config.url) {
      const cacheKey = `${response.config.url}?${new URLSearchParams(response.config.params || {}).toString()}`;
      responseCache.set(cacheKey, { data: response.data, timestamp: Date.now() });
      pendingRequests.delete(cacheKey);
    }
    return response;
  },
  async (error) => {
    if (error.config?.method?.toLowerCase() === 'get' && error.config?.url) {
      const cacheKey = `${error.config.url}?${new URLSearchParams(error.config.params || {}).toString()}`;
      pendingRequests.delete(cacheKey);
    }
    
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      console.error("401 Unauthorized API Call:", error.config?.url);
    }
    return Promise.reject(error);
  }
);

// Helper to wrap axios get to actually populate pendingRequests
const originalGet = api.get;
// @ts-ignore
api.get = async function(url: string, config?: any) {
  const cacheKey = `${url}?${new URLSearchParams(config?.params || {}).toString()}`;
  if (!pendingRequests.has(cacheKey)) {
    const reqPromise = originalGet.call(this, url, config) as Promise<AxiosResponse>;
    pendingRequests.set(cacheKey, reqPromise);
    try {
      const res = await reqPromise;
      return res;
    } catch(e) {
      pendingRequests.delete(cacheKey);
      throw e;
    }
  }
  return pendingRequests.get(cacheKey);
};

export default api;
