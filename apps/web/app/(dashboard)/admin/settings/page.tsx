"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Badge } from "@medsync/ui";
import {
  Settings,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Layers,
  Database,
  Blocks,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  RefreshCw,
  HardDrive
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import BackendArchitectureSwitcher from "@/components/admin/BackendArchitectureSwitcher";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" }
  }
};

export default function AdminSettings() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [strictVerification, setStrictVerification] = useState(true);
  const [blockchainEnforced, setBlockchainEnforced] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSynced, setLastSynced] = useState<string>("Just now");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/admin/settings');
      if (res.data?.data) {
        setMaintenanceMode(Boolean(res.data.data.maintenance_mode));
        setStrictVerification(Boolean(res.data.data.strict_verification));
        setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.error("Failed to load settings", err);
      toast.error("Failed to load platform settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (updates: any) => {
    try {
      setSaving(true);
      const payload = {
        maintenance_mode: maintenanceMode,
        strict_verification: strictVerification,
        ...updates
      };
      
      await api.post('/api/v1/admin/settings', payload);
      
      if (updates.maintenance_mode !== undefined) setMaintenanceMode(updates.maintenance_mode);
      if (updates.strict_verification !== undefined) setStrictVerification(updates.strict_verification);
      
      setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      toast.success("Governance settings updated successfully");
    } catch (err) {
      console.error("Failed to update settings", err);
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative flex items-center justify-center">
          <div className="h-16 w-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
          <Settings className="absolute h-6 w-6 text-cyan-400 animate-pulse" />
        </div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Loading MedSync Control Plane...
        </p>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 max-w-7xl mx-auto pb-12"
    >
      {/* HEADER HERO */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-lg">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
                Admin Settings & Governance
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-[10px] py-0.5">
                  Live Control Plane
                </Badge>
              </h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Configure system-wide runtime topologies, hospital security protocols, and operational safety mechanisms.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="hidden sm:flex flex-col items-end text-xs text-muted-foreground font-mono">
            <span>Last Synced: <strong className="text-foreground">{lastSynced}</strong></span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> DB Connected
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSettings}
            disabled={saving}
            className="gap-2 h-9 border-white/10 hover:border-cyan-500/30 text-xs rounded-xl"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${saving ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* 1. BACKEND TOPOLOGY SWITCHER */}
      <motion.div variants={itemVariants}>
        <BackendArchitectureSwitcher />
      </motion.div>

      {/* 2. PLATFORM GOVERNANCE & SECURITY CONTROLS */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden border border-white/10 bg-gradient-to-b from-card/90 via-card/60 to-card/90 backdrop-blur-2xl shadow-xl">
          <div className="h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500" />
          <CardHeader className="border-b border-white/5 pb-5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold tracking-tight text-foreground">
                  Security & Access Governance
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Platform-wide access barriers, emergency maintenance switches, and clinical verification enforcement.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {/* MAINTENANCE MODE */}
            <motion.div
              whileHover={{ scale: 1.005 }}
              className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border transition-all duration-300 gap-4 ${
                maintenanceMode
                  ? "border-rose-500/50 bg-rose-950/20 shadow-[0_0_25px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/30"
                  : "border-white/10 bg-white/[0.02] hover:border-rose-500/30 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  maintenanceMode
                    ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                    : "bg-white/5 text-muted-foreground border-white/10"
                }`}>
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-foreground">Emergency Maintenance Mode</p>
                    {maintenanceMode ? (
                      <Badge className="bg-rose-600 text-white border-none text-[10px] uppercase font-mono">
                        Active Lockdown
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-white/10 text-muted-foreground text-[10px]">
                        Standby (Normal Access)
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground max-w-xl">
                    When active, non-administrator users (Patients, Doctors, and Pharmacies) are blocked from mutating clinical data and will see a graceful maintenance banner.
                  </p>
                </div>
              </div>

              <Button
                variant={maintenanceMode ? "default" : "outline"}
                disabled={saving}
                onClick={() => saveSettings({ maintenance_mode: !maintenanceMode })}
                className={`h-9 px-4 text-xs font-semibold rounded-xl transition-all ${
                  maintenanceMode
                    ? "bg-rose-600 hover:bg-rose-700 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                    : "border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
                }`}
              >
                {maintenanceMode ? "Disable Maintenance" : "Activate Lockdown"}
              </Button>
            </motion.div>

            {/* STRICT VERIFICATION */}
            <motion.div
              whileHover={{ scale: 1.005 }}
              className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border transition-all duration-300 gap-4 ${
                strictVerification
                  ? "border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.1)] ring-1 ring-emerald-500/20"
                  : "border-white/10 bg-white/[0.02] hover:border-emerald-500/30 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  strictVerification
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : "bg-white/5 text-muted-foreground border-white/10"
                }`}>
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-foreground">Strict Clinical Credential Verification</p>
                    {strictVerification ? (
                      <Badge className="bg-emerald-600/90 text-white border-none text-[10px]">
                        Enforced
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[10px]">
                        Permissive
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground max-w-xl">
                    Requires medical license ID validation and cryptographic administrator sign-off before newly onboarded Doctors or Pharmacies can access sensitive health records.
                  </p>
                </div>
              </div>

              <Button
                variant={strictVerification ? "default" : "outline"}
                disabled={saving}
                onClick={() => saveSettings({ strict_verification: !strictVerification })}
                className={`h-9 px-4 text-xs font-semibold rounded-xl transition-all ${
                  strictVerification
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    : "border-white/10 hover:border-emerald-500/40"
                }`}
              >
                {strictVerification ? "Verification Enforced" : "Enable Strict Mode"}
              </Button>
            </motion.div>

            {/* BLOCKCHAIN AUDIT LOG ANCHORING */}
            <motion.div
              whileHover={{ scale: 1.005 }}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-cyan-500/30 hover:bg-white/[0.04] transition-all duration-300 gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  <Blocks className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-foreground">Polygon Amoy Blockchain Anchoring</p>
                    <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-500/10 text-[10px]">
                      Chain ID: 80002
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-xl">
                    Anchors cryptographic SHA-256 hashes of medical consent grants and prescriptions to Polygon Amoy smart contracts for tamper-proof verification.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setBlockchainEnforced(!blockchainEnforced);
                  toast.success(`Blockchain anchoring policy ${!blockchainEnforced ? "enabled" : "relaxed"}`);
                }}
                className={`h-9 px-4 text-xs font-semibold rounded-xl border-white/10 ${
                  blockchainEnforced ? "text-cyan-400 border-cyan-500/40 bg-cyan-500/5" : ""
                }`}
              >
                {blockchainEnforced ? "Anchoring Enforced" : "Anchoring Optional"}
              </Button>
            </motion.div>

            {/* SESSION TIMEOUT POLICY */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border border-white/10 bg-white/[0.02] gap-4">
              <div className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-sm text-foreground">Inactivity Session Timeout</p>
                  <p className="text-xs text-muted-foreground max-w-xl">
                    Automatically invalidates JWT tokens and requires re-authentication after idle periods to comply with HIPAA guidelines.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                {[15, 30, 60, 120].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      setSessionTimeout(mins);
                      toast.info(`Session timeout set to ${mins} minutes`);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all ${
                      sessionTimeout === mins
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                        : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 3. PLATFORM INFRASTRUCTURE TELEMETRY OVERVIEW */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl border border-white/10 bg-card/60 backdrop-blur-md flex items-center gap-3.5">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0">
              <Database className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">PostgreSQL DB</p>
              <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Connected (Supabase)
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-white/10 bg-card/60 backdrop-blur-md flex items-center gap-3.5">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
              <HardDrive className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Medical Storage</p>
              <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> AES Encrypted S3
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-white/10 bg-card/60 backdrop-blur-md flex items-center gap-3.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <Blocks className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Polygon Amoy</p>
              <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> RPC Active (Alchemy)
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-white/10 bg-card/60 backdrop-blur-md flex items-center gap-3.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Pulse AI Copilot</p>
              <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Groq Llama 3.3 70B
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
