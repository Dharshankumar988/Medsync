/**
 * MedSync Hybrid Backend Configuration & Switcher
 * Supports Render Cloud Backend (Primary 24/7) and Portable Runner (Static Ngrok Tunnel)
 */

export interface BackendOption {
  id: string;
  name: string;
  url: string;
  type: 'cloud' | 'tunnel' | 'local';
  description: string;
}

export const BACKEND_PRESETS: Record<string, BackendOption> = {
  render: {
    id: 'render',
    name: 'Render Cloud Backend (Primary 24/7)',
    url: 'https://medsync-backend-rktc.onrender.com',
    type: 'cloud',
    description: 'High-availability cloud backend running 24/7 on Render'
  },
  portable: {
    id: 'portable',
    name: 'Portable Runner (Ngrok Static Tunnel)',
    url: 'https://entangled-dealmaker-storable.ngrok-free.dev',
    type: 'tunnel',
    description: 'Connects to whichever laptop is running the portable runner'
  },
  local: {
    id: 'local',
    name: 'Local Developer Backend',
    url: 'http://localhost:8000',
    type: 'local',
    description: 'Direct local connection on localhost:8000'
  }
};

/**
 * Returns the currently active backend base URL (without /api/v1)
 */
export function getBackendBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('medsync_backend_override');
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
    }
  }

  // Fallback to environment variable or Render default
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
  }

  return BACKEND_PRESETS.render.url;
}

/**
 * Returns the active API v1 base URL (with /api/v1)
 */
export function getApiUrl(): string {
  const base = getBackendBaseUrl();
  return `${base}/api/v1`;
}

/**
 * Switches the active backend and dispatches an event
 */
export function setBackendOverride(url: string | null): void {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      const cleanUrl = url.trim().replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
      localStorage.setItem('medsync_backend_override', cleanUrl);
    } else {
      localStorage.removeItem('medsync_backend_override');
    }
    window.dispatchEvent(
      new CustomEvent('medsync-backend-changed', {
        detail: { url: getBackendBaseUrl() }
      })
    );
  }
}

/**
 * Health check helper for testing a backend URL
 */
export async function testBackendHealth(rawUrl: string): Promise<{
  ok: boolean;
  latencyMs: number;
  statusText: string;
  data?: any;
}> {
  const cleanUrl = rawUrl.trim().replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${cleanUrl}/health`, {
      method: 'GET',
      headers: { 'ngrok-skip-browser-warning': '69420' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    const latencyMs = Date.now() - start;

    if (res.ok) {
      const data = await res.json().catch(() => null);
      return { ok: true, latencyMs, statusText: 'Online (200 OK)', data };
    } else {
      return { ok: false, latencyMs, statusText: `HTTP ${res.status}` };
    }
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    const msg = err.name === 'AbortError' ? 'Timeout (8s)' : 'Offline / Unreachable';
    return { ok: false, latencyMs, statusText: msg };
  }
}

/**
 * Synchronizes client backend routing with the Admin's system setting from the database.
 * Non-admin roles (patients, doctors, pharmacies) transparently inherit the Admin's routing.
 */
export async function syncSystemBackendConfig(): Promise<{
  activeMode: string;
  activeUrl: string;
  autoFailover: boolean;
} | null> {
  if (typeof window === 'undefined') return null;

  try {
    const currentBase = getBackendBaseUrl();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    let res: Response | null = null;
    try {
      res = await fetch(`${currentBase}/api/v1/health/system-config`, {
        method: 'GET',
        headers: { 'ngrok-skip-browser-warning': '69420' },
        signal: controller.signal
      });
    } catch {
      if (!currentBase.includes('onrender.com')) {
        res = await fetch(`${BACKEND_PRESETS.render.url}/api/v1/health/system-config`, {
          method: 'GET',
          headers: { 'ngrok-skip-browser-warning': '69420' },
          signal: controller.signal
        }).catch(() => null);
      }
    } finally {
      clearTimeout(timeout);
    }

    if (res && res.ok) {
      const body = await res.json().catch(() => null);
      const config = body?.data;
      if (config) {
        if (config.auto_failover !== undefined) {
          localStorage.setItem('medsync_auto_failover', config.auto_failover ? 'true' : 'false');
        }

        let targetUrl = BACKEND_PRESETS.render.url;
        if (config.active_backend_mode === 'portable' && config.portable_tunnel_url) {
          targetUrl = config.portable_tunnel_url;
        } else if (config.active_backend_mode === 'local') {
          targetUrl = BACKEND_PRESETS.local.url;
        } else if (config.render_url) {
          targetUrl = config.render_url;
        }

        const currentActive = localStorage.getItem('medsync_backend_override') || BACKEND_PRESETS.render.url;
        if (currentActive !== targetUrl) {
          setBackendOverride(targetUrl);
        }

        return {
          activeMode: config.active_backend_mode,
          activeUrl: targetUrl,
          autoFailover: config.auto_failover !== false
        };
      }
    }
  } catch {
    // Non-blocking sync error
  }
  return null;
}

