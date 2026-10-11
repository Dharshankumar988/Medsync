"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Terminal,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
  Zap,
  Activity,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Network
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
  const [copied, setCopied] = useState<boolean>(false);

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
      await api.post('/api/v1/admin/settings', {
        active_backend_mode: modeKey,
        portable_tunnel_url: modeKey === 'portable' ? url : undefined
      });
      setBackendOverride(url);
      setActiveUrl(url);
      toast.success(`Platform-wide route switched to: ${name}`);
    } catch {
      setBackendOverride(url);
      setActiveUrl(url);
      toast.info(`Active backend routed locally to: ${name}`);
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
        portable_tunnel_url: cleanUrl
      });
      BACKEND_PRESETS.portable.url = cleanUrl;
      setBackendOverride(cleanUrl);
      setActiveUrl(cleanUrl);
      setIsEditingCustom(false);
      toast.success("Applied custom backend endpoint system-wide");
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
      toast.success(`Automated failover ${nextVal ? "enabled" : "disabled"}`);
    } catch {
      toast.info(`Automated failover ${nextVal ? "enabled" : "disabled"} locally`);
    }
  };

  const isCurrentActive = (targetUrl: string) => {
    const cleanActive = (activeUrl || "").replace(/\/$/, "");
    const cleanTarget = (targetUrl || "").replace(/\/$/, "");
    return cleanActive === cleanTarget;
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Copied endpoint to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="relative overflow-hidden border border-white/10 bg-gradient-to-b from-card/90 via-card/60 to-card/90 backdrop-blur-2xl shadow-2xl transition-all duration-300">
      {/* Decorative ambient top line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500" />

      <CardHeader className="border-b border-white/5 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-inner">
                <Server className="h-4.5 w-4.5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  Backend Architecture & Topology
                  <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider border-cyan-500/30 bg-cyan-500/10 text-cyan-400 py-0.5">
                    Live Cluster
                  </Badge>
                </CardTitle>
              </div>
            </div>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Control where MedSync routes live API queries. Seamlessly hot-swap between our 24/7 cloud cluster and local on-premises portable runners with zero downtime.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={pingAllBackends}
              disabled={renderHealth.loading || portableHealth.loading || localHealth.loading}
              className="gap-2 h-9 text-xs border-white/10 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all duration-200"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${renderHealth.loading ? "animate-spin" : ""}`} />
              <span>Ping All Nodes</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* ACTIVE ENDPOINT HERO PANEL */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-950/20 via-background/40 to-indigo-950/20 p-5 backdrop-blur-md shadow-lg"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="relative flex h-3.5 w-3.5 items-center justify-center shrink-0 mt-1 sm:mt-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                    Active Gateway Route
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      activeUrl.includes("onrender.com")
                        ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30 text-[10px]"
                        : activeUrl.includes("ngrok")
                        ? "bg-purple-500/10 text-purple-300 border-purple-500/30 text-[10px]"
                        : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 text-[10px]"
                    }
                  >
                    {activeUrl.includes("onrender.com")
                      ? "Cloud (Render Primary)"
                      : activeUrl.includes("ngrok")
                      ? "Portable Runner (Ngrok)"
                      : "Local Sandbox (Port 8000)"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm sm:text-base font-semibold text-foreground truncate max-w-lg">
                    {activeUrl || BACKEND_PRESETS.render.url}
                  </p>
                  <button
                    onClick={() => handleCopyUrl(activeUrl || BACKEND_PRESETS.render.url)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy URL"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <a
                href={`${activeUrl || BACKEND_PRESETS.render.url}/health`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-white/5 hover:bg-white/10 text-foreground border border-white/10 transition-colors"
              >
                <span>/health</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </a>
            </div>
          </div>
        </motion.div>

        {/* TOPOLOGY NODES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. RENDER CLOUD (PRIMARY) */}
          <motion.div
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
            onClick={() => handleSelectBackend('render', BACKEND_PRESETS.render.url, BACKEND_PRESETS.render.name)}
            className={`cursor-pointer rounded-2xl border p-5 transition-all duration-300 relative flex flex-col justify-between ${
              isCurrentActive(BACKEND_PRESETS.render.url)
                ? "border-cyan-500/80 bg-gradient-to-b from-cyan-950/30 to-card shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/30"
                : "border-white/10 bg-card/40 hover:border-cyan-500/30 hover:bg-card/70"
            }`}
          >
            {isCurrentActive(BACKEND_PRESETS.render.url) && (
              <span className="absolute top-4 right-4 text-cyan-400">
                <CheckCircle2 className="h-5 w-5" />
              </span>
            )}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                  <Cloud className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    Render Cloud
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-mono font-medium">
                      24/7 Primary
                    </span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground font-mono truncate max-w-[180px]">
                    {BACKEND_PRESETS.render.url}
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                High-availability cloud container deployed continuously. Always reachable globally even when on-site workstations are powered off.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
              <span className="text-muted-foreground font-medium">Telemetry:</span>
              <div className="flex items-center gap-1.5">
                {renderHealth.loading ? (
                  <span className="text-muted-foreground animate-pulse flex items-center gap-1">
                    <Activity className="h-3 w-3 animate-spin" /> Pinging...
                  </span>
                ) : renderHealth.ok ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                    Online ({renderHealth.latencyMs}ms)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-rose-400 font-medium">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    Offline
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          {/* 2. PORTABLE RUNNER (NGROK TUNNEL) */}
          <motion.div
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
            onClick={() => handleSelectBackend('portable', BACKEND_PRESETS.portable.url, BACKEND_PRESETS.portable.name)}
            className={`cursor-pointer rounded-2xl border p-5 transition-all duration-300 relative flex flex-col justify-between ${
              isCurrentActive(BACKEND_PRESETS.portable.url)
                ? "border-purple-500/80 bg-gradient-to-b from-purple-950/30 to-card shadow-[0_0_20px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/30"
                : "border-white/10 bg-card/40 hover:border-purple-500/30 hover:bg-card/70"
            }`}
          >
            {isCurrentActive(BACKEND_PRESETS.portable.url) && (
              <span className="absolute top-4 right-4 text-purple-400">
                <CheckCircle2 className="h-5 w-5" />
              </span>
            )}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                  <Laptop className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    Portable Runner
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-mono font-medium">
                      On-Premises
                    </span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground font-mono truncate max-w-[180px]">
                    {BACKEND_PRESETS.portable.url}
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Routes traffic to whichever laptop is running <code className="text-purple-300 font-mono">start-medsync.bat</code> via encrypted Ngrok tunneling.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
              <span className="text-muted-foreground font-medium">Telemetry:</span>
              <div className="flex items-center gap-1.5">
                {portableHealth.loading ? (
                  <span className="text-muted-foreground animate-pulse flex items-center gap-1">
                    <Activity className="h-3 w-3 animate-spin" /> Pinging...
                  </span>
                ) : portableHealth.ok ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                    Runner Active ({portableHealth.latencyMs}ms)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Standby (Offline)
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          {/* 3. LOCALHOST DEV INSTANCE */}
          <motion.div
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
            onClick={() => handleSelectBackend('local', BACKEND_PRESETS.local.url, BACKEND_PRESETS.local.name)}
            className={`cursor-pointer rounded-2xl border p-5 transition-all duration-300 relative flex flex-col justify-between ${
              isCurrentActive(BACKEND_PRESETS.local.url)
                ? "border-amber-500/80 bg-gradient-to-b from-amber-950/30 to-card shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30"
                : "border-white/10 bg-card/40 hover:border-amber-500/30 hover:bg-card/70"
            }`}
          >
            {isCurrentActive(BACKEND_PRESETS.local.url) && (
              <span className="absolute top-4 right-4 text-amber-400">
                <CheckCircle2 className="h-5 w-5" />
              </span>
            )}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                  <Terminal className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    Local Dev Sandbox
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono font-medium">
                      Port 8000
                    </span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground font-mono truncate max-w-[180px]">
                    {BACKEND_PRESETS.local.url}
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Direct loopback socket for local development, rapid schema debugging, and unit testing without cloud dependencies.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
              <span className="text-muted-foreground font-medium">Telemetry:</span>
              <div className="flex items-center gap-1.5">
                {localHealth.loading ? (
                  <span className="text-muted-foreground animate-pulse flex items-center gap-1">
                    <Activity className="h-3 w-3 animate-spin" /> Pinging...
                  </span>
                ) : localHealth.ok ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                    Online ({localHealth.latencyMs}ms)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-muted" />
                    Not Running
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* INTELLIGENT AUTO-FAILOVER SWITCH */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-emerald-950/20 via-card to-cyan-950/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h5 className="text-sm font-semibold text-foreground">Intelligent High-Availability Failover</h5>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-300 bg-emerald-500/10 text-[10px]">
                  Zero Downtime
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground max-w-xl">
                When enabled, if the active portable runner disconnects or the laptop sleeps, queries instantaneously re-route to the 24/7 Render Cloud cluster without disturbing active user sessions.
              </p>
            </div>
          </div>

          <Button
            variant={autoFailover ? "default" : "outline"}
            size="sm"
            onClick={toggleAutoFailover}
            className={`h-9 px-4 text-xs font-medium rounded-xl transition-all duration-200 ${
              autoFailover
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                : "border-white/10 hover:border-emerald-500/30"
            }`}
          >
            {autoFailover ? "Auto-Failover Active" : "Auto-Failover Disabled"}
          </Button>
        </div>

        {/* CUSTOM ENDPOINT EXPANDER */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs">
          {isEditingCustom ? (
            <div className="space-y-3 p-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Network className="h-3.5 w-3.5 text-cyan-400" /> Custom Ngrok or Private Gateway URL
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingCustom(false)}
                  className="h-6 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="https://your-custom-tunnel.ngrok-free.dev"
                  value={customUrl}
                  onChange={e => setCustomUrl(e.target.value)}
                  className="flex-1 bg-background/80 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <Button
                  size="sm"
                  onClick={handleSaveCustomUrl}
                  disabled={saving || !customUrl.trim()}
                  className="h-8 text-xs bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl px-4"
                >
                  Apply Custom Route
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between px-2">
              <span className="text-muted-foreground">Need to bind a custom reverse-proxy, LAN IP, or bespoke tunnel?</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingCustom(true)}
                className="text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 h-7 px-2.5 rounded-lg"
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
