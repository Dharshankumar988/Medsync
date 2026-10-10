"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Skeleton,
  Input,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@medsync/ui";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  Search,
  Globe,
  Lock,
  MessageSquare,
  Loader2,
  Send,
  FileQuestion,
  UserCheck,
  XCircle,
  Clock,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.05 } } };

interface DoctorDirectoryItem {
  id: string;
  user_id: string;
  full_name: string;
  specialization?: string | null;
  hospital_name?: string | null;
  clinic_name?: string | null;
}

export default function DoctorMedicalRecordsPage() {
  const searchParams = useSearchParams();
  const filterPatientId = searchParams.get("patient_id");

  const [userId, setUserId] = useState<string>("");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Clinical Note Modal
  const [selectedRecordForNote, setSelectedRecordForNote] = useState<any | null>(null);
  const [noteText, setNoteText] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Referral Modal State
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [selectedRecordForReferral, setSelectedRecordForReferral] = useState<any | null>(null);
  const [referralTargetDoctorId, setReferralTargetDoctorId] = useState("");
  const [referralReason, setReferralReason] = useState("");
  const [referralNotes, setReferralNotes] = useState("");
  const [referralSpecialization, setReferralSpecialization] = useState("");
  const [isSubmittingReferral, setIsSubmittingReferral] = useState(false);

  // Record Requests State
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  // New Record Request Dialog State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [doctorDirectory, setDoctorDirectory] = useState<DoctorDirectoryItem[]>([]);
  const [patientList, setPatientList] = useState<any[]>([]);
  const [targetDoctorId, setTargetDoctorId] = useState("");
  const [requestPatientId, setRequestPatientId] = useState(filterPatientId || "");
  const [requestReason, setRequestReason] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const loadRecords = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // 1. Try backend API first (fetches with service privileges)
      try {
        const url = filterPatientId 
          ? `/api/v1/records/doctor-records?patient_id=${filterPatientId}` 
          : `/api/v1/records/doctor-records`;
        const res = await api.get(url);
        if (res.data?.data && Array.isArray(res.data.data)) {
          const formatted = res.data.data.map((r: any) => ({
            id: r.id,
            title: r.title,
            description: r.description,
            patient_id: r.patient_id,
            uploaded_by: r.uploaded_by,
            created_at: r.created_at,
            isPublic: r.is_public,
            isDirectShared: r.is_direct_shared,
            patient: { full_name: r.patient_name || "Patient" },
            medical_record_versions: [
              {
                id: r.id,
                is_current: true,
                doctor_notes: r.doctor_notes || []
              }
            ]
          }));
          setRecords(formatted);
          setLoading(false);
          return;
        }
      } catch (backendErr) {
        console.warn("Backend doctor-records fetch failed, falling back to Supabase client:", backendErr);
      }

      // 2. Fallback to direct client query
      const { data: permissions } = await supabase
        .from("record_permissions")
        .select("record_id, access_level, granted_to, is_revoked")
        .eq("is_revoked", false);

      const publicRecordIds = new Set<string>();
      const directlySharedRecordIds = new Set<string>();

      permissions?.forEach((p: any) => {
        if (p.access_level === "PUBLIC") {
          publicRecordIds.add(p.record_id);
        } else if (p.granted_to === userId) {
          directlySharedRecordIds.add(p.record_id);
        }
      });

      let query = supabase
        .from("medical_records")
        .select(`
          *,
          patient:users!patient_id ( full_name ),
          medical_record_versions(*, doctor_notes(*))
        `)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (filterPatientId) {
        query = query.eq("patient_id", filterPatientId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const allowedRecords = (data || [])
        .filter((r: any) => {
          const isPub =
            publicRecordIds.has(r.id) ||
            (r.description && r.description.includes("[PUBLIC]"));
          const isShared = directlySharedRecordIds.has(r.id);
          const isOwnUpload = r.uploaded_by === userId;
          return isPub || isShared || isOwnUpload;
        })
        .map((r: any) => {
          const isPub =
            publicRecordIds.has(r.id) ||
            (r.description && r.description.includes("[PUBLIC]"));
          const isShared = directlySharedRecordIds.has(r.id);
          return {
            ...r,
            isPublic: isPub,
            isDirectShared: isShared,
          };
        });

      if (allowedRecords.length > 0) {
        const patientIds = [...new Set(allowedRecords.map((r) => r.patient_id))];
        const { data: patients } = await supabase
          .from("patients")
          .select("user_id, full_name")
          .in("user_id", patientIds);

        const enhancedData = allowedRecords.map((r) => {
          const p = patients?.find((pat) => pat.user_id === r.patient_id);
          return {
            ...r,
            patient: { full_name: p?.full_name || r.patient?.full_name || "Patient" },
          };
        });
        setRecords(enhancedData);
      } else {
        setRecords([]);
      }
    } catch (err) {
      console.error("Error loading patient records", err);
    } finally {
      setLoading(false);
    }
  }, [userId, filterPatientId]);

  const loadRequests = useCallback(async () => {
    if (!userId) return;
    try {
      setRequestsLoading(true);
      const [incRes, outRes] = await Promise.all([
        api.get("/api/v1/doctor-collaboration/record-requests/incoming"),
        api.get("/api/v1/doctor-collaboration/record-requests/outgoing"),
      ]);
      setIncomingRequests(incRes.data?.data || []);
      setOutgoingRequests(outRes.data?.data || []);
    } catch (err) {
      console.error("Error fetching record requests:", err);
    } finally {
      setRequestsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadRecords();
      loadRequests();
    }
  }, [userId, loadRecords, loadRequests]);

  const handleOpenRequestModal = async () => {
    setIsRequestModalOpen(true);
    try {
      const [docRes, patRes] = await Promise.all([
        api.get("/api/v1/doctor-collaboration/directory"),
        supabase.from("patients").select("user_id, full_name").limit(100),
      ]);
      setDoctorDirectory(docRes.data?.data || []);
      setPatientList(patRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    setProcessingRequestId(requestId);
    try {
      await api.post(`/api/v1/doctor-collaboration/record-requests/${requestId}/approve`);
      toast.success("Record request approved. Access has been granted to the requesting physician.");
      loadRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to approve record request");
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessingRequestId(requestId);
    try {
      await api.post(`/api/v1/doctor-collaboration/record-requests/${requestId}/reject`);
      toast.info("Record request declined.");
      loadRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to decline record request");
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleSubmitRecordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestPatientId || !requestReason.trim()) {
      toast.error("Please select a patient and provide a reason");
      return;
    }

    setIsSubmittingRequest(true);
    try {
      await api.post("/api/v1/doctor-collaboration/record-requests", {
        patient_id: requestPatientId,
        target_doctor_id: targetDoctorId || undefined,
        reason: requestReason.trim(),
      });
      toast.success("Record request submitted successfully. Attending doctor has been notified.");
      setIsRequestModalOpen(false);
      setRequestReason("");
      setTargetDoctorId("");
      loadRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to submit record request");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleDownload = async (recordId: string) => {
    setDownloadingId(recordId);
    try {
      const res = await api.post(`/api/v1/records/${recordId}/download`, {});
      const url = res.data?.data?.url || res.data?.data?.signed_url;
      if (url) {
        let downloadUrl = url;
        if (downloadUrl.startsWith("/")) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
          downloadUrl = `${supabaseUrl.replace(/\/$/, "")}${downloadUrl}`;
        }
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.download = `medical_record_${recordId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Document downloaded (PDF with verified QR code)");
      } else {
        toast.error("Download URL not found");
      }
    } catch (err: any) {
      console.error("Download error:", err);
      toast.error(err.response?.data?.detail || "Failed to download patient record");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenReferralModal = async (record: any) => {
    setSelectedRecordForReferral(record);
    setReferralReason("");
    setReferralNotes("");
    setReferralTargetDoctorId("");
    setReferralSpecialization("");
    setIsReferralModalOpen(true);
    try {
      const docRes = await api.get("/api/v1/doctor-collaboration/directory");
      setDoctorDirectory(docRes.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForReferral || !referralTargetDoctorId || !referralReason.trim()) {
      toast.error("Please select a target doctor and specify a referral reason");
      return;
    }

    setIsSubmittingReferral(true);
    try {
      const targetDoc = doctorDirectory.find((d) => d.user_id === referralTargetDoctorId);
      
      // 1. Submit referral with physician clinical notes
      await api.post("/api/v1/doctor-collaboration/referrals", {
        patient_id: selectedRecordForReferral.patient_id,
        referred_to_doctor_id: referralTargetDoctorId,
        specialization: referralSpecialization || targetDoc?.specialization || undefined,
        reason: referralReason.trim(),
        notes: referralNotes.trim() || undefined,
      });

      // 2. Also log referral note directly on this medical record if notes provided
      if (referralNotes.trim()) {
        await api.post(`/api/v1/records/${selectedRecordForReferral.id}/notes`, {
          note_text: `[Specialist Referral to Dr. ${targetDoc?.full_name || 'Physician'}]: ${referralNotes.trim()}`,
        }).catch(() => null);
      }

      toast.success(`Referral and clinical notes submitted to Dr. ${targetDoc?.full_name || "Specialist"}`);
      setIsReferralModalOpen(false);
      setSelectedRecordForReferral(null);
      setReferralTargetDoctorId("");
      setReferralReason("");
      setReferralNotes("");
      setReferralSpecialization("");
      loadRecords();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to submit doctor referral");
    } finally {
      setIsSubmittingReferral(false);
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForNote || !noteText.trim()) return;

    setIsSubmittingNote(true);
    try {
      await api.post(`/api/v1/records/${selectedRecordForNote.id}/notes`, {
        note_text: noteText.trim(),
      });
      toast.success("Clinical note added and saved to patient record");
      setSelectedRecordForNote(null);
      setNoteText("");
      loadRecords();
    } catch (err: any) {
      console.error("Note save error:", err);
      toast.error(err.response?.data?.detail || "Failed to save clinical note");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const pendingIncomingCount = incomingRequests.filter((r) => r.status === "PENDING").length;

  const filteredRecords = records.filter(
    (r) =>
      (r.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.patient?.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative space-y-8 pb-12 max-w-7xl mx-auto">
      {/* Top Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
            Medical Records & Collaboration
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
            Access authorized patient medical records and request diagnostic documentation from other attending physicians.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button
            onClick={handleOpenRequestModal}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm rounded-xl flex items-center gap-2"
          >
            <FileQuestion className="w-4 h-4" /> Request Records from Doctor
          </Button>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search records or patients..."
              className="pl-9 rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="records" className="w-full">
        <TabsList className="bg-muted/40 p-1 rounded-xl">
          <TabsTrigger value="records" className="rounded-lg text-sm font-medium">
            Active Records ({records.length})
          </TabsTrigger>
          <TabsTrigger value="incoming" className="rounded-lg text-sm font-medium flex items-center gap-2">
            Incoming Record Requests
            {pendingIncomingCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[11px] bg-primary text-primary-foreground">
                {pendingIncomingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="rounded-lg text-sm font-medium">
            My Sent Requests ({outgoingRequests.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Active Records */}
        <TabsContent value="records" className="pt-6 space-y-6">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-44 w-full rounded-2xl" />
              ))}
            </div>
          ) : filteredRecords.length === 0 ? (
            <Card className="rounded-2xl border border-dashed bg-card/50">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <Globe className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-lg font-medium text-foreground">No patient records found</p>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                  Once patients mark records as Public, share them directly, or other doctors approve your record request, they will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <motion.div
              className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
              initial="hidden"
              animate="visible"
              variants={stagger}
            >
              {filteredRecords.map((record) => {
                const currentVersion =
                  record.medical_record_versions?.find((v: any) => v.is_current) ||
                  record.medical_record_versions?.[0];
                const doctorNotes = currentVersion?.doctor_notes || [];

                return (
                  <motion.div key={record.id} variants={fadeUp}>
                    <Card className="group overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col h-full">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 mb-3">
                            <FileText className="h-5 w-5 text-blue-500" />
                          </div>
                          <div className="flex flex-col items-end gap-1.5 text-right">
                            {record.isPublic ? (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
                                <Globe className="mr-1 h-3 w-3" /> Public Record
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs">
                                <Lock className="mr-1 h-3 w-3" /> Directly Shared
                              </Badge>
                            )}
                            <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20 text-[10px]">
                              <CheckCircle2 className="mr-1 h-2.5 w-2.5" /> PDF with QR
                            </Badge>
                          </div>
                        </div>
                        <CardTitle className="text-base line-clamp-1">{record.title}</CardTitle>
                        <p className="text-xs font-medium text-emerald-600">Patient: {record.patient?.full_name}</p>
                      </CardHeader>
                      <CardContent className="flex flex-col flex-1">
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {record.description || "No description provided."}
                        </p>

                        {doctorNotes.length > 0 && (
                          <div className="mb-3 p-2.5 bg-muted/40 rounded-xl border border-border/50 space-y-1">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                              <MessageSquare className="w-3 h-3 text-primary" /> Doctor Referral Notes:
                            </span>
                            {doctorNotes.map((n: any, idx: number) => (
                              <p key={idx} className="text-xs text-foreground/90 italic pl-1 border-l-2 border-primary/50">
                                &ldquo;{n.note_text}&rdquo;
                              </p>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                          <span className="text-xs text-muted-foreground">
                            {new Date(record.created_at).toLocaleDateString()}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 rounded-lg"
                              onClick={() => handleOpenReferralModal(record)}
                            >
                              <Send className="mr-1 h-3.5 w-3.5" /> Refer
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground rounded-lg"
                              onClick={() => {
                                setSelectedRecordForNote(record);
                                setNoteText("");
                              }}
                            >
                              <MessageSquare className="mr-1 h-3.5 w-3.5" /> Add Note
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white border-transparent shadow-sm rounded-lg"
                              disabled={downloadingId === record.id}
                              onClick={() => handleDownload(record.id)}
                            >
                              {downloadingId === record.id ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Download className="mr-1.5 h-3.5 w-3.5" />
                              )}
                              Download PDF
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </TabsContent>

        {/* Tab 2: Incoming Record Requests */}
        <TabsContent value="incoming" className="pt-6 space-y-4">
          <Card className="rounded-2xl border border-border/60">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-semibold">Incoming Record Requests</CardTitle>
              <CardDescription>
                Physicians requesting access to medical documents for patients under your clinical supervision.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {requestsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : incomingRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-14 h-14 bg-muted/60 rounded-full flex items-center justify-center mb-3">
                    <UserCheck className="w-7 h-7 text-muted-foreground/60" />
                  </div>
                  <h3 className="text-base font-medium text-foreground">No pending incoming requests</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    When another physician requests patient records from your practice, they will appear here for verification and approval.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground text-sm">
                            {req.patient_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            requested by <strong className="text-foreground">Dr. {req.requesting_doctor_name}</strong>
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[11px] uppercase ${
                              req.status === "PENDING"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                : req.status === "APPROVED"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                : "bg-destructive/10 text-destructive border-destructive/30"
                            }`}
                          >
                            {req.status}
                          </Badge>
                        </div>

                        <p className="text-xs text-foreground/90 font-medium">
                          Clinical Reason: {req.reason}
                        </p>
                        {req.record_title && (
                          <p className="text-xs text-muted-foreground">
                            Specific Record: <strong className="text-foreground">{req.record_title}</strong>
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Received on {new Date(req.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {req.status === "PENDING" ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs rounded-xl border-border/60"
                              disabled={processingRequestId === req.id}
                              onClick={() => handleRejectRequest(req.id)}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1 text-destructive" /> Decline
                            </Button>
                            <Button
                              size="sm"
                              className="text-xs rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white"
                              disabled={processingRequestId === req.id}
                              onClick={() => handleApproveRequest(req.id)}
                            >
                              {processingRequestId === req.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              )}
                              Approve Access
                            </Button>
                          </>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {req.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Outgoing Requests */}
        <TabsContent value="outgoing" className="pt-6 space-y-4">
          <Card className="rounded-2xl border border-border/60">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-semibold">Sent Record Requests</CardTitle>
              <CardDescription>
                Track record access requests you sent to other attending doctors across the system.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {requestsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : outgoingRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-14 h-14 bg-muted/60 rounded-full flex items-center justify-center mb-3">
                    <Send className="w-7 h-7 text-muted-foreground/60" />
                  </div>
                  <h3 className="text-base font-medium text-foreground">No outgoing record requests</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    Click &quot;Request Records from Doctor&quot; to request clinical files and diagnostic records for any patient.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground text-sm">
                            {req.patient_name}
                          </span>
                          {req.target_doctor_name && (
                            <span className="text-xs text-muted-foreground">
                              to <strong className="text-foreground">Dr. {req.target_doctor_name}</strong>
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-[11px] uppercase ${
                              req.status === "PENDING"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                : req.status === "APPROVED"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                : "bg-destructive/10 text-destructive border-destructive/30"
                            }`}
                          >
                            {req.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-foreground/90">Reason: {req.reason}</p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Submitted on {new Date(req.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {req.status === "APPROVED" && (
                        <Button variant="ghost" size="sm" asChild className="text-xs rounded-xl">
                          <a href={`/doctor/records?patient_id=${req.patient_id}`}>
                            View Records <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Clinical / Referral Note Dialog */}
      <Dialog
        open={!!selectedRecordForNote}
        onOpenChange={(open) => !open && setSelectedRecordForNote(null)}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add Clinical & Referral Note</DialogTitle>
          </DialogHeader>
          {selectedRecordForNote && (
            <form onSubmit={handleSaveNote} className="space-y-4 pt-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  Patient: <strong className="text-foreground">{selectedRecordForNote.patient?.full_name}</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  Document: <strong className="text-foreground">{selectedRecordForNote.title}</strong>
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Referral Observation / Clinical Note *
                </label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Enter diagnosis, clinical observations, referral recommendations..."
                  rows={4}
                  className="w-full text-xs bg-muted/40 border border-border/60 rounded-xl p-3 outline-none focus:border-primary transition resize-none"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl"
                disabled={isSubmittingNote || !noteText.trim()}
              >
                {isSubmittingNote ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <Send className="w-4 h-4 mr-1.5" />
                )}
                Save Clinical Note
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Request Medical Records Dialog */}
      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-primary" /> Request Records from Another Doctor
            </DialogTitle>
            <DialogDescription>
              Submit an official request to access medical history or diagnostic files held by another physician.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitRecordRequest} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Select Patient *
              </label>
              <select
                value={requestPatientId}
                onChange={(e) => setRequestPatientId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border/70 bg-background text-sm outline-none focus:border-primary transition"
                required
              >
                <option value="">-- Choose a patient --</option>
                {patientList.map((p) => (
                  <option key={p.user_id} value={p.user_id}>
                    {p.full_name} (ID: {p.user_id?.slice(0, 8)}...)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Target Doctor Holding Records (Optional)
              </label>
              <select
                value={targetDoctorId}
                onChange={(e) => setTargetDoctorId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border/70 bg-background text-sm outline-none focus:border-primary transition"
              >
                <option value="">-- Any attending doctor / Direct Request --</option>
                {doctorDirectory.map((doc) => (
                  <option key={doc.user_id} value={doc.user_id}>
                    Dr. {doc.full_name} {doc.specialization ? `(${doc.specialization})` : ""} {doc.hospital_name ? `• ${doc.hospital_name}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Clinical Reason for Request *
              </label>
              <textarea
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="State why these records are needed (e.g. Second opinion, pre-surgical assessment, comprehensive treatment planning)..."
                rows={3}
                className="w-full text-sm bg-muted/40 border border-border/60 rounded-xl p-3 outline-none focus:border-primary transition resize-none"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRequestModalOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingRequest || !requestPatientId || !requestReason.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
              >
                {isSubmittingRequest ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <Send className="w-4 h-4 mr-1.5" />
                )}
                Submit Request
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Refer Patient to Specialist Dialog */}
      <Dialog open={isReferralModalOpen} onOpenChange={setIsReferralModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" /> Refer Patient to Specialist Doctor
            </DialogTitle>
            <DialogDescription>
              Collaborate and refer this patient with diagnostic documentation and clinical physician notes.
            </DialogDescription>
          </DialogHeader>

          {selectedRecordForReferral && (
            <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-xs space-y-1">
              <p>
                <strong>Patient:</strong> {selectedRecordForReferral.patient?.full_name}
              </p>
              <p>
                <strong>Record:</strong> {selectedRecordForReferral.title}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmitReferral} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Select Consulting Specialist Doctor *
              </label>
              <select
                value={referralTargetDoctorId}
                onChange={(e) => {
                  const docId = e.target.value;
                  setReferralTargetDoctorId(docId);
                  const doc = doctorDirectory.find((d) => d.user_id === docId);
                  if (doc?.specialization) setReferralSpecialization(doc.specialization);
                }}
                className="w-full h-10 px-3 rounded-xl border border-border/70 bg-background text-sm outline-none focus:border-primary transition"
                required
              >
                <option value="">-- Choose a doctor --</option>
                {doctorDirectory
                  .filter((d) => d.user_id !== userId)
                  .map((doc) => (
                    <option key={doc.user_id} value={doc.user_id}>
                      Dr. {doc.full_name} {doc.specialization ? `(${doc.specialization})` : ""} {doc.hospital_name ? `• ${doc.hospital_name}` : ""}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Specialization / Clinical Focus
              </label>
              <Input
                value={referralSpecialization}
                onChange={(e) => setReferralSpecialization(e.target.value)}
                placeholder="e.g. Cardiology, Hematology, Orthopedics"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Reason for Referral *
              </label>
              <Input
                value={referralReason}
                onChange={(e) => setReferralReason(e.target.value)}
                placeholder="e.g. Secondary evaluation for blood test abnormalities"
                className="rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Doctor&apos;s Clinical Referral Notes *</span>
                <span className="text-[10px] text-primary font-normal">Sent with referral & saved to record</span>
              </label>
              <textarea
                value={referralNotes}
                onChange={(e) => setReferralNotes(e.target.value)}
                placeholder="Enter your detailed clinical observations, medication concerns, test findings, and specific instructions for the specialist..."
                rows={4}
                className="w-full text-sm bg-muted/40 border border-border/60 rounded-xl p-3 outline-none focus:border-primary transition resize-none"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReferralModalOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingReferral || !referralTargetDoctorId || !referralReason.trim() || !referralNotes.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
              >
                {isSubmittingReferral ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <Send className="w-4 h-4 mr-1.5" />
                )}
                Send Referral with Notes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

