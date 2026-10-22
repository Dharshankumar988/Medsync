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
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  Search,
  Activity,
  History,
  Trash2,
  RefreshCw,
  Eye
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";
import { getApiUrl } from "@/lib/backend-config";
import Link from "next/link";
import { Avatar } from "@medsync/ui/components/avatar";

import { useAuth } from "@/components/providers/AuthProvider";
import { useSecurityEnrollment } from "@/hooks/useSecurityEnrollment";
import { useSecurityStore } from "@/store/useSecurityStore";

interface DoctorItem {
  id: string;
  user_id: string;
  name: string;
  full_name: string;
  specialization?: string;
  hospital_name?: string;
  clinic_name?: string;
  profile_picture_url?: string;
}

interface ActiveDoctorAccessItem {
  id: string;
  permission_id: string;
  record_id: string;
  record_title: string;
  doctor_id: string;
  doctor_name: string;
  doctor_specialization?: string;
  hospital_name?: string;
  access_level: string;
  granted_at: string;
  status: "ACTIVE" | "REVOKED";
}

interface DoctorAccessLogItem {
  id: string;
  record_id: string;
  record_title: string;
  doctor_id: string;
  doctor_name: string;
  doctor_specialization?: string;
  accessed_at: string;
}

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
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
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

  // ─── Privacy & Doctor Consent Management State ─────────────────────────────
  const [activeDoctorAccess, setActiveDoctorAccess] = useState<ActiveDoctorAccessItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [doctorAccessLogs, setDoctorAccessLogs] = useState<DoctorAccessLogItem[]>([]);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [revokingPermissionId, setRevokingPermissionId] = useState<string | null>(null);

  // Per-Record Granular Access Modal
  const [isDoctorAccessModalOpen, setIsDoctorAccessModalOpen] = useState(false);
  const [selectedRecordForAccess, setSelectedRecordForAccess] = useState<any | null>(null);
  const [doctorModalSearch, setDoctorModalSearch] = useState("");
  const [togglingDoctorId, setTogglingDoctorId] = useState<string | null>(null);

  // Privacy tab search/filter
  const [privacySearchQuery, setPrivacySearchQuery] = useState("");

  // Security
  const { status, isLoading: isSecurityLoading } = useSecurityEnrollment(
    user?.id || userId,
    user?.role?.toLowerCase()
  );
  const { openEnrollmentModal } = useSecurityStore();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  // Load records
  const loadRecords = useCallback(async (silent = false) => {
    if (!userId) return;
    if (!silent) setLoading(true);
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
      }

      if (data) {
        setRecords(data);
      }
    } catch (err) {
      console.error("Error loading records:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [userId]);

  // Load consultations
  const loadConsultations = useCallback(async () => {
    if (!userId) return;
    setConsultationsLoading(true);
    try {
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

  // Load doctors from directory and appointments
  const loadDoctors = useCallback(async () => {
    if (!userId) return;
    try {
      try {
        const res = await api.get("/api/v1/doctor-collaboration/directory");
        if (res.data?.data && Array.isArray(res.data.data)) {
          setDoctors(
            res.data.data.map((d: any) => ({
              id: d.user_id || d.id,
              user_id: d.user_id || d.id,
              name: d.full_name?.startsWith("Dr.") ? d.full_name : `Dr. ${d.full_name}`,
              full_name: d.full_name,
              specialization: d.specialization || "Physician",
              hospital_name: d.hospital_name,
              clinic_name: d.clinic_name,
              profile_picture_url: d.profile_picture_url,
            }))
          );
          return;
        }
      } catch {}

      // Fallback: Supabase direct query
      const { data: docsRes } = await supabase
        .from("doctors")
        .select("user_id, full_name, specialization, hospital_name, clinic_name, profile_picture_url")
        .limit(100);

      if (docsRes) {
        setDoctors(
          docsRes.map((d: any) => ({
            id: d.user_id,
            user_id: d.user_id,
            name: d.full_name?.startsWith("Dr.") ? d.full_name : `Dr. ${d.full_name}`,
            full_name: d.full_name,
            specialization: d.specialization || "Physician",
            hospital_name: d.hospital_name,
            clinic_name: d.clinic_name,
            profile_picture_url: d.profile_picture_url,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load doctors:", err);
    }
  }, [userId]);

  // Load privacy & doctor access overview
  const loadPrivacyData = useCallback(async (silent = false) => {
    if (!userId) return;
    if (!silent) setPrivacyLoading(true);
    try {
      // 1. Pending doctor record requests
      try {
        const reqRes = await api.get("/api/v1/doctor-collaboration/patient/record-requests");
        setPendingRequests(reqRes.data?.data || []);
      } catch (err) {
        // Fallback to Supabase
        const { data: reqData } = await supabase
          .from("record_requests")
          .select("*, doctors(full_name, specialization, hospital_name)")
          .eq("patient_id", userId)
          .eq("status", "PENDING")
          .order("created_at", { ascending: false });
        if (reqData) {
          setPendingRequests(
            reqData.map((r: any) => ({
              ...r,
              requesting_doctor_name: r.doctors?.full_name ? `Dr. ${r.doctors.full_name}` : "Doctor",
              specialization: r.doctors?.specialization,
              hospital_name: r.doctors?.hospital_name,
            }))
          );
        }
      }

      // 2. Doctor access overview (active permissions + access logs)
      try {
        const accRes = await api.get("/api/v1/records/patient/doctor-access");
        const { active_permissions, access_logs } = accRes.data?.data || {};
        if (active_permissions) {
          setActiveDoctorAccess(
            active_permissions.map((p: any) => ({
              id: p.permission_id,
              permission_id: p.permission_id,
              record_id: p.record_id,
              record_title: p.record_title || "Document",
              doctor_id: p.doctor_id,
              doctor_name: p.doctor_name ? (p.doctor_name.startsWith("Dr.") ? p.doctor_name : `Dr. ${p.doctor_name}`) : "Doctor",
              doctor_specialization: p.doctor_specialization,
              hospital_name: p.hospital_name,
              access_level: p.access_level || "READ",
              granted_at: p.granted_at,
              status: p.is_revoked ? "REVOKED" : "ACTIVE",
            }))
          );
        }
        if (access_logs) {
          setDoctorAccessLogs(
            access_logs.map((l: any) => ({
              id: l.id,
              record_id: l.record_id,
              record_title: l.record_title || "Document",
              doctor_id: l.doctor_id,
              doctor_name: l.doctor_name ? (l.doctor_name.startsWith("Dr.") ? l.doctor_name : `Dr. ${l.doctor_name}`) : "Doctor",
              doctor_specialization: l.doctor_specialization,
              accessed_at: l.accessed_at,
            }))
          );
        }
      } catch (err) {
        // Direct Supabase fallback
        const { data: permsData } = await supabase
          .from("record_permissions")
          .select("*, medical_records(title), doctors:granted_to(full_name, specialization, hospital_name)")
          .eq("is_revoked", false)
          .neq("granted_to", userId);

        if (permsData) {
          setActiveDoctorAccess(
            permsData.map((p: any) => ({
              id: p.id,
              permission_id: p.id,
              record_id: p.record_id,
              record_title: p.medical_records?.title || "Document",
              doctor_id: p.granted_to,
              doctor_name: p.doctors?.full_name ? `Dr. ${p.doctors.full_name}` : "Doctor",
              doctor_specialization: p.doctors?.specialization,
              hospital_name: p.doctors?.hospital_name,
              access_level: p.access_level || "READ",
              granted_at: p.created_at,
              status: "ACTIVE",
            }))
          );
        }
      }
    } catch (err) {
      console.error("Error loading privacy data:", err);
    } finally {
      if (!silent) setPrivacyLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadRecords();
      loadConsultations();
      loadDoctors();
      loadPrivacyData();
    }
  }, [userId, loadRecords, loadConsultations, loadDoctors, loadPrivacyData]);

  // PERMANENT RECORD CONSENT TOGGLE - Public vs Private
  const toggleConsent = async (record: any, currentlyPublic: boolean) => {
    const newPublic = !currentlyPublic;
    // Instant optimistic UI update
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

    if (selectedRecordForAccess?.id === record.id) {
      setSelectedRecordForAccess((prev: any) => (prev ? { ...prev, is_public: newPublic } : null));
    }

    try {
      try {
        await api.patch(`/api/v1/records/${record.id}/consent`, {
          is_public: newPublic,
        });
      } catch (apiErr) {
        console.warn("Backend consent PATCH fallback:", apiErr);
      }

      await supabase
        .from("medical_records")
        .update({
          is_public: newPublic,
          description: record.description?.replace(/\[PUBLIC\]/g, "").trim(),
        })
        .eq("id", record.id);

      if (newPublic) {
        await supabase.from("record_permissions").upsert({
          record_id: record.id,
          granted_to: userId,
          granted_by: userId,
          access_level: "PUBLIC",
          is_revoked: false,
        });
        toast.success("Record visibility updated: PUBLIC to all attending doctors");
      } else {
        await supabase
          .from("record_permissions")
          .update({ is_revoked: true })
          .eq("record_id", record.id)
          .eq("access_level", "PUBLIC");
        toast.success("Record visibility updated: PRIVATE (Only authorized doctors can view)");
      }
      loadRecords(true);
      loadPrivacyData(true);
    } catch (err: any) {
      console.error("Toggle consent error:", err);
      toast.error("Failed to update record visibility");
      loadRecords(true);
    }
  };

  // GRANULAR DOCTOR ACCESS TOGGLE (GRANT or REVOKE) for a specific record
  const handleToggleDoctorAccess = async (recordId: string, doctorId: string, action: "GRANT" | "REVOKE") => {
    setTogglingDoctorId(doctorId);
    const doctorObj = doctors.find((d) => (d.user_id || d.id) === doctorId);
    const targetRecord = records.find((r) => r.id === recordId) || selectedRecordForAccess;
    const docName = doctorObj?.full_name || doctorObj?.name || "Doctor";
    const formattedDocName = docName.startsWith("Dr.") ? docName : `Dr. ${docName}`;

    // 1. Instant optimistic update on `records`
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== recordId) return r;
        const perms = r.record_permissions || [];
        if (action === "GRANT") {
          const exists = perms.some((p: any) => (p.granted_to === doctorId || p.granted_to === doctorObj?.user_id));
          const updatedPerms = exists
            ? perms.map((p: any) =>
                p.granted_to === doctorId || p.granted_to === doctorObj?.user_id
                  ? { ...p, is_revoked: false }
                  : p
              )
            : [
                ...perms,
                {
                  id: `perm-${recordId}-${doctorId}`,
                  record_id: recordId,
                  granted_to: doctorId,
                  is_revoked: false,
                  access_level: "READ",
                },
              ];
          return { ...r, record_permissions: updatedPerms };
        } else {
          return {
            ...r,
            record_permissions: perms.map((p: any) =>
              p.granted_to === doctorId || p.granted_to === doctorObj?.user_id
                ? { ...p, is_revoked: true }
                : p
            ),
          };
        }
      })
    );

    // 2. Also update `selectedRecordForAccess` state if open in modal
    if (selectedRecordForAccess?.id === recordId) {
      setSelectedRecordForAccess((prev: any) => {
        if (!prev) return null;
        const perms = prev.record_permissions || [];
        if (action === "GRANT") {
          const exists = perms.some((p: any) => (p.granted_to === doctorId || p.granted_to === doctorObj?.user_id));
          const updatedPerms = exists
            ? perms.map((p: any) =>
                p.granted_to === doctorId || p.granted_to === doctorObj?.user_id
                  ? { ...p, is_revoked: false }
                  : p
              )
            : [
                ...perms,
                {
                  id: `perm-${recordId}-${doctorId}`,
                  record_id: recordId,
                  granted_to: doctorId,
                  is_revoked: false,
                  access_level: "READ",
                },
              ];
          return { ...prev, record_permissions: updatedPerms };
        } else {
          return {
            ...prev,
            record_permissions: perms.map((p: any) =>
              p.granted_to === doctorId || p.granted_to === doctorObj?.user_id
                ? { ...p, is_revoked: true }
                : p
            ),
          };
        }
      });
    }

    // 3. Optimistic update on `activeDoctorAccess`
    if (action === "GRANT") {
      setActiveDoctorAccess((prev) => [
        {
          id: `perm-${recordId}-${doctorId}`,
          permission_id: `perm-${recordId}-${doctorId}`,
          record_id: recordId,
          record_title: targetRecord?.title || "Medical Document",
          doctor_id: doctorId,
          doctor_name: formattedDocName,
          doctor_specialization: doctorObj?.specialization || "Physician",
          hospital_name: doctorObj?.hospital_name,
          access_level: "READ",
          granted_at: new Date().toISOString(),
          status: "ACTIVE",
        },
        ...prev,
      ]);
    } else {
      setActiveDoctorAccess((prev) =>
        prev.filter((p) => !(p.record_id === recordId && (p.doctor_id === doctorId || p.doctor_id === doctorObj?.user_id)))
      );
    }

    // 4. API Call
    try {
      if (action === "GRANT") {
        await api.post("/api/v1/records/patient/grant-doctor-access", {
          record_id: recordId,
          doctor_id: doctorId,
        });
        toast.success(`Access granted: ${formattedDocName} can now view this record.`);
      } else {
        await api.post("/api/v1/records/patient/revoke-doctor-access", {
          record_id: recordId,
          doctor_id: doctorId,
        });
        toast.info(`Access revoked: ${formattedDocName} can no longer view this record.`);
      }
      await Promise.all([loadRecords(true), loadPrivacyData(true)]);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || `Failed to ${action.toLowerCase()} access`);
      await Promise.all([loadRecords(true), loadPrivacyData(true)]);
    } finally {
      setTogglingDoctorId(null);
    }
  };

  // Revoke Doctor Access directly from the Privacy Tab
  const handleRevokeFromPrivacyTab = async (item: ActiveDoctorAccessItem) => {
    setRevokingPermissionId(item.id);
    const docName = item.doctor_name || "Doctor";

    // Instant optimistic UI update
    setActiveDoctorAccess((prev) => prev.filter((p) => p.id !== item.id && p.permission_id !== item.permission_id));
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== item.record_id) return r;
        return {
          ...r,
          record_permissions: (r.record_permissions || []).map((p: any) =>
            p.granted_to === item.doctor_id ? { ...p, is_revoked: true } : p
          ),
        };
      })
    );

    try {
      await api.post("/api/v1/records/patient/revoke-doctor-access", {
        record_id: item.record_id,
        doctor_id: item.doctor_id,
      });
      toast.success(`Access revoked for ${docName}`);
      await Promise.all([loadRecords(true), loadPrivacyData(true)]);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to revoke access");
      await Promise.all([loadRecords(true), loadPrivacyData(true)]);
    } finally {
      setRevokingPermissionId(null);
    }
  };

  // Approve Doctor Record Request with optimistic UI update
  const handleApproveRequest = async (requestId: string) => {
    const req = pendingRequests.find((r) => r.id === requestId);
    // Instant optimistic update
    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    if (req) {
      setActiveDoctorAccess((prev) => [
        {
          id: `perm-${requestId}`,
          permission_id: `perm-${requestId}`,
          record_id: req.record_id || "all",
          record_title: req.record_title || "All Medical Records",
          doctor_id: req.requesting_doctor_id,
          doctor_name: req.requesting_doctor_name || "Doctor",
          doctor_specialization: req.specialization,
          hospital_name: req.hospital_name,
          access_level: "READ",
          granted_at: new Date().toISOString(),
          status: "ACTIVE",
        },
        ...prev,
      ]);
    }
    try {
      await api.post(`/api/v1/doctor-collaboration/patient/record-requests/${requestId}/approve`);
      toast.success("Access request approved! Clinical records shared with doctor.");
      await Promise.all([loadPrivacyData(true), loadRecords(true)]);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to approve record request");
      loadPrivacyData(true);
    }
  };

  // Reject Doctor Record Request with optimistic UI update
  const handleRejectRequest = async (requestId: string) => {
    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    try {
      await api.post(`/api/v1/doctor-collaboration/patient/record-requests/${requestId}/reject`);
      toast.info("Record access request declined.");
      loadPrivacyData(true);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to decline record request");
      loadPrivacyData(true);
    }
  };

  // Upload Record
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

  // Download Record
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
      try {
        const rawUrl = `${getApiUrl()}/records/${downloadRecordId}/raw`;
        window.open(rawUrl, "_blank");
        toast.success("Download started (Direct secure stream)");
        setIsDownloadDialogOpen(false);
        setDownloadRecordId(null);
        setDownloadPin("");
      } catch {
        toast.error(err.response?.data?.detail || "Failed to download record");
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // Filtered active doctor access in Privacy Tab
  const filteredActiveAccess = activeDoctorAccess.filter((item) => {
    const q = privacySearchQuery.toLowerCase();
    return (
      (item.doctor_name || "").toLowerCase().includes(q) ||
      (item.record_title || "").toLowerCase().includes(q) ||
      (item.doctor_specialization || "").toLowerCase().includes(q)
    );
  });

  // Filtered doctors in per-record modal
  const filteredDoctorsInModal = doctors.filter((doc) => {
    const q = doctorModalSearch.toLowerCase();
    return (
      (doc.name || "").toLowerCase().includes(q) ||
      (doc.specialization || "").toLowerCase().includes(q) ||
      (doc.hospital_name || "").toLowerCase().includes(q)
    );
  });

  const privateRecordsCount = records.filter(
    (r) =>
      !r.is_public &&
      !r.record_permissions?.some((p: any) => p.access_level === "PUBLIC" && !p.is_revoked)
  ).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40"
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Medical Records & Privacy
            </h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
              <ShieldCheck className="w-3 h-3 mr-1" /> Consent Governed
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your personal clinical documents, control doctor-by-doctor access permissions, and review real-time audit logs.
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
                    ? "🔒 Strictly confidential. Hidden from all doctors unless you explicitly authorize specific physicians."
                    : "✓ Attending doctors can view and review this document during appointments."}
                </p>
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

      {/* Main Tabs: Medical Records, Privacy & Doctor Access, Consultations */}
      <Tabs defaultValue="records" className="w-full">
        <TabsList className="bg-muted/40 p-1 rounded-xl flex-wrap">
          <TabsTrigger value="records" className="rounded-lg text-sm font-medium">
            Medical Documents ({records.length})
          </TabsTrigger>
          <TabsTrigger value="privacy" className="rounded-lg text-sm font-medium flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Privacy & Doctor Access ({activeDoctorAccess.length})
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[11px] bg-primary text-primary-foreground animate-pulse">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="consultations" className="rounded-lg text-sm font-medium flex items-center gap-1.5">
            <Stethoscope className="w-4 h-4" /> Consultation History ({consultations.length})
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: MEDICAL RECORDS & DOCUMENTS ───────────────────────────── */}
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
                  Upload your lab reports, diagnostic scans, or prescriptions. All uploads are confidential by default.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {records.map((record) => {
                const isPublic =
                  record.is_public === true ||
                  record.record_permissions?.some(
                    (p: any) => p.access_level === "PUBLIC" && !p.is_revoked
                  ) ||
                  false;

                // Doctors who have active permissions for this specific record
                const activePermsForThisRecord = (record.record_permissions || []).filter(
                  (p: any) => !p.is_revoked && p.granted_to && p.granted_to !== userId && p.access_level !== "PUBLIC"
                );
                const authorizedDoctorIds = activePermsForThisRecord.map((p: any) => p.granted_to);
                const authorizedDocs = doctors.filter((d) =>
                  authorizedDoctorIds.includes(d.user_id || d.id)
                );

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

                    <CardContent className="pt-0 space-y-3">
                      <p className="text-xs text-muted-foreground">
                        {record.description?.replace(/\[PUBLIC\]/g, "").trim() || "No description provided."}
                      </p>

                      {/* Doctor Access Banner for this Record */}
                      <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="font-medium text-foreground flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                            Doctor Access:
                          </span>
                          {isPublic ? (
                            <span className="text-muted-foreground">
                              All attending physicians can view this record during appointments.
                            </span>
                          ) : authorizedDocs.length > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-emerald-600 font-semibold">
                                {authorizedDocs.length} Doctor{authorizedDocs.length > 1 ? "s" : ""} Authorized:
                              </span>
                              {authorizedDocs.slice(0, 3).map((d) => (
                                <Badge key={d.id} variant="secondary" className="text-[11px] h-5 py-0 px-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                                  {d.name}
                                </Badge>
                              ))}
                              {authorizedDocs.length > 3 && (
                                <span className="text-[11px] text-muted-foreground">
                                  +{authorizedDocs.length - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-amber-600 font-medium">
                              🔒 Strictly Private • No doctors authorized yet
                            </span>
                          )}
                        </div>

                        {/* Button to open granular access modal */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs rounded-lg border-primary/30 text-primary hover:bg-primary/10 self-end sm:self-auto shrink-0"
                          onClick={() => {
                            setSelectedRecordForAccess(record);
                            setIsDoctorAccessModalOpen(true);
                          }}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                          Manage Doctor Access
                        </Button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/50">
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

        {/* ─── TAB 2: PRIVACY & DOCTOR ACCESS MANAGEMENT (IN-PAGE) ─────────── */}
        <TabsContent value="privacy" className="pt-4 space-y-6">
          {/* Summary Stat Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="rounded-2xl border border-border/60 bg-card/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Private Documents</p>
                  <p className="text-xl font-bold text-foreground">{privateRecordsCount} / {records.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/60 bg-card/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Active Doctor Grants</p>
                  <p className="text-xl font-bold text-foreground">{activeDoctorAccess.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/60 bg-card/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Pending Requests</p>
                  <p className="text-xl font-bold text-foreground">{pendingRequests.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Doctor Access Requests */}
          {pendingRequests.length > 0 && (
            <Card className="rounded-2xl border border-amber-500/40 bg-amber-500/5 shadow-sm">
              <CardHeader className="pb-3 border-b border-amber-500/20">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <CardTitle className="text-base font-semibold text-foreground">
                    Pending Doctor Record Access Requests ({pendingRequests.length})
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Healthcare practitioners requesting your explicit consent to inspect your clinical history.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-amber-500/20">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">
                          {req.requesting_doctor_name || "Doctor"}
                        </span>
                        {req.specialization && (
                          <Badge variant="outline" className="text-[11px] bg-primary/5 text-primary border-primary/20">
                            {req.specialization}
                          </Badge>
                        )}
                        {req.hospital_name && (
                          <span className="text-xs text-muted-foreground">• {req.hospital_name}</span>
                        )}
                      </div>
                      <p className="text-xs text-foreground/90 font-medium">
                        Reason: <span className="font-normal text-muted-foreground">&ldquo;{req.reason || "Review medical records for consultation"}&rdquo;</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Requested on {new Date(req.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 rounded-lg"
                        onClick={() => handleRejectRequest(req.id)}
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                        onClick={() => handleApproveRequest(req.id)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve Access
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Active Doctor Permissions & Revoke Controls */}
          <Card className="rounded-2xl border border-border/60">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold">Active Doctor Permissions</CardTitle>
                  <CardDescription className="text-xs">
                    Doctors with active authorization to review specific or all clinical records. You can revoke access anytime.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-48 sm:w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search doctor or document..."
                      value={privacySearchQuery}
                      onChange={(e) => setPrivacySearchQuery(e.target.value)}
                      className="h-8 text-xs pl-8 rounded-lg"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadPrivacyData()}
                    className="h-8 text-xs rounded-lg shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {privacyLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredActiveAccess.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mb-2">
                    <UserX className="w-6 h-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No active doctor permissions</p>
                  <p className="text-xs text-muted-foreground max-w-sm mt-0.5">
                    Your records are private. When you explicitly authorize a physician or approve a request, they will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {filteredActiveAccess.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0 mt-0.5">
                          {item.doctor_name?.slice(3, 5)?.toUpperCase() || "DR"}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground text-sm">
                              {item.doctor_name}
                            </span>
                            {item.doctor_specialization && (
                              <Badge variant="outline" className="text-[11px] bg-primary/5 text-primary border-primary/20">
                                {item.doctor_specialization}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                              ACTIVE READ ACCESS
                            </Badge>
                          </div>
                          <p className="text-xs text-foreground/80">
                            Authorized Document: <strong className="text-foreground">{item.record_title}</strong>
                          </p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                            {item.hospital_name && <span>{item.hospital_name}</span>}
                            <span>•</span>
                            <span>Granted on {new Date(item.granted_at).toLocaleDateString()}</span>
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 rounded-lg self-end sm:self-auto shrink-0"
                        disabled={revokingPermissionId === item.id}
                        onClick={() => handleRevokeFromPrivacyTab(item)}
                      >
                        {revokingPermissionId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 mr-1" />
                        )}
                        Revoke Access
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Doctor Access & Download Audit Log */}
          <Card className="rounded-2xl border border-border/60">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <CardTitle className="text-base font-semibold">Doctor Access Activity Audit Log</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Cryptographic audit trail tracking every doctor who has viewed or downloaded your medical records.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {doctorAccessLogs.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  No doctor access events recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-border/30 max-h-72 overflow-y-auto">
                  {doctorAccessLogs.map((log) => (
                    <div key={log.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-muted/20">
                      <div className="flex items-center gap-2.5">
                        <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div>
                          <span className="font-semibold text-foreground">{log.doctor_name}</span>
                          <span className="text-muted-foreground"> reviewed </span>
                          <span className="font-medium text-foreground">{log.record_title}</span>
                          {log.doctor_specialization && (
                            <span className="text-muted-foreground"> ({log.doctor_specialization})</span>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
                        {new Date(log.accessed_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: CONSULTATION HISTORY ─────────────────────────────────── */}
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

                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <div>
                        {c.is_public ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 rounded-lg"
                            disabled={togglingConsultationId === c.id}
                            onClick={() => {
                              const newPublic = !c.is_public;
                              setTogglingConsultationId(c.id);
                              api
                                .patch(`/api/v1/consultations/${c.id}/consent`, { is_public: newPublic })
                                .then(() => {
                                  toast.success("Consultation notes marked PRIVATE");
                                  loadConsultations();
                                })
                                .catch(() => {
                                  supabase
                                    .from("consultations")
                                    .update({ is_public: newPublic })
                                    .eq("id", c.id)
                                    .then(() => loadConsultations());
                                })
                                .finally(() => setTogglingConsultationId(null));
                            }}
                          >
                            <Lock className="mr-1.5 h-3.5 w-3.5" /> Make Private
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 rounded-lg"
                            disabled={togglingConsultationId === c.id}
                            onClick={() => {
                              const newPublic = !c.is_public;
                              setTogglingConsultationId(c.id);
                              api
                                .patch(`/api/v1/consultations/${c.id}/consent`, { is_public: newPublic })
                                .then(() => {
                                  toast.success("Consultation notes marked PUBLIC");
                                  loadConsultations();
                                })
                                .catch(() => {
                                  supabase
                                    .from("consultations")
                                    .update({ is_public: newPublic })
                                    .eq("id", c.id)
                                    .then(() => loadConsultations());
                                })
                                .finally(() => setTogglingConsultationId(null));
                            }}
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

      {/* ─── MODAL: PER-RECORD GRANULAR DOCTOR ACCESS CONTROL ──────────────── */}
      <Dialog open={isDoctorAccessModalOpen} onOpenChange={setIsDoctorAccessModalOpen}>
        <DialogContent className="max-w-xl rounded-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b border-border/40">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold">
                    Doctor Access Control
                  </DialogTitle>
                  {selectedRecordForAccess?.is_public ? (
                    <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                      PUBLIC RECORD
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                      PRIVATE RECORD
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate max-w-md">
                  {selectedRecordForAccess?.title}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-4 overflow-y-auto">
            {/* Quick Record Privacy Toggle Banner */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/30 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">
                  Global Record Visibility
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {selectedRecordForAccess?.is_public
                    ? "Currently PUBLIC: all attending doctors can review this record."
                    : "Currently PRIVATE: only doctors you explicitly authorize below can access it."}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 rounded-lg shrink-0"
                onClick={() => {
                  if (selectedRecordForAccess) {
                    toggleConsent(selectedRecordForAccess, selectedRecordForAccess.is_public);
                  }
                }}
              >
                {selectedRecordForAccess?.is_public ? (
                  <>
                    <Lock className="w-3 h-3 mr-1 text-amber-600" /> Switch to Private
                  </>
                ) : (
                  <>
                    <Globe className="w-3 h-3 mr-1 text-emerald-600" /> Switch to Public
                  </>
                )}
              </Button>
            </div>

            {/* Doctor Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search physicians by name, specialty, or clinic..."
                value={doctorModalSearch}
                onChange={(e) => setDoctorModalSearch(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>

            {/* List of Doctors with Individual Grant/Revoke Controls */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Physicians & Clinical Practices ({filteredDoctorsInModal.length})
              </p>

              {filteredDoctorsInModal.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No doctors found matching &ldquo;{doctorModalSearch}&rdquo;
                </div>
              ) : (
                <div className="divide-y divide-border/40 border border-border/40 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                  {filteredDoctorsInModal.map((doc) => {
                    // Check if doc has active permission for this record
                    const docId = doc.user_id || doc.id;
                    const isGranted = (selectedRecordForAccess?.record_permissions || []).some(
                      (p: any) =>
                        (p.granted_to === docId || p.granted_to === doc.user_id) &&
                        !p.is_revoked &&
                        p.access_level !== "PUBLIC"
                    );

                    return (
                      <div
                        key={doc.id}
                        className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                            {doc.name?.slice(3, 5)?.toUpperCase() || "DR"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {doc.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {doc.specialization || "Physician"}
                              {doc.hospital_name ? ` • ${doc.hospital_name}` : doc.clinic_name ? ` • ${doc.clinic_name}` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {selectedRecordForAccess?.is_public ? (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                              Public Access
                            </Badge>
                          ) : isGranted ? (
                            <>
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> ACCESS GRANTED
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 rounded-lg"
                                disabled={togglingDoctorId === docId}
                                onClick={() =>
                                  handleToggleDoctorAccess(selectedRecordForAccess.id, docId, "REVOKE")
                                }
                              >
                                {togglingDoctorId === docId ? (
                                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                ) : (
                                  <UserX className="w-3 h-3 mr-1" />
                                )}
                                Revoke
                              </Button>
                            </>
                          ) : (
                            <>
                              <Badge variant="outline" className="text-[10px] bg-muted/60 text-muted-foreground border-border/40">
                                NO ACCESS
                              </Badge>
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                                disabled={togglingDoctorId === docId}
                                onClick={() =>
                                  handleToggleDoctorAccess(selectedRecordForAccess.id, docId, "GRANT")
                                }
                              >
                                {togglingDoctorId === docId ? (
                                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                ) : (
                                  <UserCheck className="w-3 h-3 mr-1" />
                                )}
                                Grant Access
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
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
