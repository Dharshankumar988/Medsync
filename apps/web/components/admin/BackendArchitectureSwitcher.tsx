"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge
} from "@medsync/ui";
import {
  Server,
  Cloud,
  Laptop,
  Radio,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Cpu,
  ShieldCheck,
  ExternalLink,
  Zap
} from "lucide-react";
import {
  BACKEND_PRESETS,
  getBackendBaseUrl,
  setBackendOverride,
  testBackendHealth
} from "@/lib/backend-config";
import api from "@/lib/api";
import { toast } from "sonner";

interface HealthState {
  ok: boolean;
  latencyMs: number;
  statusText: string;
  loading: boolean;
}

export default function BackendArchitectureSwitcher() {
  const [activeUrl, setActiveUrl] = useState<string>("");
  const [autoFailover, setAutoFailover] = useState<boolean>(true);
  const [customUrl, setCustomUrl] = useState<string>("");
  const [isEditingCustom, setIsEditingCustom] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Ping States
  const [renderHealth, setRenderHealth] = useState<HealthState>({
    ok: false,
    latencyMs: 0,
    statusText: "Checking...",
    loading: true
  });
  const [portableHealth, setPortableHealth] = useState<HealthState>({
    ok: false,
    latencyMs: 0,
    statusText: "Checking...",
    loading: true
  });
  const [localHealth, setLocalHealth] = useState<HealthState>({
    ok: false,
    latencyMs: 0,
    statusText: "Checking...",
    loading: true
  });

  useEffect(() => {
    setActiveUrl(getBackendBaseUrl());

    // Fetch master settings from database (Admin control plane)
    fetchSystemSettings();

    pingAllBackends();

    const handleBackendChange = (e: any) => {
      if (e.detail?.url) setActiveUrl(e.detail.url);
    };
    window.addEventListener("medsync-backend-changed", handleBackendChange);
    return () => {
      window.removeEventListener("medsync-backend-changed", handleBackendChange);
    };
  }, []);

  const fetchSystemSettings = async () => {
    try {
      const res = await api.get('/api/v1/admin/settings');
      if (res.data?.data) {
        const { active_backend_mode, portable_tunnel_url, auto_failover: dbAutoFailover } = res.data.data;
        if (dbAutoFailover !== undefined) {
          setAutoFailover(dbAutoFailover);
          localStorage.setItem("medsync_auto_failover", dbAutoFailover ? "true" : "false");
        }
        if (portable_tunnel_url) {
          BACKEND_PRESETS.portable.url = portable_tunnel_url;
        }
        // Match active mode to preset URL
        let targetUrl = BACKEND_PRESETS.render.url;
        if (active_backend_mode === "portable" && portable_tunnel_url) {
          targetUrl = portable_tunnel_url;
        } else if (active_backend_mode === "local") {
          targetUrl = BACKEND_PRESETS.local.url;
        }
        setActiveUrl(targetUrl);
        setBackendOverride(targetUrl);
      }
    } catch {
      // If auth token not ready or backend offline, fall back to local state
      if (typeof window !== "undefined") {
        const savedFailover = localStorage.getItem("medsync_auto_failover");
        setAutoFailover(savedFailover !== "false");
      }
    }
  };

  const pingAllBackends = async () => {
    setRenderHealth(prev => ({ ...prev, loading: true }));
    setPortableHealth(prev => ({ ...prev, loading: true }));
    setLocalHealth(prev => ({ ...prev, loading: true }));

    // Test Render Cloud
    testBackendHealth(BACKEND_PRESETS.render.url).then(res => {
      setRenderHealth({ ...res, loading: false });
    });

    // Test Portable Runner Ngrok Tunnel
    testBackendHealth(BACKEND_PRESETS.portable.url).then(res => {
      setPortableHealth({ ...res, loading: false });
    });

    // Test Localhost
    testBackendHealth(BACKEND_PRESETS.local.url).then(res => {
      setLocalHealth({ ...res, loading: false });
    });
  };

  const handleSelectBackend = async (modeKey: 'render' | 'portable' | 'local', url: string, name: string) => {
    try {
      setSaving(true);
      // Persist Admin's choice to PostgreSQL database for the whole project
      await api.post('/api/v1/admin/settings', {
        active_backend_mode: modeKey,
        portable_tunnel_url: modeKey === 'portable' ? url : undefined,
        rag_worker_url: modeKey === 'portable' ? url : undefined,
      });
      setBackendOverride(url);
      setActiveUrl(url);
      toast.success(`Project-wide backend set to: ${name}`);
    } catch {
      // Even if network blips, update client view
      setBackendOverride(url);
      setActiveUrl(url);
      toast.info(`Active backend switched to: ${name}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCustomUrl = async () => {
    if (!customUrl.trim()) return;
    const cleanUrl = customUrl.trim().replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
    try {
      setSaving(true);
      await api.post('/api/v1/admin/settings', {
        active_backend_mode: 'portable',
        portable_tunnel_url: cleanUrl,
        rag_worker_url: cleanUrl
      });
      BACKEND_PRESETS.portable.url = cleanUrl;
      setBackendOverride(cleanUrl);
      setActiveUrl(cleanUrl);
      setIsEditingCustom(false);
      toast.success("Applied custom backend URL system-wide");
      pingAllBackends();
    } catch {
      setBackendOverride(cleanUrl);
      setActiveUrl(cleanUrl);
      setIsEditingCustom(false);
      toast.info("Applied custom URL locally");
    } finally {
      setSaving(false);
    }
  };

  const toggleAutoFailover = async () => {
    const nextVal = !autoFailover;
    setAutoFailover(nextVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("medsync_auto_failover", nextVal ? "true" : "false");
    }
    try {
      await api.post('/api/v1/admin/settings', { auto_failover: nextVal });
      toast.info(`Project-wide auto-failover ${nextVal ? "enabled" : "disabled"}`);
    } catch {
      toast.info(`Auto-failover ${nextVal ? "enabled" : "disabled"} locally`);
    }
  };

  const isCurrentActive = (targetUrl: string) => {
    const cleanActive = activeUrl.replace(/\/$/, "");
    const cleanTarget = targetUrl.replace(/\/$/, "");
    return cleanActive === cleanTarget;
  };


  return (
    <Card className="border-border/60 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-md shadow-lg overflow-hidden">
      <CardHeader className="border-b border-border/40 pb-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Server className="h-4 w-4" />
              </div>
              <CardTitle className="text-xl font-bold tracking-tight">
                Hybrid Backend & Runner Switcher
              </CardTitle>
            </div>
            <CardDescription className="text-sm">
              Control whether the web app connects to the 24/7 Render cloud backend or your portable runner on any laptop.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={pingAllBackends}
              className="gap-2 h-9 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${renderHealth.loading ? "animate-spin" : ""}`} />
              Ping Backends
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* ACTIVE STATUS BANNER */}
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                Currently Active Endpoint
              </p>
              <p className="font-mono text-sm font-bold text-foreground truncate max-w-md">
                {activeUrl || "https://medsync-backend-rktc.onrender.com"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                activeUrl.includes("onrender.com")
                  ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                  : activeUrl.includes("ngrok")
                  ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              }
            >
              {activeUrl.includes("onrender.com")
                ? "Cloud (Render)"
                : activeUrl.includes("ngrok")
                ? "Portable Runner (Ngrok)"
                : "Localhost"}
            </Badge>

            <a
              href={`${activeUrl}/health`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              /health <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* BACKEND OPTIONS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. RENDER CLOUD (PRIMARY) */}
          <div
            onClick={() => handleSelectBackend('render', BACKEND_PRESETS.render.url, BACKEND_PRESETS.render.name)}
            className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 relative ${
              isCurrentActive(BACKEND_PRESETS.render.url)
                ? "border-primary bg-primary/10 shadow-sm"
                : "border-border/60 hover:border-primary/40 hover:bg-muted/10"
            }`}
          >
            {isCurrentActive(BACKEND_PRESETS.render.url) && (
              <span className="absolute top-3 right-3 text-primary">
                <CheckCircle2 className="h-5 w-5" />
              </span>
            )}
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <Cloud className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  Render Cloud Backend
                  <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-mono">
                    24/7 Primary
                  </span>
                </h4>
                <p className="text-xs text-muted-foreground font-mono truncate max-w-xs">
                  {BACKEND_PRESETS.render.url}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-2 mb-3">
              Runs in the cloud 24/7 on Render. Always available even when all laptops are turned off.
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
              <span className="text-muted-foreground">Status:</span>
              <div className="flex items-center gap-1.5">
                {renderHealth.loading ? (
                  <span className="text-muted-foreground animate-pulse">Pinging...</span>
                ) : renderHealth.ok ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-emerald-400 font-medium">
                      Online ({renderHealth.latencyMs}ms)
                    </span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <span className="text-rose-400 font-medium">{renderHealth.statusText}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 2. PORTABLE RUNNER (NGROK TUNNEL) */}
          <div
            onClick={() => handleSelectBackend('portable', BACKEND_PRESETS.portable.url, BACKEND_PRESETS.portable.name)}
            className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 relative ${
              isCurrentActive(BACKEND_PRESETS.portable.url)
                ? "border-purple-500 bg-purple-500/10 shadow-sm"
                : "border-border/60 hover:border-purple-500/40 hover:bg-muted/10"
            }`}
          >
            {isCurrentActive(BACKEND_PRESETS.portable.url) && (
              <span className="absolute top-3 right-3 text-purple-400">
                <CheckCircle2 className="h-5 w-5" />
              </span>
            )}
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Laptop className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  Portable Runner
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-mono">
                    Any Laptop
                  </span>
                </h4>
                <p className="text-xs text-muted-foreground font-mono truncate max-w-xs">
                  {BACKEND_PRESETS.portable.url}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-2 mb-3">
              Routes traffic to whichever laptop is running <code className="text-primary">start-medsync.ps1</code>.
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
              <span className="text-muted-foreground">Status:</span>
              <div className="flex items-center gap-1.5">
                {portableHealth.loading ? (
                  <span className="text-muted-foreground animate-pulse">Pinging...</span>
                ) : portableHealth.ok ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-emerald-400 font-medium">
                      Runner Active ({portableHealth.latencyMs}ms)
                    </span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-amber-400 font-medium">
                      Offline (Start runner on laptop)
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FAILOVER & RAG WORKER SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* AUTO-FAILOVER SWITCH */}
          <div className="p-4 rounded-xl border border-border/60 bg-muted/5 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <h5 className="text-sm font-semibold">Automatic Intelligent Failover</h5>
              </div>
              <p className="text-xs text-muted-foreground">
                If the active backend is unreachable (or laptop goes to sleep), automatically route to the alternative backend so users experience zero downtime.
              </p>
            </div>
            <Button
              variant={autoFailover ? "default" : "outline"}
              size="sm"
              onClick={toggleAutoFailover}
              className={`h-8 text-xs ${autoFailover ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
            >
              {autoFailover ? "Enabled" : "Disabled"}
            </Button>
          </div>

          {/* RAG WORKER COMPUTATION ARCHITECTURE */}
          <div className="p-4 rounded-xl border border-border/60 bg-muted/5 flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Cpu className="h-4 w-4" />
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <h5 className="text-sm font-semibold">Local AI & RAG Worker Microservice</h5>
                <Badge variant="outline" className="text-[10px] h-4">
                  Option B
                </Badge>
              </div>
              <p className="text-muted-foreground">
                To run heavy vector embeddings locally, launch <strong>Option B</strong> in your portable runner. Render delegates vector computations to your laptop while maintaining its 24/7 cloud core.
              </p>
            </div>
          </div>
        </div>

        {/* CUSTOM ENDPOINT OPTION */}
        <div className="pt-2">
          {isEditingCustom ? (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://your-custom-tunnel.ngrok-free.dev"
                value={customUrl}
                onChange={e => setCustomUrl(e.target.value)}
                className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-mono"
              />
              <Button size="sm" onClick={handleSaveCustomUrl} className="h-8 text-xs">
                Apply Custom URL
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingCustom(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Need a custom tunneling address or local IP?</span>
              <Button
                variant="link"
                size="sm"
                onClick={() => setIsEditingCustom(true)}
                className="text-xs h-auto p-0"
              >
                Configure Custom Endpoint
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
