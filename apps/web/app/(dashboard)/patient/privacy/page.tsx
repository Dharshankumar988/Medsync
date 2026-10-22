"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  Eye,
  Download,
  Stethoscope,
  Trash2,
  UserX,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { formatDoctorName } from "@/lib/formatDoctorName";
import { toast } from "sonner";

interface DoctorAccessItem {
  id: string;
  permission_id?: string;
  record_id?: string;
  record_title: string;
  doctor_id: string;
  doctor_name: string;
  doctor_specialization?: string | null;
  hospital_name?: string | null;
  access_level?: string;
  granted_at: string;
  status: "ACTIVE" | "REVOKED";
}

interface DoctorAccessLogItem {
  id: string;
  record_id: string;
  record_title: string;
  doctor_id: string;
  doctor_name: string;
  doctor_specialization?: string | null;
  accessed_at: string;
}

export default function PrivacyPage() {
  const [userId, setUserId] = useState<string>("");
  const [activeDoctorAccess, setActiveDoctorAccess] = useState<DoctorAccessItem[]>([]);
  const [doctorAccessLogs, setDoctorAccessLogs] = useState<DoctorAccessLogItem[]>([]);
  const [consentHistory, setConsentHistory] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

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

      // 2. Fetch active doctor access & actual audit access logs
      try {
        const accessRes = await api.get("/api/v1/records/patient/doctor-access");
        if (accessRes.data?.data) {
          const { active_permissions, access_logs } = accessRes.data.data;
          setActiveDoctorAccess(
            (active_permissions || []).map((p: any) => ({
              id: p.permission_id || `${p.record_id}-${p.doctor_id}`,
              permission_id: p.permission_id,
              record_id: p.record_id,
              record_title: p.record_title || "Medical Record",
              doctor_id: p.doctor_id,
              doctor_name: p.doctor_name,
              doctor_specialization: p.doctor_specialization,
              hospital_name: p.hospital_name,
              access_level: p.access_level || "READ",
              granted_at: p.granted_at,
              status: p.is_revoked ? "REVOKED" : "ACTIVE",
            }))
          );
          setDoctorAccessLogs(
            (access_logs || []).map((l: any) => ({
              id: l.id,
              record_id: l.record_id,
              record_title: l.record_title || "Document",
              doctor_id: l.doctor_id,
              doctor_name: l.doctor_name,
              doctor_specialization: l.doctor_specialization,
              accessed_at: l.accessed_at,
            }))
          );
        }
      } catch (err) {
        // Fallback to Supabase
        const { data: recordsData } = await supabase
          .from("medical_records")
          .select("id, title")
          .eq("patient_id", userId);

        if (recordsData && recordsData.length > 0) {
          const recIds = recordsData.map((r) => r.id);
          const recMap = recordsData.reduce((acc: any, r: any) => {
            acc[r.id] = r.title;
            return acc;
          }, {});

          const { data: permsData } = await supabase
            .from("record_permissions")
            .select("*")
            .in("record_id", recIds)
            .eq("is_revoked", false)
            .neq("granted_to", userId);

          if (permsData && permsData.length > 0) {
            const docIds = [...new Set(permsData.map((p) => p.granted_to))];
            const { data: docData } = await supabase
              .from("doctors")
              .select("user_id, full_name, specialization, hospital_name")
              .in("user_id", docIds);

            const docMap = (docData || []).reduce((acc: any, d: any) => {
              acc[d.user_id] = d;
              return acc;
            }, {});

            setActiveDoctorAccess(
              permsData.map((p) => ({
                id: p.id,
                permission_id: p.id,
                record_id: p.record_id,
                record_title: recMap[p.record_id] || "Medical Document",
                doctor_id: p.granted_to,
                doctor_name: docMap[p.granted_to]?.full_name || "Physician",
                doctor_specialization: docMap[p.granted_to]?.specialization,
                hospital_name: docMap[p.granted_to]?.hospital_name,
                access_level: p.access_level || "READ",
                granted_at: p.created_at,
                status: "ACTIVE",
              }))
            );
          } else {
            setActiveDoctorAccess([]);
          }

          // Fetch download audit logs
          try {
            const { data: auditData } = await supabase
              .from("download_audit_logs")
              .select("*")
              .in("entity_id", recIds)
              .eq("entity_type", "MEDICAL_RECORD")
              .order("created_at", { ascending: false })
              .limit(30);

            if (auditData && auditData.length > 0) {
              const auditDocIds = [...new Set(auditData.map((a) => a.user_id).filter(Boolean))];
              const { data: auditDocs } = await supabase
                .from("doctors")
                .select("user_id, full_name, specialization")
                .in("user_id", auditDocIds);

              const auditDocMap = (auditDocs || []).reduce((acc: any, d: any) => {
                acc[d.user_id] = d;
                return acc;
              }, {});

              setDoctorAccessLogs(
                auditData.map((a) => ({
                  id: a.id,
                  record_id: a.entity_id,
                  record_title: recMap[a.entity_id] || "Medical Record",
                  doctor_id: a.user_id,
                  doctor_name: auditDocMap[a.user_id]?.full_name || "Healthcare Doctor",
                  doctor_specialization: auditDocMap[a.user_id]?.specialization,
                  accessed_at: a.created_at,
                }))
              );
            } else {
              setDoctorAccessLogs([]);
            }
          } catch {}
        } else {
          setActiveDoctorAccess([]);
          setDoctorAccessLogs([]);
        }
      }

      // 3. Fetch consent history
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

  // Approve Doctor Access Request with OPTIMISTIC UI update
  const handleApproveRequest = async (requestId: string) => {
    setProcessingId(requestId);
    const approvedReq = pendingRequests.find((r) => r.id === requestId);

    // 1. Optimistic UI update immediately
    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    if (approvedReq) {
      setActiveDoctorAccess((prev) => [
        {
          id: `perm-${requestId}`,
          record_title: approvedReq.record_title || "All Medical Records",
          doctor_id: approvedReq.requesting_doctor_id,
          doctor_name: approvedReq.requesting_doctor_name || "Doctor",
          doctor_specialization: approvedReq.specialization,
          hospital_name: approvedReq.hospital_name,
          granted_at: new Date().toISOString(),
          status: "ACTIVE",
        },
        ...prev,
      ]);
      setConsentHistory((prev) => [
        {
          id: `hist-${Date.now()}`,
          action: "GRANTED",
          created_at: new Date().toISOString(),
          doctor: {
            full_name: approvedReq.requesting_doctor_name,
            specialization: approvedReq.specialization,
          },
        },
        ...prev,
      ]);
    }

    try {
      await api.post(`/api/v1/doctor-collaboration/patient/record-requests/${requestId}/approve`);
      toast.success("Access granted! Your medical records have been shared with the doctor.");
      await loadConsentData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to grant record access");
      loadConsentData();
    } finally {
      setProcessingId(null);
    }
  };

  // Reject Doctor Access Request with OPTIMISTIC UI update
  const handleRejectRequest = async (requestId: string) => {
    setProcessingId(requestId);
    // Optimistic UI update
    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    try {
      await api.post(`/api/v1/doctor-collaboration/patient/record-requests/${requestId}/reject`);
      toast.info("Record access request declined.");
      await loadConsentData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to decline record access");
      loadConsentData();
    } finally {
      setProcessingId(null);
    }
  };

  // Revoke Doctor Access with OPTIMISTIC UI update
  const handleRevokeDoctorAccess = async (accessItem: DoctorAccessItem) => {
    setRevokingId(accessItem.id);
    const docName = accessItem.doctor_name || "Doctor";

    // 1. Optimistic UI update immediately
    setActiveDoctorAccess((prev) => prev.filter((a) => a.id !== accessItem.id));
    setConsentHistory((prev) => [
      {
        id: `hist-revoke-${Date.now()}`,
        action: "REVOKED",
        created_at: new Date().toISOString(),
        doctor: {
          full_name: accessItem.doctor_name,
          specialization: accessItem.doctor_specialization,
        },
      },
      ...prev,
    ]);

    try {
      // Attempt backend API first
      await api.post("/api/v1/records/patient/revoke-doctor-access", {
        doctor_id: accessItem.doctor_id,
        record_id: accessItem.record_id || undefined,
      });

      // Also ensure direct Supabase record_permissions update
      if (accessItem.permission_id) {
        await supabase
          .from("record_permissions")
          .update({ is_revoked: true })
          .eq("id", accessItem.permission_id);
      } else if (accessItem.record_id) {
        await supabase
          .from("record_permissions")
          .update({ is_revoked: true })
          .eq("record_id", accessItem.record_id)
          .eq("granted_to", accessItem.doctor_id);
      } else {
        // Revoke all for doctor
        await supabase
          .from("record_permissions")
          .update({ is_revoked: true })
          .eq("granted_by", userId)
          .eq("granted_to", accessItem.doctor_id);
      }

      toast.success(`Access revoked for ${formatDoctorName(docName)}. They can no longer view or download this document.`);
      await loadConsentData();
    } catch (err: any) {
      console.warn("API revoke warning, fallback to direct Supabase:", err);
      // Supabase direct fallback
      try {
        if (accessItem.permission_id) {
          await supabase
            .from("record_permissions")
            .update({ is_revoked: true })
            .eq("id", accessItem.permission_id);
        } else if (accessItem.record_id) {
          await supabase
            .from("record_permissions")
            .update({ is_revoked: true })
            .eq("record_id", accessItem.record_id)
            .eq("granted_to", accessItem.doctor_id);
        }

        await supabase.from("consent_history").insert({
          patient_id: userId,
          doctor_id: accessItem.doctor_id,
          action: "REVOKED",
        });

        toast.success(`Access revoked for ${formatDoctorName(docName)}.`);
        await loadConsentData();
      } catch (subErr) {
        toast.error("Failed to revoke access. Please try again.");
        loadConsentData();
      }
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="relative space-y-8 pb-16 max-w-6xl mx-auto">
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
            Monitor and control exactly which doctors have access to your medical records across the MedSync network. Grant or revoke permissions with real-time cryptographic audit logging.
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

      {/* SECTION 1: PENDING DOCTOR RECORD ACCESS REQUESTS */}
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

      {/* SECTION 2: ACTIVE DOCTOR ACCESS & REVOKE CONTROLS (NEW & REQUESTED!) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
      >
        <Card className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-xl shadow-sm">
          <CardHeader className="pb-4 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-500" /> Doctors with Active Document Access
                </CardTitle>
                <CardDescription className="mt-1">
                  Doctors who currently have authorized permission to view your diagnostic reports. You can revoke access at any time.
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                {activeDoctorAccess.length} Active {activeDoctorAccess.length === 1 ? "Permission" : "Permissions"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-2xl bg-muted/50" />
                ))}
              </div>
            ) : activeDoctorAccess.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border rounded-2xl bg-muted/20 border-dashed">
                <div className="p-3.5 bg-muted/60 rounded-full mb-3 text-muted-foreground">
                  <ShieldCheck className="h-8 w-8 text-emerald-500/70" />
                </div>
                <p className="text-base font-semibold text-foreground">No active doctor permissions</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Your medical records are completely private. When an attending physician requests access and you grant permission, they will appear here with one-click revocation.
                </p>
              </div>
            ) : (
              <div className="grid gap-3.5">
                {activeDoctorAccess.map((access) => (
                  <div
                    key={access.id}
                    className="p-4 rounded-2xl border border-border/60 bg-card/80 hover:border-border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {access.doctor_name.charAt(0).toUpperCase()}
                        </div>
                        <h4 className="font-bold text-sm text-foreground">
                          Dr. {access.doctor_name}
                        </h4>
                        {access.doctor_specialization && (
                          <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                            {access.doctor_specialization}
                          </Badge>
                        )}
                        <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px]">
                          <ShieldCheck className="w-3 h-3 mr-1" /> Active Access
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <FileText className="w-3.5 h-3.5 text-blue-500" />
                          Document: <strong className="text-primary">{access.record_title}</strong>
                        </span>
                        {access.hospital_name && (
                          <>
                            <span>•</span>
                            <span>{access.hospital_name}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Granted on {new Date(access.granted_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs h-9 border-rose-500/30 text-rose-600 hover:bg-rose-500/10 hover:border-rose-500/50 shadow-xs"
                        onClick={() => handleRevokeDoctorAccess(access)}
                        disabled={revokingId === access.id}
                      >
                        {revokingId === access.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        ) : (
                          <UserX className="w-3.5 h-3.5 mr-1.5 text-rose-500" />
                        )}
                        Revoke Access
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* SECTION 3: DOCTOR DOCUMENT ACCESS ACTIVITY AUDIT LOG (NEW & REQUESTED!) */}
      {doctorAccessLogs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-500" /> Doctor Document Access Activity
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Real-time audit log of physicians who viewed or downloaded your medical records.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
                  {doctorAccessLogs.length} Access Event{doctorAccessLogs.length === 1 ? "" : "s"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border/40">
              {doctorAccessLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        Dr. {log.doctor_name}
                      </span>
                      {log.doctor_specialization && (
                        <span className="text-muted-foreground text-[11px]">
                          ({log.doctor_specialization})
                        </span>
                      )}
                      <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30">
                        Viewed Document
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">
                      Document: <strong className="text-foreground">{log.record_title}</strong>
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Accessed on {new Date(log.accessed_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                    Audit Verified
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* SECTION 4: CONSENT AUDIT LOG */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
      >
        <Card className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-xl shadow-lg shadow-emerald-500/[0.02]">
          <CardHeader className="pb-4 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Consent Audit Log</CardTitle>
                <CardDescription className="mt-1">
                  A complete history of data access granted and revoked across healthcare providers.
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
                  You haven&apos;t granted or revoked any data access yet. When a doctor requests access to your records and you grant consent, it will appear here.
                </p>
              </div>
            ) : (
              <div className="relative border-l-2 border-border/40 ml-4 md:ml-6 space-y-8 pb-4">
                {consentHistory.map((item, index) => {
                  const isGranted = item.action.toLowerCase() === "granted";

                  return (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * index }}
                      key={item.id}
                      className="relative pl-6 md:pl-8 group"
                    >
                      <span
                        className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full ring-4 ring-background transition-transform group-hover:scale-125 ${
                          isGranted ? "bg-emerald-500" : "bg-red-500"
                        }`}
                      />
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4 rounded-2xl bg-card border border-border/40 hover:border-emerald-500/30 hover:bg-emerald-500/[0.02] transition-all shadow-xs">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <h4 className="font-semibold text-base">
                              Access {item.action}
                            </h4>
                            {isGranted ? (
                              <Badge
                                variant="outline"
                                className="h-5 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold"
                              >
                                GRANTED
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="h-5 text-[10px] bg-red-500/10 text-red-600 border-red-500/20 font-semibold"
                              >
                                REVOKED
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-foreground/80 font-medium">
                            {formatDoctorName(item.doctor?.full_name || item.doctor_name || "Physician")}{" "}
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
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
