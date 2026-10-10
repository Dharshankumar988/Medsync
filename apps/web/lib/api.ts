import axios, { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { supabase } from './supabase';
import { getBackendBaseUrl, BACKEND_PRESETS, setBackendOverride } from './backend-config';
import { toast } from 'sonner';

const api = axios.create({
  baseURL: getBackendBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '69420',
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
  // Always use the latest active backend URL (Render or Portable Runner)
  config.baseURL = getBackendBaseUrl();

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

  // When sending FormData, remove Content-Type so browser/axios sets multipart/form-data with the correct boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
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
    
    // Automatic Failover between Render Cloud and Portable Runner on connection failure
    const config = error.config as any;
    const isConnectionError = !error.response || [502, 503, 504].includes(error.response?.status);
    const autoFailoverEnabled = typeof window !== 'undefined' ? localStorage.getItem('medsync_auto_failover') !== 'false' : true;

    if (autoFailoverEnabled && config && !config._isFailoverRetry && isConnectionError && typeof window !== 'undefined') {
      const currentUrl = getBackendBaseUrl();
      const isCurrentlyRender = currentUrl.includes('onrender.com');
      const failoverTarget = isCurrentlyRender 
        ? BACKEND_PRESETS.portable.url 
        : BACKEND_PRESETS.render.url;

      config._isFailoverRetry = true;
      config.baseURL = failoverTarget;

      try {
        console.warn(`[Failover] Primary backend (${currentUrl}) unreachable. Retrying with ${failoverTarget}...`);
        const retryRes = await axios(config);
        setBackendOverride(failoverTarget);
        toast.info(`Switched active backend to ${isCurrentlyRender ? 'Portable Runner' : 'Render Cloud'}`);
        return retryRes;
      } catch (retryErr) {
        // Both endpoints failed; proceed with original error
      }
    }

    if (error.response?.status === 401 && typeof window !== 'undefined') {
      console.error("401 Unauthorized API Call:", error.config?.url);
    }
    return Promise.reject(error);
  }
);

// Helper to wrap axios get to actually populate pendingRequests and handle caching
const originalGet = api.get;
// @ts-ignore
api.get = async function(url: string, config?: any) {
  const cacheKey = `${url}?${new URLSearchParams(config?.params || {}).toString()}`;
  
  // 1. Check Cache
  const now = Date.now();
  const cached = responseCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return Promise.resolve({
      data: cached.data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: config || {},
      request: {}
    });
  }

  // 2. Check Pending Requests (Deduplication)
  if (!pendingRequests.has(cacheKey)) {
    const reqPromise = originalGet.call(this, url, config) as Promise<AxiosResponse>;
    pendingRequests.set(cacheKey, reqPromise);
  }
  return pendingRequests.get(cacheKey);
};

export default api;
