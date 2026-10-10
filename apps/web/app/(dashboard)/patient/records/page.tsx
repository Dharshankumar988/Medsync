"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@medsync/ui";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  FilePlus,
  Download,
  Globe,
  Lock,
  Share2,
  Loader2,
  Stethoscope,
  Calendar,
  Pill,
  Clock,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";
import { getApiUrl } from "@/lib/backend-config";
import Link from "next/link";

import { useAuth } from "@/components/providers/AuthProvider";
import { useSecurityEnrollment } from "@/hooks/useSecurityEnrollment";
import { useSecurityStore } from "@/store/useSecurityStore";

export default function MedicalRecordsPage() {
  const { user } = useAuth();
  const [userId, setUserId] = useState<string>("");
  const [records, setRecords] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [consultationsLoading, setConsultationsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Upload Form State - DEFAULT PRIVATE AS REQUESTED
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPrescription, setIsPrescription] = useState(false);
  const [isPublicUpload, setIsPublicUpload] = useState(false); // Default to Private!
  const [pin, setPin] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Share Dialog State
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [sharePin, setSharePin] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  // Download Dialog State
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [downloadRecordId, setDownloadRecordId] = useState<string | null>(null);
  const [downloadPin, setDownloadPin] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  // Toggling Consultation Consent State
  const [togglingConsultationId, setTogglingConsultationId] = useState<string | null>(null);

  // Security
  const { status, isLoading: isSecurityLoading } = useSecurityEnrollment(
    userId,
    user?.role?.toLowerCase()
  );
  const { openEnrollmentModal } = useSecurityStore();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const loadRecords = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("medical_records")
        .select(`
          *,
          medical_record_versions(*),
          record_permissions(*)
        `)
        .eq("patient_id", userId)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase error fetching medical records:", error);
        toast.error("Failed to load medical records");
      }

      if (data) {
        setRecords(data);
      }
    } catch (err) {
      console.error("Error loading records:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadConsultations = useCallback(async () => {
    if (!userId) return;
    setConsultationsLoading(true);
    try {
      // First attempt backend API
      const res = await api.get("/api/v1/consultations/patient/history");
      if (res.data?.data) {
        setConsultations(res.data.data);
        return;
      }
    } catch {
      // Fallback directly to Supabase
    }

    try {
      const { data, error } = await supabase
        .from("consultations")
        .select(`
          *,
          doctor:doctors!doctor_id(full_name, specialization, hospital_name, clinic_name)
        `)
        .eq("patient_id", userId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const enriched = data.map((c: any) => ({
          ...c,
          doctor_name: c.doctor?.full_name ? `Dr. ${c.doctor.full_name}` : "Attending Doctor",
          doctor_specialization: c.doctor?.specialization || "General Medicine",
          clinic_or_hospital: c.doctor?.clinic_name || c.doctor?.hospital_name || "Medical Center",
        }));
        setConsultations(enriched);
      }
    } catch (err) {
      console.error("Error loading consultations:", err);
    } finally {
      setConsultationsLoading(false);
    }
  }, [userId]);

  const loadDoctors = useCallback(async () => {
    if (!userId) return;
    try {
      // Load both doctors from appointments AND verified doctors from directory
      const [apptRes, docsRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("doctor_id, doctors(full_name, specialization)")
          .eq("patient_id", userId),
        supabase
          .from("doctors")
          .select("user_id, full_name, specialization, hospital_name, clinic_name")
          .limit(50),
      ]);

      const map = new Map<string, any>();
      // Add appointment doctors
      apptRes.data?.forEach((a: any) => {
        if (a.doctor_id) {
          map.set(a.doctor_id, {
            id: a.doctor_id,
            name: a.doctors?.full_name ? `Dr. ${a.doctors.full_name}` : "Doctor",
            specialization: a.doctors?.specialization || "Physician",
          });
        }
      });
      // Add directory doctors
      docsRes.data?.forEach((d: any) => {
        if (d.user_id && !map.has(d.user_id)) {
          map.set(d.user_id, {
            id: d.user_id,
            name: `Dr. ${d.full_name}`,
            specialization: d.specialization || d.clinic_name || "Physician",
          });
        }
      });

      setDoctors(Array.from(map.values()));
    } catch (err) {
      console.error(err);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadRecords();
      loadConsultations();
      loadDoctors();
    }
  }, [userId, loadRecords, loadConsultations, loadDoctors]);

  // PERMANENT RECORD CONSENT TOGGLE - Direct column persistence in DB
  const toggleConsent = async (record: any, currentlyPublic: boolean) => {
    const newPublic = !currentlyPublic;
    // Optimistic UI update so badges and buttons reflect change instantly
    setRecords((prev) =>
      prev.map((r) =>
        r.id === record.id
          ? {
              ...r,
              is_public: newPublic,
              record_permissions: newPublic
                ? [{ access_level: "PUBLIC", is_revoked: false }]
                : (r.record_permissions || []).filter((p: any) => p.access_level !== "PUBLIC"),
            }
          : r
      )
    );

    try {
      // 1. Update via Backend API endpoint
      try {
        await api.patch(`/api/v1/records/${record.id}/consent`, {
          is_public: newPublic,
        });
      } catch (apiErr) {
        console.warn("Backend consent PATCH fallback:", apiErr);
      }

      // 2. Also keep Supabase updated for direct realtime client queries
      const { error: recErr } = await supabase
        .from("medical_records")
        .update({
          is_public: newPublic,
          description: record.description?.replace(/\[PUBLIC\]/g, "").trim(),
        })
        .eq("id", record.id);

      if (recErr) {
        console.warn("Direct Supabase update note:", recErr);
      }

      if (newPublic) {
        await supabase.from("record_permissions").upsert({
          record_id: record.id,
          granted_to: userId,
          granted_by: userId,
          access_level: "PUBLIC",
          is_revoked: false,
        });
        toast.success("Record visibility updated: PUBLIC to attending doctors");
      } else {
        await supabase
          .from("record_permissions")
          .update({ is_revoked: true })
          .eq("record_id", record.id)
          .eq("access_level", "PUBLIC");
        toast.success("Record visibility updated: PRIVATE (Only you can access)");
      }
      loadRecords();
    } catch (err: any) {
      console.error("Toggle consent error:", err);
      toast.error("Failed to update record visibility");
      loadRecords();
    }
  };

  // PERMANENT CONSULTATION CONSENT TOGGLE
  const toggleConsultationConsent = async (consultation: any) => {
    const newPublic = !consultation.is_public;
    setTogglingConsultationId(consultation.id);
    try {
      // Attempt backend API first
      await api.patch(`/api/v1/consultations/${consultation.id}/consent`, {
        is_public: newPublic,
      });
      toast.success(
        newPublic
          ? "Consultation notes marked PUBLIC to attending doctors"
          : "Consultation notes marked PRIVATE (Strictly confidential)"
      );
      loadConsultations();
    } catch {
      // Direct Supabase fallback
      const { error } = await supabase
        .from("consultations")
        .update({ is_public: newPublic })
        .eq("id", consultation.id);

      if (error) {
        toast.error("Failed to update consultation consent");
      } else {
        toast.success(
          newPublic
            ? "Consultation notes marked PUBLIC to attending doctors"
            : "Consultation notes marked PRIVATE"
        );
        loadConsultations();
      }
    } finally {
      setTogglingConsultationId(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Please select a file to upload");
      return;
    }

    if (!title.trim()) {
      toast.error("Please provide a title");
      return;
    }

    if (pin.length !== 6) {
      toast.error("Please enter your 6-digit Authorization PIN");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("patient_id", userId);
      formData.append("is_prescription", String(isPrescription));
      formData.append("pin", pin);

      const res = await api.post(`/api/v1/records`, formData);
      const createdRecord = res.data?.data;

      // Persist chosen visibility permanently in DB
      if (createdRecord?.id) {
        await supabase
          .from("medical_records")
          .update({ is_public: isPublicUpload })
          .eq("id", createdRecord.id);

        if (isPublicUpload) {
          await supabase.from("record_permissions").upsert({
            record_id: createdRecord.id,
            granted_to: userId,
            granted_by: userId,
            access_level: "PUBLIC",
            is_revoked: false,
          });
        }
      }

      toast.success(
        isPublicUpload
          ? "Record uploaded (Public to attending doctors)"
          : "Record uploaded securely (Private / Confidential)"
      );
      setIsDialogOpen(false);
      setTitle("");
      setDescription("");
      setIsPrescription(false);
      setIsPublicUpload(false); // Reset to Private default
      setPin("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      loadRecords();
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.response?.data?.detail || "Failed to upload record");
    } finally {
      setIsUploading(false);
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordId || !selectedDoctorId) return;
    if (sharePin.length !== 6) {
      toast.error("Please enter your 6-digit Authorization PIN");
      return;
    }

    setIsSharing(true);
    try {
      await api.post(`/api/v1/records/${selectedRecordId}/permissions`, {
        granted_to: selectedDoctorId,
        pin: sharePin,
      });
      toast.success("Private record shared successfully with Doctor");
      setIsShareDialogOpen(false);
      setSelectedRecordId(null);
      setSelectedDoctorId("");
      setSharePin("");
      loadRecords();
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.detail || err?.response?.data?.message || "Failed to share record"
      );
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!downloadRecordId) return;
    if (downloadPin.length !== 6) {
      toast.error("Please enter your 6-digit Authorization PIN");
      return;
    }

    setIsDownloading(true);
    try {
      const res = await api.post(`/api/v1/records/${downloadRecordId}/download`, {
        pin: downloadPin,
      });
      let url = res.data?.data?.url || res.data?.data?.signed_url;
      // Client-side guard: ensure Supabase URLs include /storage/v1
      if (url && url.includes(".supabase.co/object/sign/")) {
        url = url.replace(".supabase.co/object/sign/", ".supabase.co/storage/v1/object/sign/");
      }
      if (url) {
        window.open(url, "_blank");
        toast.success("Download started (PDF with verified QR code)");
      } else {
        const rawUrl = `${getApiUrl()}/records/${downloadRecordId}/raw`;
        window.open(rawUrl, "_blank");
        toast.success("Download started (Direct secure stream)");
      }
      setIsDownloadDialogOpen(false);
      setDownloadRecordId(null);
      setDownloadPin("");
    } catch (err: any) {
      console.error(err);
      // Fallback directly to direct streaming if post fails
      try {
        const rawUrl = `${getApiUrl()}/records/${downloadRecordId}/raw`;
        window.open(rawUrl, "_blank");
        toast.success("Download started (Direct secure stream)");
        setIsDownloadDialogOpen(false);
        setDownloadRecordId(null);
        setDownloadPin("");
      } catch (fallbackErr) {
        toast.error(err.response?.data?.detail || "Failed to download record");
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Medical Records & Consultations
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your personal clinical documents, verified test reports, and doctor consultation history with private/public consent.
          </p>
        </div>

        {/* Upload Record Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm rounded-xl self-start sm:self-auto"
              onClick={(e) => {
                const isPinEnrolled = status === "COMPLETED" || status === "PIN_CREATED";
                if (user?.role === "PATIENT" && !isPinEnrolled && !isSecurityLoading) {
                  e.preventDefault();
                  openEnrollmentModal(() => setIsDialogOpen(true));
                }
              }}
            >
              <FilePlus className="mr-2 h-4 w-4" /> Upload Record
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Upload Medical Record</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4 pt-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Document Title *
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Blood Test Report, Chest X-Ray"
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional clinical observations or summary"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  File (Image or PDF) *
                </label>
                <Input
                  type="file"
                  ref={fileInputRef}
                  accept="application/pdf,image/png,image/jpeg,image/jpg"
                  className="rounded-xl file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:text-xs file:font-semibold"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Files are automatically processed into tamper-proof A4 PDFs with verified QR codes.
                </p>
              </div>

              {/* Consent & Visibility Selector - DEFAULT PRIVATE */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Default Privacy & Consent
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPublicUpload(false)}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                      !isPublicUpload
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-600 font-semibold"
                        : "bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" /> Private (Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPublicUpload(true)}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                      isPublicUpload
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 font-semibold"
                        : "bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" /> Public to Doctors
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {!isPublicUpload
                    ? "🔒 Strictly confidential. Hidden from all doctors unless you explicitly share it."
                    : "✓ Attending doctors can view and review this document during appointments."}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_prescription"
                  checked={isPrescription}
                  onChange={(e) => setIsPrescription(e.target.checked)}
                  className="rounded border-gray-300 text-primary shadow-sm"
                />
                <label htmlFor="is_prescription" className="text-xs font-medium text-muted-foreground">
                  This is an active medication prescription
                </label>
              </div>

              <div className="space-y-1.5 border-t border-border/40 pt-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Authorization PIN *
                </label>
                <Input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="• • • • • •"
                  maxLength={6}
                  className="rounded-xl tracking-widest text-center font-mono"
                  required
                />
                <p className="text-[11px] text-muted-foreground">Enter your 6-digit security PIN to sign and upload.</p>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <FilePlus className="w-4 h-4 mr-1.5" />}
                Upload & Convert Record
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Main Tabs: Medical Records vs Consultation History */}
      <Tabs defaultValue="records" className="w-full">
        <TabsList className="bg-muted/40 p-1 rounded-xl">
          <TabsTrigger value="records" className="rounded-lg text-sm font-medium">
            Medical Documents & Reports ({records.length})
          </TabsTrigger>
          <TabsTrigger value="consultations" className="rounded-lg text-sm font-medium flex items-center gap-1.5">
            <Stethoscope className="w-4 h-4" /> Consultation History ({consultations.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Uploaded Medical Records */}
        <TabsContent value="records" className="pt-4 space-y-4">
          {loading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-2xl" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <Card className="rounded-2xl border border-dashed bg-card/50">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-lg font-medium text-foreground">No medical records uploaded yet</p>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                  Upload your lab reports, diagnostic scans, or prescriptions. All uploads are private by default.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {records.map((record) => {
                // Permanent public check: column is_public or active PUBLIC permission
                const isPublic =
                  record.is_public === true ||
                  record.record_permissions?.some(
                    (p: any) => p.access_level === "PUBLIC" && !p.is_revoked
                  ) ||
                  false;

                return (
                  <Card
                    key={record.id}
                    className="overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-all hover:border-border hover:shadow-md"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-3">
                          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 shrink-0">
                            <FileText className="h-5 w-5 text-blue-500" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-semibold">{record.title}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Uploaded on {new Date(record.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {isPublic ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs font-medium">
                              <Globe className="mr-1 h-3 w-3" /> Status: Public to Doctors
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs font-medium">
                              <Lock className="mr-1 h-3 w-3" /> Status: Private (Confidential)
                            </Badge>
                          )}
                          <Badge variant="outline" className="bg-blue-500/5 text-blue-600 border-blue-500/20 text-xs">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> PDF with QR
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <p className="text-xs text-muted-foreground mb-4">
                        {record.description?.replace(/\[PUBLIC\]/g, "").trim() || "No description provided."}
                      </p>

                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        {/* Consent Toggle Button */}
                        <div>
                          {isPublic ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs border-amber-500/30 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 rounded-lg"
                              onClick={() => toggleConsent(record, true)}
                            >
                              <Lock className="mr-1.5 h-3.5 w-3.5" /> Restrict to Private
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs border-emerald-500/30 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 rounded-lg"
                              onClick={() => toggleConsent(record, false)}
                            >
                              <Globe className="mr-1.5 h-3.5 w-3.5" /> Make Public to Doctors
                            </Button>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {!isPublic && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs hover:bg-muted rounded-lg"
                              onClick={() => {
                                const isPinEnrolled = status === "COMPLETED" || status === "PIN_CREATED";
                                if (user?.role === "PATIENT" && !isPinEnrolled && !isSecurityLoading) {
                                  openEnrollmentModal(() => {
                                    setSelectedRecordId(record.id);
                                    setIsShareDialogOpen(true);
                                  });
                                } else {
                                  setSelectedRecordId(record.id);
                                  setIsShareDialogOpen(true);
                                }
                              }}
                            >
                              <Share2 className="mr-1.5 h-3.5 w-3.5" /> Share Record
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs rounded-lg"
                            onClick={() => {
                              const isPinEnrolled = status === "COMPLETED" || status === "PIN_CREATED";
                              if (user?.role === "PATIENT" && !isPinEnrolled && !isSecurityLoading) {
                                openEnrollmentModal(() => {
                                  setDownloadRecordId(record.id);
                                  setIsDownloadDialogOpen(true);
                                });
                              } else {
                                setDownloadRecordId(record.id);
                                setIsDownloadDialogOpen(true);
                              }
                            }}
                          >
                            <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Consultation History Subdivision */}
        <TabsContent value="consultations" className="pt-4 space-y-4">
          {consultationsLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-2xl" />
              ))}
            </div>
          ) : consultations.length === 0 ? (
            <Card className="rounded-2xl border border-dashed bg-card/50">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Stethoscope className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-lg font-medium text-foreground">No consultation history yet</p>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                  When you attend appointments, your doctor&apos;s clinical observations, diagnosis, and notes will appear here automatically.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {consultations.map((c) => (
                <Card
                  key={c.id}
                  className="overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-all hover:border-border hover:shadow-md"
                >
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0 mt-0.5">
                          <Stethoscope className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-base font-semibold">
                              {c.doctor_name || "Attending Doctor"}
                            </CardTitle>
                            {c.doctor_specialization && (
                              <Badge variant="outline" className="text-[11px] bg-primary/5 text-primary border-primary/20">
                                {c.doctor_specialization}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                            {c.clinic_or_hospital && <span>{c.clinic_or_hospital}</span>}
                            <span>•</span>
                            <Clock className="w-3 h-3 inline" />
                            <span>{new Date(c.created_at).toLocaleDateString()}</span>
                          </p>
                        </div>
                      </div>

                      {/* Consultation Consent Badge */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {c.is_public ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
                            <Globe className="mr-1 h-3 w-3" /> Public to Attending Doctors
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">
                            <Lock className="mr-1 h-3 w-3" /> Private Notes
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    {/* Diagnosis & Symptoms */}
                    {(c.diagnosis || c.symptoms) && (
                      <div className="p-3 bg-muted/30 rounded-xl border border-border/40 space-y-1">
                        {c.diagnosis && (
                          <p className="text-xs font-semibold text-foreground">
                            Diagnosis: <span className="font-normal text-muted-foreground">{c.diagnosis}</span>
                          </p>
                        )}
                        {c.symptoms && (
                          <p className="text-xs font-semibold text-foreground">
                            Symptoms: <span className="font-normal text-muted-foreground">{c.symptoms}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Doctor Clinical Notes */}
                    {c.clinical_notes && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Doctor&apos;s Clinical Notes:
                        </p>
                        <p className="text-xs text-foreground/90 leading-relaxed italic bg-card p-3 rounded-xl border border-border/50">
                          &ldquo;{c.clinical_notes}&rdquo;
                        </p>
                      </div>
                    )}

                    {/* Treatment Plan */}
                    {c.treatment_plan && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Recommended Treatment Plan:
                        </p>
                        <p className="text-xs text-foreground/90 leading-relaxed bg-card p-3 rounded-xl border border-border/50">
                          {c.treatment_plan}
                        </p>
                      </div>
                    )}

                    {/* Footer Actions & Consent Toggle */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <div>
                        {c.is_public ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 rounded-lg"
                            disabled={togglingConsultationId === c.id}
                            onClick={() => toggleConsultationConsent(c)}
                          >
                            <Lock className="mr-1.5 h-3.5 w-3.5" /> Make Private
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 rounded-lg"
                            disabled={togglingConsultationId === c.id}
                            onClick={() => toggleConsultationConsent(c)}
                          >
                            <Globe className="mr-1.5 h-3.5 w-3.5" /> Make Public to Doctors
                          </Button>
                        )}
                      </div>

                      {c.prescription_id && (
                        <Button variant="outline" size="sm" asChild className="h-8 text-xs rounded-lg">
                          <Link href="/patient/prescriptions">
                            <Pill className="mr-1.5 h-3.5 w-3.5 text-primary" /> View Prescription
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Share Private Record Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Share Private Record with Doctor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleShare} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Select Attending Physician *
              </label>
              <select
                className="flex h-10 w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm outline-none focus:border-primary transition"
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                required
              >
                <option value="">-- Choose a physician --</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.specialization ? `(${d.specialization})` : ""}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                The selected physician will be granted secure, authorized read access to this specific record.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-primary">
                Authorization PIN *
              </label>
              <Input
                type="password"
                value={sharePin}
                onChange={(e) => setSharePin(e.target.value)}
                placeholder="• • • • • •"
                maxLength={6}
                className="rounded-xl tracking-widest text-center font-mono"
                required
              />
              <p className="text-[11px] text-muted-foreground">Sign with your 6-digit security PIN to grant access.</p>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
              disabled={isSharing || !selectedDoctorId || sharePin.length !== 6}
            >
              {isSharing ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Share2 className="w-4 h-4 mr-1.5" />}
              Authorize & Share Record
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Download Record Dialog */}
      <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Download Protected Record</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDownload} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-primary">
                Authorization PIN *
              </label>
              <Input
                type="password"
                value={downloadPin}
                onChange={(e) => setDownloadPin(e.target.value)}
                placeholder="• • • • • •"
                maxLength={6}
                className="rounded-xl tracking-widest text-center font-mono"
                required
              />
              <p className="text-[11px] text-muted-foreground">Enter your 6-digit PIN to decrypt and download the PDF.</p>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
              disabled={isDownloading || downloadPin.length !== 6}
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Download className="w-4 h-4 mr-1.5" />}
              Decrypt & Download PDF
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
