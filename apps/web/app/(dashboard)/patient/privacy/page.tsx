"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Skeleton,
  Button,
} from "@medsync/ui";
import {
  Shield,
  ShieldAlert,
  Key,
  Clock,
  ShieldCheck,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  UserCheck,
  Send,
  Loader2,
  Lock,
  Unlock,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { formatDoctorName } from "@/lib/formatDoctorName";
import { toast } from "sonner";

export default function PrivacyPage() {
  const [userId, setUserId] = useState<string>("");
  const [consentHistory, setConsentHistory] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const loadConsentData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // 1. Fetch pending record access requests
      try {
        const reqRes = await api.get("/api/v1/doctor-collaboration/patient/record-requests");
        if (reqRes.data?.data) {
          const pend = reqRes.data.data.filter((r: any) => r.status === "PENDING");
          setPendingRequests(pend);
        }
      } catch (err) {
        // Fallback to Supabase
        const { data: reqData } = await supabase
          .from("record_requests")
          .select("*")
          .eq("patient_id", userId)
          .eq("status", "PENDING")
          .order("created_at", { ascending: false });

        if (reqData && reqData.length > 0) {
          const docIds = [...new Set(reqData.map((r: any) => r.requesting_doctor_id))];
          const { data: docs } = await supabase
            .from("doctors")
            .select("user_id, full_name, specialization, hospital_name")
            .in("user_id", docIds);

          const docsMap = (docs || []).reduce((acc: any, d: any) => {
            acc[d.user_id] = d;
            return acc;
          }, {});

          const enriched = reqData.map((r: any) => ({
            ...r,
            requesting_doctor_name: docsMap[r.requesting_doctor_id]?.full_name,
            specialization: docsMap[r.requesting_doctor_id]?.specialization,
            hospital_name: docsMap[r.requesting_doctor_id]?.hospital_name,
          }));
          setPendingRequests(enriched);
        } else {
          setPendingRequests([]);
        }
      }

      // 2. Fetch consent history
      const { data, error } = await supabase
        .from("consent_history")
        .select("*")
        .eq("patient_id", userId)
        .order("created_at", { ascending: false });

      if (data) {
        const doctorIds = [...new Set(data.map((c) => c.doctor_id))];
        const { data: docData } = await supabase
          .from("doctors")
          .select("*")
          .in("user_id", doctorIds);

        const docsMap = (docData || []).reduce((acc: any, d: any) => {
          acc[d.user_id] = d;
          return acc;
        }, {});

        const mapped = data.map((c) => ({
          ...c,
          doctor: docsMap[c.doctor_id],
        }));

        setConsentHistory(mapped);
      }
    } catch (err) {
      console.error("Error loading consent history", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadConsentData();
  }, [loadConsentData]);

  const handleApproveRequest = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await api.post(`/api/v1/doctor-collaboration/patient/record-requests/${requestId}/approve`);
      toast.success("Access granted! Your medical records have been shared with the doctor.");
      loadConsentData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to grant record access");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await api.post(`/api/v1/doctor-collaboration/patient/record-requests/${requestId}/reject`);
      toast.info("Record access request declined.");
      loadConsentData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to decline record access");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="relative space-y-8 pb-12 max-w-6xl mx-auto">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/[0.04] rounded-full blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <p className="text-sm font-medium tracking-widest uppercase text-emerald-500 mb-2">
            Security & Data Sovereignty
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
            Privacy & Consent
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
            Monitor and control exactly who has access to your medical records across the MedSync network. Grant or revoke permissions with real-time cryptographic audit logging.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={loadConsentData}
          className="rounded-xl border-border/70 hover:bg-muted/40 self-start md:self-auto h-9 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
        </Button>
      </motion.div>

      {/* Feature Value Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-6 md:grid-cols-3"
      >
        <Card className="rounded-2xl border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/20 text-emerald-600 rounded-xl">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-emerald-950 dark:text-emerald-50">
                  Blockchain Secured
                </h3>
                <p className="text-sm text-emerald-700/80 dark:text-emerald-300/80">
                  Tamper-proof medical records.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-blue-500/20 bg-blue-500/5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 text-blue-600 rounded-xl">
                <Key className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-blue-950 dark:text-blue-50">
                  You&apos;re in Control
                </h3>
                <p className="text-sm text-blue-700/80 dark:text-blue-300/80">
                  Revoke or grant access anytime.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-violet-500/20 bg-violet-500/5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-violet-500/20 text-violet-600 rounded-xl">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-violet-950 dark:text-violet-50">
                  Real-time Audit
                </h3>
                <p className="text-sm text-violet-700/80 dark:text-violet-300/80">
                  Track every access request instantly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* PENDING DOCTOR RECORD ACCESS REQUESTS */}
      {pendingRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5 overflow-hidden shadow-sm">
            <CardHeader className="pb-3 border-b border-amber-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-foreground flex items-center gap-2">
                      Pending Doctor Record Access Requests ({pendingRequests.length})
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Physicians have requested permission to review your medical history. Choose to grant or decline access.
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-amber-500 text-white text-xs px-2 py-0.5">
                  Action Required
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-3">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-xl border border-border/60 bg-card/80 space-y-3 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-foreground">
                          Dr. {req.requesting_doctor_name || "Attending Physician"}
                        </h4>
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                          {req.specialization || "Clinical Practice"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {req.hospital_name || "Network Healthcare Clinic"} • Requested on{" "}
                        {new Date(req.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs h-9 border-border/70 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30"
                        onClick={() => handleRejectRequest(req.id)}
                        disabled={processingId === req.id}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Decline
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-9 font-medium shadow-sm"
                        onClick={() => handleApproveRequest(req.id)}
                        disabled={processingId === req.id}
                      >
                        {processingId === req.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        ) : (
                          <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Grant & Share Records
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/40 border border-border/40 text-xs space-y-1">
                    <div className="flex items-start gap-1.5">
                      <span className="font-semibold uppercase text-[10px] text-muted-foreground shrink-0 mt-0.5">
                        Clinical Reason:
                      </span>
                      <span className="text-foreground">{req.reason}</span>
                    </div>
                    {req.record_title && (
                      <div className="flex items-center gap-1.5 pt-1 border-t border-border/30">
                        <span className="font-semibold uppercase text-[10px] text-muted-foreground">
                          Requested Document:
                        </span>
                        <span className="text-primary font-medium">{req.record_title}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* CONSENT AUDIT LOG */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-xl shadow-lg shadow-emerald-500/[0.02]">
          <CardHeader className="pb-4 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Consent Audit Log</CardTitle>
                <CardDescription className="mt-1">
                  A complete history of data access granted to healthcare providers.
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                Live Tracking
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-2xl bg-muted/50" />
                ))}
              </div>
            ) : consentHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 bg-emerald-500/10 rounded-full mb-4">
                  <Shield className="h-10 w-10 text-emerald-500/60" />
                </div>
                <p className="text-lg font-medium">No consent history</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You haven&apos;t granted any data access yet. When a doctor requests access to your records and you grant consent, it will appear here.
                </p>
              </div>
            ) : (
              <div className="relative border-l-2 border-border/40 ml-4 md:ml-6 space-y-8 pb-4">
                {consentHistory.map((item, index) => (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    key={item.id}
                    className="relative pl-6 md:pl-8 group"
                  >
                    <span
                      className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full ring-4 ring-background transition-transform group-hover:scale-125 ${
                        item.action.toLowerCase() === "granted" ? "bg-emerald-500" : "bg-red-500"
                      }`}
                    />
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4 rounded-2xl bg-card border border-border/40 hover:border-emerald-500/30 hover:bg-emerald-500/[0.02] transition-all">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <h4 className="font-semibold text-base">
                            Access {item.action}
                          </h4>
                          {item.action.toLowerCase() === "granted" ? (
                            <Badge
                              variant="outline"
                              className="h-5 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            >
                              GRANTED
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="h-5 text-[10px] bg-red-500/10 text-red-600 border-red-500/20"
                            >
                              REVOKED
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-foreground/80 font-medium">
                          {formatDoctorName(item.doctor?.full_name)}{" "}
                          {item.doctor?.specialization && (
                            <span className="text-muted-foreground font-normal">
                              ({item.doctor.specialization})
                            </span>
                          )}
                        </p>
                        {item.blockchain_tx_hash && (
                          <div className="flex items-center gap-2 mt-3">
                            <span className="px-2 py-1 bg-muted/60 text-muted-foreground text-[10px] font-mono rounded border border-border/50 truncate max-w-[200px] sm:max-w-[300px]">
                              Tx: {item.blockchain_tx_hash}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center text-xs font-medium text-muted-foreground shrink-0 bg-muted/40 border border-border/50 px-2.5 py-1.5 rounded-lg shadow-sm">
                        <Clock className="mr-1.5 h-3.5 w-3.5" />
                        {new Date(item.created_at).toLocaleString([], {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
