"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
  Badge,
  Select,
} from "@medsync/ui";
import { Avatar } from "@medsync/ui/components/avatar";
import {
  Loader2,
  Activity,
  ShieldAlert,
  FileText,
  Calendar,
  Heart,
  Pill,
  Fingerprint,
  UserPlus,
  ArrowLeft,
  Send,
  Building2,
  Stethoscope,
  CheckCircle2,
  Lock,
  Download,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  XCircle,
  UserCheck,
  Search,
  Globe,
  MessageSquare,
  QrCode,
  FileQuestion,
  Filter,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Droplet,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";
import axios from "axios";
import { getApiUrl } from "@/lib/backend-config";
import { PrescriptionQR } from "@medsync/ui";
import DoctorHospitalPicker from "@/components/doctor/DoctorHospitalPicker";

function PatientDetailContent() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";

  const patientId = id as string;
  const [userId, setUserId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // Entities
  const [records, setRecords] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);

  // Record Requests
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  // Downloads & Actions Loading
  const [downloadingRecordId, setDownloadingRecordId] = useState<string | null>(null);
  const [downloadingPrescriptionId, setDownloadingPrescriptionId] = useState<string | null>(null);
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState<string | null>(null);

  // Modals
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [selectedRecordForReferral, setSelectedRecordForReferral] = useState<any | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [referralSpecialization, setReferralSpecialization] = useState<string>("");
  const [referralReason, setReferralReason] = useState<string>("");
  const [referralNotes, setReferralNotes] = useState<string>("");
  const [isSubmittingReferral, setIsSubmittingReferral] = useState(false);

  // Clinical Note Modal
  const [selectedRecordForNote, setSelectedRecordForNote] = useState<any | null>(null);
  const [noteText, setNoteText] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Prescription QR Modal
  const [selectedPrescriptionForQR, setSelectedPrescriptionForQR] = useState<any | null>(null);

  // Access Request Modal
  const [isAccessRequestOpen, setIsAccessRequestOpen] = useState(false);
  const [accessReason, setAccessReason] = useState("");
  const [isSubmittingAccess, setIsSubmittingAccess] = useState(false);

  // Record Tab Filters
  const [recordSearch, setRecordSearch] = useState("");
  const [recordCategoryFilter, setRecordCategoryFilter] = useState("ALL");
  const [recordAccessFilter, setRecordAccessFilter] = useState("ALL");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["overview", "records", "prescriptions", "appointments", "referrals"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    window.history.replaceState({}, "", url.toString());
  };

  const calculateAge = (dobStr?: string | null): number | null => {
    if (!dobStr) return null;
    let birthDate = new Date(dobStr);
    if (isNaN(birthDate.getTime())) {
      const parts = dobStr.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else if (parts[2].length === 4) {
          birthDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
      }
    }
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 && age < 130 ? age : null;
  };

  const calculateBMI = (heightCm?: number | null, weightKg?: number | null) => {
    if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);
    let status = "Normal";
    let color = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (bmi < 18.5) {
      status = "Underweight";
      color = "text-amber-500 bg-amber-500/10 border-amber-500/20";
    } else if (bmi >= 25 && bmi < 30) {
      status = "Overweight";
      color = "text-amber-500 bg-amber-500/10 border-amber-500/20";
    } else if (bmi >= 30) {
      status = "Obese";
      color = "text-rose-500 bg-rose-500/10 border-rose-500/20";
    }
    return { value: bmi.toFixed(1), status, color };
  };

  const fetchRecordRequests = useCallback(async () => {
    if (!userId || !patientId) return;
    try {
      setRequestsLoading(true);
      const [incRes, outRes] = await Promise.all([
        api.get("/api/v1/doctor-collaboration/record-requests/incoming"),
        api.get("/api/v1/doctor-collaboration/record-requests/outgoing"),
      ]);
      const inc = (incRes.data?.data || []).filter((r: any) => r.patient_id === patientId);
      const out = (outRes.data?.data || []).filter((r: any) => r.patient_id === patientId);
      setIncomingRequests(inc);
      setOutgoingRequests(out);
    } catch (err) {
      console.warn("Could not fetch record requests:", err);
    } finally {
      setRequestsLoading(false);
    }
  }, [userId, patientId]);

  const fetchPatientData = useCallback(async () => {
    if (!userId || !patientId) return;

    try {
      setLoading(true);

      // Authorization verification:
      // Doctor is authorized if they have:
      // 1. Appointments with this patient
      // 2. Prescriptions issued to this patient
      // 3. Referrals involving this patient (either referring or referred to)
      // 4. Granted record permissions
      // 5. Uploaded records for this patient
      const [{ data: appts }, { data: pres }, { data: refs }, { data: perms }, { data: uploads }] =
        await Promise.all([
          supabase
            .from("appointments")
            .select("id")
            .eq("doctor_id", userId)
            .eq("patient_id", patientId)
            .limit(1),
          supabase
            .from("prescriptions")
            .select("id")
            .eq("doctor_id", userId)
            .eq("patient_id", patientId)
            .limit(1),
          supabase
            .from("doctor_referrals")
            .select("id")
            .eq("patient_id", patientId)
            .or(`referring_doctor_id.eq.${userId},referred_to_doctor_id.eq.${userId}`)
            .limit(1),
          supabase
            .from("record_permissions")
            .select("id")
            .eq("granted_to", userId)
            .eq("is_revoked", false)
            .limit(1),
          supabase
            .from("medical_records")
            .select("id")
            .eq("patient_id", patientId)
            .eq("uploaded_by", userId)
            .limit(1),
        ]);

      let isAuth =
        (appts && appts.length > 0) ||
        (pres && pres.length > 0) ||
        (refs && refs.length > 0) ||
        (perms && perms.length > 0) ||
        (uploads && uploads.length > 0);

      // Verify patient profile existence regardless
      const { data: pData } = await supabase
        .from("patients")
        .select("*")
        .eq("user_id", patientId)
        .maybeSingle();

      let resolvedProfilePic = pData?.profile_picture_url;
      if (!resolvedProfilePic) {
        const { data: uData } = await supabase
          .from("users")
          .select("profile_image_url")
          .eq("id", patientId)
          .maybeSingle();
        if (uData?.profile_image_url) {
          resolvedProfilePic = uData.profile_image_url;
        }
      }

      setPatient(pData ? { ...pData, profile_picture_url: resolvedProfilePic } : null);

      if (!isAuth) {
        // Try backend records check (handles service privileges and approved requests)
        try {
          const recRes = await api.get(`/api/v1/records/doctor-records?patient_id=${patientId}`);
          if (recRes.data?.data && Array.isArray(recRes.data.data) && recRes.data.data.length > 0) {
            isAuth = true;
          }
        } catch {}
      }

      setAuthorized(Boolean(isAuth));

      if (isAuth) {
        // 1. Fetch Medical Records for this patient
        let fetchedRecords: any[] = [];
        try {
          const recRes = await api.get(`/api/v1/records/doctor-records?patient_id=${patientId}`);
          if (recRes.data?.data && Array.isArray(recRes.data.data)) {
            fetchedRecords = recRes.data.data.map((r: any) => ({
              id: r.id,
              title: r.title,
              description: r.description,
              category: r.category || "General",
              patient_id: r.patient_id,
              uploaded_by: r.uploaded_by,
              created_at: r.created_at,
              isPublic: r.is_public,
              isDirectShared: r.is_direct_shared,
              blockchain_status: r.blockchain_status || "VERIFIED",
              doctor_notes: r.doctor_notes || [],
            }));
          }
        } catch (err) {
          console.warn("Backend doctor-records fetch fallback to Supabase:", err);
        }

        if (fetchedRecords.length === 0) {
          const { data: recData } = await supabase
            .from("medical_records")
            .select("*, record_versions(*, doctor_notes(*)), medical_record_versions(*, doctor_notes(*))")
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false });

          if (recData) {
            fetchedRecords = recData.map((r: any) => {
              const versions = r.medical_record_versions || r.record_versions || [];
              const notes = versions.flatMap((v: any) => v.doctor_notes || []);
              return {
                id: r.id,
                title: r.title,
                description: r.description,
                category: r.category || "General",
                patient_id: r.patient_id,
                uploaded_by: r.uploaded_by,
                created_at: r.created_at,
                isPublic: r.description?.includes("[PUBLIC]"),
                isDirectShared: true,
                blockchain_status: r.blockchain_status || "VERIFIED",
                doctor_notes: notes,
              };
            });
          }
        }
        setRecords(fetchedRecords);

        // 2. Fetch Prescriptions
        const { data: presData } = await supabase
          .from("prescriptions")
          .select("*, prescription_items(*)")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false });
        setPrescriptions(presData || []);

        // 3. Fetch Appointments
        const { data: apptData } = await supabase
          .from("appointments")
          .select("*")
          .eq("patient_id", patientId)
          .order("appointment_date", { ascending: false });
        setAppointments(apptData || []);

        // 4. Fetch Referrals
        const { data: refData } = await supabase
          .from("doctor_referrals")
          .select("*")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false });

        if (refData && refData.length > 0) {
          const docUserIds = [
            ...new Set([
              ...refData.map((r) => r.referring_doctor_id),
              ...refData.map((r) => r.referred_to_doctor_id),
            ]),
          ];
          const { data: docProfiles } = await supabase
            .from("doctors")
            .select("user_id, full_name, specialization, hospital_name")
            .in("user_id", docUserIds);

          const docMap = (docProfiles || []).reduce((acc: any, d: any) => {
            acc[d.user_id] = d;
            return acc;
          }, {});

          const enriched = refData.map((r) => ({
            ...r,
            referring_doctor: docMap[r.referring_doctor_id],
            referred_to_doctor: docMap[r.referred_to_doctor_id],
          }));
          setReferrals(enriched);
        } else {
          setReferrals([]);
        }

        // 5. Fetch Record Requests
        fetchRecordRequests();
      }
    } catch (err) {
      console.error(err);
      setAuthorized(false);
    } finally {
      setLoading(false);
    }
  }, [userId, patientId, fetchRecordRequests]);

  useEffect(() => {
    fetchPatientData();
  }, [fetchPatientData]);

  // Download Medical Record PDF
  const handleDownloadRecord = async (recordId: string) => {
    setDownloadingRecordId(recordId);
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
        toast.success("Document downloaded (PDF with verifiable QR stamp)");
      } else {
        toast.info("Document verified on blockchain ledger.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to download record");
    } finally {
      setDownloadingRecordId(null);
    }
  };

  // Download Prescription PDF
  const handleDownloadPrescription = async (presId: string) => {
    try {
      setDownloadingPrescriptionId(presId);
      const apiUrl = getApiUrl();
      const response = await axios.get(`${apiUrl}/prescriptions/${presId}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `prescription-${presId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Prescription PDF downloaded");
    } catch (err: any) {
      console.error("Prescription download error:", err);
      toast.error("Failed to download prescription PDF");
    } finally {
      setDownloadingPrescriptionId(null);
    }
  };

  // Save Clinical Note on Record
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForNote || !noteText.trim()) return;

    setIsSubmittingNote(true);
    try {
      const res = await api.post(`/api/v1/records/${selectedRecordForNote.id}/notes`, {
        note_text: noteText.trim(),
      });
      const newNote = res.data?.data || {
        note_text: noteText.trim(),
        created_at: new Date().toISOString(),
      };

      setRecords((prev) =>
        prev.map((r) => {
          if (r.id === selectedRecordForNote.id) {
            return {
              ...r,
              doctor_notes: [...(r.doctor_notes || []), newNote],
            };
          }
          return r;
        })
      );

      toast.success("Clinical note added and saved to patient record");
      setSelectedRecordForNote(null);
      setNoteText("");
    } catch (err: any) {
      console.error("Note save error:", err);
      toast.error(err.response?.data?.detail || "Failed to save clinical note");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Submit Specialist Referral
  const handleOpenReferral = (record?: any) => {
    setSelectedRecordForReferral(record || null);
    setSelectedDoctorId("");
    setReferralSpecialization("");
    setReferralReason("");
    setReferralNotes("");
    setIsReferralOpen(true);
  };

  const handleSubmitReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !referralReason.trim()) {
      toast.error("Please select a target specialist doctor and provide a referral reason");
      return;
    }

    setIsSubmittingReferral(true);
    try {
      await api.post("/api/v1/doctor-collaboration/referrals", {
        patient_id: patientId,
        referred_to_doctor_id: selectedDoctorId,
        specialization: referralSpecialization || undefined,
        reason: referralReason.trim(),
        notes: referralNotes.trim() || undefined,
      });

      // If opened from a specific record, attach a clinical referral note to it
      if (selectedRecordForReferral && referralNotes.trim()) {
        await api
          .post(`/api/v1/records/${selectedRecordForReferral.id}/notes`, {
            note_text: `[Specialist Referral]: ${referralNotes.trim()}`,
          })
          .catch(() => null);
      }

      toast.success("Referral sent successfully to specialist physician");
      setIsReferralOpen(false);
      setSelectedRecordForReferral(null);
      setSelectedDoctorId("");
      setReferralReason("");
      setReferralNotes("");
      setReferralSpecialization("");
      fetchPatientData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to submit doctor referral");
    } finally {
      setIsSubmittingReferral(false);
    }
  };

  // Accept / Decline Incoming Referral
  const handleAcceptReferral = async (referralId: string) => {
    setReferrals((prev) =>
      prev.map((r) => (r.id === referralId ? { ...r, status: "ACCEPTED" } : r))
    );
    try {
      await api.post(`/api/v1/doctor-collaboration/referrals/${referralId}/accept`);
      toast.success("Referral accepted. You now have clinical access to the patient's records.");
      await fetchPatientData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to accept referral");
      fetchPatientData();
    }
  };

  const handleDeclineReferral = async (referralId: string) => {
    setReferrals((prev) =>
      prev.map((r) => (r.id === referralId ? { ...r, status: "REJECTED" } : r))
    );
    try {
      await api.post(`/api/v1/doctor-collaboration/referrals/${referralId}/decline`);
      toast.info("Referral declined.");
      await fetchPatientData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to decline referral");
      fetchPatientData();
    }
  };

  // Update Appointment Status (Confirm, Decline, Complete)
  const handleUpdateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    setUpdatingAppointmentId(appointmentId);
    // Instant optimistic UI update
    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, status: newStatus } : a))
    );
    try {
      try {
        await api.patch(`/api/v1/appointments/${appointmentId}/status`, { status: newStatus });
      } catch {
        const { error } = await supabase
          .from("appointments")
          .update({ status: newStatus })
          .eq("id", appointmentId);
        if (error) throw error;
      }
      toast.success(`Appointment marked as ${newStatus.toLowerCase()}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update appointment");
      fetchPatientData();
    } finally {
      setUpdatingAppointmentId(null);
    }
  };

  // Record Access Request from Patient
  const handleSubmitAccessRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessReason.trim()) {
      toast.error("Please enter a reason for requesting records access");
      return;
    }

    setIsSubmittingAccess(true);
    try {
      await api.post("/api/v1/doctor-collaboration/record-requests", {
        patient_id: patientId,
        reason: accessReason.trim(),
      });
      toast.success("Record request submitted. The patient has been notified in Privacy & Consent.");
      setIsAccessRequestOpen(false);
      setAccessReason("");
      fetchRecordRequests();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to request record access");
    } finally {
      setIsSubmittingAccess(false);
    }
  };

  // Approve / Decline Incoming Record Requests
  const handleApproveRequest = async (requestId: string) => {
    setProcessingRequestId(requestId);
    setIncomingRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: "APPROVED" } : r))
    );
    try {
      await api.post(`/api/v1/doctor-collaboration/record-requests/${requestId}/approve`);
      toast.success("Record request approved. Access granted to physician.");
      await fetchRecordRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to approve record request");
      fetchRecordRequests();
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessingRequestId(requestId);
    setIncomingRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: "REJECTED" } : r))
    );
    try {
      await api.post(`/api/v1/doctor-collaboration/record-requests/${requestId}/reject`);
      toast.info("Record request declined.");
      await fetchRecordRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to decline record request");
      fetchRecordRequests();
    } finally {
      setProcessingRequestId(null);
    }
  };

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Search text
      const q = recordSearch.toLowerCase().trim();
      if (q) {
        const matchTitle = (r.title || "").toLowerCase().includes(q);
        const matchDesc = (r.description || "").toLowerCase().includes(q);
        const matchNotes = (r.doctor_notes || []).some((n: any) =>
          (n.note_text || "").toLowerCase().includes(q)
        );
        if (!matchTitle && !matchDesc && !matchNotes) return false;
      }

      // 2. Category
      if (recordCategoryFilter !== "ALL") {
        if ((r.category || "General").toUpperCase() !== recordCategoryFilter.toUpperCase()) {
          return false;
        }
      }

      // 3. Access / Verification
      if (recordAccessFilter === "VERIFIED" && r.blockchain_status !== "VERIFIED") return false;
      if (recordAccessFilter === "PUBLIC" && !r.isPublic) return false;
      if (recordAccessFilter === "SHARED" && !r.isDirectShared && !r.isPublic) return false;

      return true;
    });
  }, [records, recordSearch, recordCategoryFilter, recordAccessFilter]);

  // Unified Recent Timeline for Overview
  const recentTimeline = useMemo(() => {
    const items: Array<{
      id: string;
      date: string;
      type: "record" | "prescription" | "appointment" | "referral";
      title: string;
      desc?: string;
      status?: string;
    }> = [];

    records.forEach((r) => {
      items.push({
        id: `rec-${r.id}`,
        date: r.created_at,
        type: "record",
        title: r.title,
        desc: r.category || "Medical Record",
        status: r.blockchain_status === "VERIFIED" ? "Verified" : undefined,
      });
    });

    prescriptions.forEach((p) => {
      items.push({
        id: `pres-${p.id}`,
        date: p.created_at,
        type: "prescription",
        title: `Prescription: ${p.diagnosis || "Clinical Medication"}`,
        desc: `${p.prescription_items?.length || 0} medication(s) prescribed`,
        status: p.is_dispensed ? "Dispensed" : "Active",
      });
    });

    appointments.forEach((a) => {
      items.push({
        id: `appt-${a.id}`,
        date: a.appointment_date ? `${a.appointment_date}T${a.start_time || "00:00:00"}` : a.created_at,
        type: "appointment",
        title: `Consultation Visit`,
        desc: a.notes || `Scheduled appointment for ${a.appointment_date}`,
        status: a.status,
      });
    });

    referrals.forEach((ref) => {
      items.push({
        id: `ref-${ref.id}`,
        date: ref.created_at,
        type: "referral",
        title: `Specialist Referral: Dr. ${ref.referred_to_doctor?.full_name || "Physician"}`,
        desc: ref.reason,
        status: ref.status,
      });
    });

    return items
      .filter((i) => i.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [records, prescriptions, appointments, referrals]);

  const patientAge = calculateAge(patient?.date_of_birth);
  const bmiInfo = calculateBMI(patient?.height_cm, patient?.weight_kg);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
        <p className="text-sm font-medium text-muted-foreground">Loading patient clinical profile...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-5 max-w-md mx-auto px-4">
        <div className="w-20 h-20 bg-destructive/10 rounded-3xl flex items-center justify-center shadow-inner">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Access Restricted</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You do not currently have authorized access to view <strong>{patient?.full_name || "this patient"}</strong>&apos;s
            clinical documents. Access requires an appointment, specialist referral, or direct consent.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2 w-full">
          <Button variant="outline" onClick={() => router.push("/doctor/patients")} className="flex-1 rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Patients
          </Button>
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm"
            onClick={() => setIsAccessRequestOpen(true)}
          >
            <Lock className="w-4 h-4 mr-2" /> Request Access
          </Button>
        </div>

        {/* Access Request Dialog */}
        <Dialog open={isAccessRequestOpen} onOpenChange={setIsAccessRequestOpen}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-500" /> Request Patient Record Access
              </DialogTitle>
              <DialogDescription>
                Submit an official clinical request to access medical history and records for {patient?.full_name || "this patient"}.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitAccessRequest} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Clinical Reason *
                </label>
                <textarea
                  value={accessReason}
                  onChange={(e) => setAccessReason(e.target.value)}
                  placeholder="State the medical reason (e.g. Consulted for symptoms, reviewing diagnostic files, secondary evaluation)..."
                  rows={3}
                  className="w-full text-sm bg-muted/40 border border-border/60 rounded-xl p-3 outline-none focus:border-primary transition resize-none"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl"
                disabled={isSubmittingAccess || !accessReason.trim()}
              >
                {isSubmittingAccess ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <Send className="w-4 h-4 mr-1.5" />
                )}
                Submit Request to Patient
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header Navigation & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/50">
        <div className="flex items-center gap-3.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/doctor/patients")}
            className="rounded-full h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted/60 shrink-0"
            title="Back to Patients"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
                {patient?.full_name || "Patient Profile"}
              </h1>
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/25 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Authorized
              </Badge>
              {patient?.blood_group && (
                <Badge variant="outline" className="text-xs bg-rose-500/10 text-rose-600 border-rose-500/25 font-semibold">
                  <Droplet className="w-3 h-3 mr-1 fill-rose-500" /> {patient.blood_group}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              Patient ID: <span className="font-mono text-foreground/80">{patientId}</span> • Unified Clinical Records & Management
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAccessRequestOpen(true)}
            className="rounded-xl border-border/70 text-xs h-9 shadow-sm hover:bg-muted/40"
          >
            <FileQuestion className="w-4 h-4 mr-1.5 text-primary" /> Request Records
          </Button>

          <Button
            variant="outline"
            size="sm"
            asChild
            className="rounded-xl border-border/70 text-xs h-9 shadow-sm hover:bg-muted/40"
          >
            <Link href={`/doctor/prescriptions/new?patient_id=${patientId}`}>
              <Pill className="w-4 h-4 mr-1.5 text-emerald-600" /> New Prescription
            </Link>
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenReferral()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1.5 rounded-xl text-xs h-9 font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Refer to Specialist
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: Patient Profile & Clinical Snapshot */}
        <div className="w-full lg:w-80 space-y-5 shrink-0">
          {/* Identity Card */}
          <Card className="overflow-hidden border border-border/60 shadow-sm rounded-2xl bg-card/60 backdrop-blur-sm">
            <div className="h-20 bg-gradient-to-r from-emerald-500/25 via-teal-500/15 to-blue-500/20"></div>
            <CardContent className="px-5 pb-5 pt-0 relative">
              <Avatar
                fallback={patient?.full_name}
                src={patient?.profile_picture_url}
                className="w-20 h-20 border-4 border-background shadow-md -mt-10 mb-3"
              />
              <h2 className="text-lg font-bold text-foreground leading-tight">{patient?.full_name}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[
                  patient?.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1).toLowerCase() : null,
                  patientAge !== null ? `${patientAge} yrs` : null,
                  patient?.date_of_birth ? `DOB: ${patient.date_of_birth}` : null,
                ]
                  .filter(Boolean)
                  .join(" • ") || "Clinical Patient"}
              </p>

              <div className="pt-4 border-t border-border/50 mt-4 space-y-2.5 text-xs">
                {patient?.phone_number && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="font-medium text-foreground">{patient.phone_number}</span>
                  </div>
                )}
                {patient?.city && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium text-foreground">
                      {[patient.city, patient.state, patient.country].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
                {patient?.emergency_contact_name && (
                  <div className="flex justify-between items-center pt-1 border-t border-border/30">
                    <span className="text-muted-foreground">Emergency Contact</span>
                    <span className="font-medium text-foreground">{patient.emergency_contact_name}</span>
                  </div>
                )}
                {patient?.emergency_contact_number && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Emergency Phone</span>
                    <span className="font-medium text-foreground">{patient.emergency_contact_number}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Clinical Alerts & Allergies */}
          <Card className="border border-border/60 shadow-sm rounded-2xl bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm flex items-center gap-2 text-foreground font-semibold">
                <Heart className="w-4 h-4 text-rose-500" /> Allergies & Clinical Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3.5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Medical Alerts
                </p>
                <div
                  className={`p-2.5 rounded-xl text-xs font-semibold ${
                    patient?.medical_alerts
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                      : "bg-muted/40 text-muted-foreground"
                  }`}
                >
                  {patient?.medical_alerts || "No critical medical alerts documented"}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Known Allergies
                </p>
                <p className="text-xs text-foreground bg-muted/40 p-2.5 rounded-xl border border-border/40">
                  {patient?.allergies || "No known allergies documented"}
                </p>
              </div>

              {patient?.chronic_diseases && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Chronic Conditions
                  </p>
                  <p className="text-xs text-foreground bg-muted/40 p-2.5 rounded-xl border border-border/40">
                    {patient.chronic_diseases}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vitals Summary */}
          <Card className="border border-border/60 shadow-sm rounded-2xl bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm flex items-center gap-2 text-foreground font-semibold">
                <Activity className="w-4 h-4 text-emerald-500" /> Vitals & Body Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Height</span>
                <span className="font-semibold text-foreground">
                  {patient?.height_cm ? `${patient.height_cm} cm` : "--"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Weight</span>
                <span className="font-semibold text-foreground">
                  {patient?.weight_kg ? `${patient.weight_kg} kg` : "--"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-muted-foreground">BMI Index</span>
                {bmiInfo ? (
                  <Badge variant="outline" className={`text-[10px] font-semibold ${bmiInfo.color}`}>
                    {bmiInfo.value} • {bmiInfo.status}
                  </Badge>
                ) : (
                  <span className="font-medium text-foreground">--</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Unified Tabs for All Clinical Features */}
        <div className="flex-1 min-w-0">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="w-full justify-start bg-transparent border-b border-border/60 rounded-none h-12 p-0 space-x-6 overflow-x-auto scrollbar-none">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none h-full bg-transparent px-1 font-semibold text-sm transition-all"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="records"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none h-full bg-transparent px-1 font-semibold text-sm transition-all flex items-center gap-1.5"
              >
                Medical Records
                <Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-medium bg-muted">
                  {records.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="prescriptions"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none h-full bg-transparent px-1 font-semibold text-sm transition-all flex items-center gap-1.5"
              >
                Prescriptions
                <Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-medium bg-muted">
                  {prescriptions.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="appointments"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none h-full bg-transparent px-1 font-semibold text-sm transition-all flex items-center gap-1.5"
              >
                Appointments
                <Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-medium bg-muted">
                  {appointments.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="referrals"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none h-full bg-transparent px-1 font-semibold text-sm transition-all flex items-center gap-1.5"
              >
                Referrals
                <Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-medium bg-muted">
                  {referrals.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* ════════════════════════════════════════════════════════════
                TAB 1: OVERVIEW
               ════════════════════════════════════════════════════════════ */}
            <TabsContent value="overview" className="pt-6 space-y-6">
              {/* Quick Clinical Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <Card className="rounded-2xl border border-border/60 bg-card/60 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-foreground">{records.length}</p>
                      <p className="text-xs text-muted-foreground">Records</p>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-2xl border border-border/60 bg-card/60 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                      <Pill className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-foreground">{prescriptions.length}</p>
                      <p className="text-xs text-muted-foreground">Prescriptions</p>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-2xl border border-border/60 bg-card/60 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-foreground">{appointments.length}</p>
                      <p className="text-xs text-muted-foreground">Appointments</p>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-2xl border border-border/60 bg-card/60 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-foreground">{referrals.length}</p>
                      <p className="text-xs text-muted-foreground">Referrals</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Patient Contact Information */}
              <Card className="rounded-2xl border border-border/60 bg-card/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Contact & Identification
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="p-3.5 bg-muted/30 rounded-xl border border-border/40">
                    <p className="text-xs text-muted-foreground font-medium">Primary Contact</p>
                    <p className="font-semibold text-foreground mt-0.5">{patient?.phone_number || "Not provided"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Patient ID: <span className="font-mono text-foreground">{patientId}</span>
                    </p>
                  </div>
                  <div className="p-3.5 bg-muted/30 rounded-xl border border-border/40">
                    <p className="text-xs text-muted-foreground font-medium">Residential Address</p>
                    <p className="font-semibold text-foreground mt-0.5">{patient?.address || "No address on file"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[patient?.city, patient?.state, patient?.country].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              <Card className="rounded-2xl border border-border/60 bg-card/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Emergency Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="p-3.5 bg-muted/30 rounded-xl border border-border/40">
                    <p className="text-xs text-muted-foreground font-medium">Designated Contact</p>
                    <p className="font-semibold text-foreground mt-0.5">{patient?.emergency_contact_name || "--"}</p>
                  </div>
                  <div className="p-3.5 bg-muted/30 rounded-xl border border-border/40">
                    <p className="text-xs text-muted-foreground font-medium">Emergency Phone</p>
                    <p className="font-semibold text-foreground mt-0.5">{patient?.emergency_contact_number || "--"}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Clinical Activity Timeline */}
              <Card className="rounded-2xl border border-border/60 bg-card/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Recent Clinical Activity</span>
                    <span className="text-xs font-normal text-muted-foreground">Timeline</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentTimeline.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      No clinical history recorded yet for this patient.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {recentTimeline.map((item) => (
                        <div key={item.id} className="flex items-start gap-3 text-xs">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              item.type === "record"
                                ? "bg-blue-500/10 text-blue-500"
                                : item.type === "prescription"
                                ? "bg-emerald-500/10 text-emerald-500"
                                : item.type === "appointment"
                                ? "bg-purple-500/10 text-purple-500"
                                : "bg-amber-500/10 text-amber-500"
                            }`}
                          >
                            {item.type === "record" && <FileText className="w-3.5 h-3.5" />}
                            {item.type === "prescription" && <Pill className="w-3.5 h-3.5" />}
                            {item.type === "appointment" && <Calendar className="w-3.5 h-3.5" />}
                            {item.type === "referral" && <UserPlus className="w-3.5 h-3.5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-foreground truncate">{item.title}</p>
                              {item.status && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {item.status}
                                </Badge>
                              )}
                            </div>
                            {item.desc && <p className="text-muted-foreground line-clamp-1 mt-0.5">{item.desc}</p>}
                            <p className="text-[10px] text-muted-foreground/70 mt-1 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(item.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ════════════════════════════════════════════════════════════
                TAB 2: MEDICAL RECORDS (Integrated from old standalone page)
               ════════════════════════════════════════════════════════════ */}
            <TabsContent value="records" className="pt-6 space-y-6">
              {/* Record Filter & Action Bar */}
              <div className="bg-card/70 border border-border/60 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  {/* Search Input */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search record title, description, or notes..."
                      className="pl-9 pr-8 rounded-xl h-9 text-xs bg-background/80"
                      value={recordSearch}
                      onChange={(e) => setRecordSearch(e.target.value)}
                    />
                    {recordSearch && (
                      <button
                        onClick={() => setRecordSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filter Category Select */}
                  <div className="flex items-center gap-2">
                    <Select
                      value={recordCategoryFilter}
                      onChange={(e) => setRecordCategoryFilter(e.target.value)}
                      className="h-9 text-xs rounded-xl bg-background/80 min-w-[130px]"
                    >
                      <option value="ALL">All Categories</option>
                      <option value="General">General</option>
                      <option value="Lab Report">Lab Report</option>
                      <option value="Prescription">Prescription</option>
                      <option value="Radiology">Radiology / Scan</option>
                      <option value="Discharge Summary">Discharge</option>
                    </Select>

                    <Select
                      value={recordAccessFilter}
                      onChange={(e) => setRecordAccessFilter(e.target.value)}
                      className="h-9 text-xs rounded-xl bg-background/80 min-w-[125px]"
                    >
                      <option value="ALL">All Records</option>
                      <option value="VERIFIED">Verified Only</option>
                      <option value="SHARED">Shared Records</option>
                      <option value="PUBLIC">Public Records</option>
                    </Select>

                    {(recordSearch || recordCategoryFilter !== "ALL" || recordAccessFilter !== "ALL") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setRecordSearch("");
                          setRecordCategoryFilter("ALL");
                          setRecordAccessFilter("ALL");
                        }}
                        className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground rounded-xl"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                  <span>
                    Showing {filteredRecords.length} of {records.length} documented records
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsAccessRequestOpen(true)}
                    className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10 rounded-lg"
                  >
                    <FileQuestion className="w-3.5 h-3.5 mr-1" /> Request Records from Patient
                  </Button>
                </div>
              </div>

              {/* Records List */}
              {records.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border rounded-2xl bg-card/40 border-dashed">
                  <FileText className="w-12 h-12 text-muted-foreground/40 mb-3" />
                  <p className="font-semibold text-foreground">No medical records documented</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    No clinical reports or diagnostic files are currently on record for this patient.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setIsAccessRequestOpen(true)}
                    className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs"
                  >
                    <FileQuestion className="w-3.5 h-3.5 mr-1.5" /> Request Records Access
                  </Button>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border rounded-2xl bg-card/40 border-dashed">
                  <Filter className="w-10 h-10 text-muted-foreground/40 mb-2" />
                  <p className="font-medium text-foreground text-sm">No records match the applied filter</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRecordSearch("");
                      setRecordCategoryFilter("ALL");
                      setRecordAccessFilter("ALL");
                    }}
                    className="mt-3 text-xs rounded-xl"
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredRecords.map((rec) => {
                    const notes = rec.doctor_notes || [];

                    return (
                      <Card
                        key={rec.id}
                        className="rounded-2xl border border-border/60 bg-card/60 hover:border-border/80 transition-all shadow-sm overflow-hidden"
                      >
                        <CardContent className="p-5 space-y-3.5">
                          {/* Top Line: Title & Badges */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <h3 className="font-bold text-base text-foreground truncate">{rec.title}</h3>
                                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                  {rec.category || "General"}
                                </Badge>
                                {rec.blockchain_status === "VERIFIED" && (
                                  <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-semibold">
                                    <ShieldCheck className="w-3 h-3 mr-1" /> Ledger Verified
                                  </Badge>
                                )}
                                {rec.isPublic ? (
                                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 text-[10px]">
                                    <Globe className="w-3 h-3 mr-1" /> Public
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 text-[10px]">
                                    <Lock className="w-3 h-3 mr-1" /> Shared
                                  </Badge>
                                )}
                              </div>
                              {rec.description && (
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                  {rec.description}
                                </p>
                              )}
                              <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-1">
                                <Clock className="w-3 h-3 text-muted-foreground/70" />
                                <span>Uploaded {new Date(rec.created_at).toLocaleDateString()}</span>
                                {notes.length > 0 && (
                                  <span className="text-primary font-medium">
                                    • {notes.length} Clinical Note{notes.length > 1 ? "s" : ""}
                                  </span>
                                )}
                              </p>
                            </div>

                            {/* Actions on Record */}
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 text-xs rounded-xl border-border/70 text-primary hover:bg-primary/10"
                                onClick={() => handleOpenReferral(rec)}
                              >
                                <Send className="w-3.5 h-3.5 mr-1" /> Refer Specialist
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 text-xs rounded-xl border-border/70 hover:bg-muted/60"
                                onClick={() => {
                                  setSelectedRecordForNote(rec);
                                  setNoteText("");
                                }}
                              >
                                <MessageSquare className="w-3.5 h-3.5 mr-1" /> Note
                              </Button>

                              <Button
                                size="sm"
                                className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm"
                                onClick={() => handleDownloadRecord(rec.id)}
                                disabled={downloadingRecordId === rec.id}
                              >
                                {downloadingRecordId === rec.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                ) : (
                                  <Download className="w-3.5 h-3.5 mr-1.5" />
                                )}
                                Download PDF
                              </Button>
                            </div>
                          </div>

                          {/* Physician Notes Section */}
                          {notes.length > 0 && (
                            <div className="p-3 bg-muted/40 rounded-xl border border-border/50 space-y-2">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                <MessageSquare className="w-3 h-3 text-primary" /> Doctor Referral & Clinical Notes:
                              </span>
                              <div className="space-y-1.5">
                                {notes.map((n: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="text-xs text-foreground/90 italic pl-2.5 py-0.5 border-l-2 border-primary/60 bg-background/40 rounded-r-lg"
                                  >
                                    &ldquo;{n.note_text}&rdquo;
                                    {n.created_at && (
                                      <span className="block text-[10px] text-muted-foreground not-italic mt-0.5">
                                        — {new Date(n.created_at).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Patient Record Requests Section (Incoming / Sent) */}
              {(incomingRequests.length > 0 || outgoingRequests.length > 0) && (
                <div className="pt-4 space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Record Collaboration & Access Requests
                  </h3>

                  {/* Incoming Requests for this patient */}
                  {incomingRequests.length > 0 && (
                    <Card className="rounded-2xl border border-border/60 bg-card/60">
                      <CardHeader className="pb-3 border-b border-border/40">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-emerald-500" /> Incoming Physician Requests for this Patient
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 divide-y divide-border/40">
                        {incomingRequests.map((req) => (
                          <div
                            key={req.id}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">
                                  Dr. {req.requesting_doctor_name || "Physician"}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] uppercase ${
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
                              <p className="text-muted-foreground">Reason: {req.reason}</p>
                              <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Requested on {new Date(req.created_at).toLocaleDateString()}
                              </p>
                            </div>

                            {req.status === "PENDING" && (
                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs rounded-xl"
                                  disabled={processingRequestId === req.id}
                                  onClick={() => handleRejectRequest(req.id)}
                                >
                                  Decline
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-8 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white"
                                  disabled={processingRequestId === req.id}
                                  onClick={() => handleApproveRequest(req.id)}
                                >
                                  {processingRequestId === req.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                  ) : (
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                  )}
                                  Approve Access
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Outgoing Requests sent for this patient */}
                  {outgoingRequests.length > 0 && (
                    <Card className="rounded-2xl border border-border/60 bg-card/60">
                      <CardHeader className="pb-3 border-b border-border/40">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Send className="w-4 h-4 text-primary" /> Requests Sent by You for this Patient
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 divide-y divide-border/40">
                        {outgoingRequests.map((req) => (
                          <div key={req.id} className="p-4 flex items-center justify-between gap-3 text-xs">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">
                                  {req.target_doctor_name ? `To Dr. ${req.target_doctor_name}` : "To Patient"}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] uppercase ${
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
                              <p className="text-muted-foreground">Reason: {req.reason}</p>
                              <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Submitted {new Date(req.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ════════════════════════════════════════════════════════════
                TAB 3: PRESCRIPTIONS
               ════════════════════════════════════════════════════════════ */}
            <TabsContent value="prescriptions" className="pt-6 space-y-4">
              <div className="flex items-center justify-between pb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Prescriptions Issued ({prescriptions.length})
                </h3>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs h-8 shadow-sm" asChild>
                  <Link href={`/doctor/prescriptions/new?patient_id=${patientId}`}>
                    <Pill className="w-3.5 h-3.5 mr-1.5" /> Issue New Prescription
                  </Link>
                </Button>
              </div>

              {prescriptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border rounded-2xl bg-card/40 border-dashed">
                  <Pill className="w-12 h-12 text-muted-foreground/40 mb-3" />
                  <p className="font-semibold text-foreground">No prescriptions on record</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    No active medications or digital prescriptions have been issued to this patient yet.
                  </p>
                  <Button size="sm" className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs" asChild>
                    <Link href={`/doctor/prescriptions/new?patient_id=${patientId}`}>
                      Issue First Prescription
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {prescriptions.map((p) => (
                    <Card key={p.id} className="rounded-2xl border border-border/60 bg-card/60 shadow-sm">
                      <CardContent className="p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-foreground">
                                Diagnosis: {p.diagnosis || "Clinical Prescription"}
                              </h4>
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-semibold ${
                                  p.is_dispensed
                                    ? "bg-muted text-muted-foreground"
                                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                }`}
                              >
                                {p.is_dispensed ? "Dispensed" : "Active"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Issued: {new Date(p.created_at).toLocaleDateString()}
                              {p.expires_at && ` • Valid until: ${new Date(p.expires_at).toLocaleDateString()}`}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs rounded-xl"
                              onClick={() => setSelectedPrescriptionForQR(p)}
                            >
                              <QrCode className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Share QR
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs rounded-xl"
                              onClick={() => handleDownloadPrescription(p.id)}
                              disabled={downloadingPrescriptionId === p.id}
                            >
                              {downloadingPrescriptionId === p.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                              ) : (
                                <Download className="w-3.5 h-3.5 mr-1.5" />
                              )}
                              Download PDF
                            </Button>
                          </div>
                        </div>

                        {/* Medications Itemized List */}
                        {p.prescription_items && p.prescription_items.length > 0 && (
                          <div className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-2 text-xs">
                            <p className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                              Prescribed Medications ({p.prescription_items.length}):
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {p.prescription_items.map((item: any) => (
                                <div
                                  key={item.id}
                                  className="p-2.5 rounded-lg bg-background/60 border border-border/30 space-y-1"
                                >
                                  <div className="flex justify-between items-center">
                                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                                      {item.medicine_name}
                                    </p>
                                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">
                                      {item.duration_days ? `${item.duration_days} days` : item.duration || "Course"}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">
                                    Dosage: <strong className="text-foreground">{item.dosage}</strong> • Frequency: {item.frequency}
                                  </p>
                                  {item.instructions && (
                                    <p className="text-[10px] text-primary italic">{item.instructions}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ════════════════════════════════════════════════════════════
                TAB 4: APPOINTMENTS
               ════════════════════════════════════════════════════════════ */}
            <TabsContent value="appointments" className="pt-6 space-y-4">
              <div className="flex items-center justify-between pb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Consultation Appointments ({appointments.length})
                </h3>
                <Button size="sm" variant="outline" asChild className="rounded-xl text-xs h-8">
                  <Link href="/doctor/appointments">
                    Manage All Appointments <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </Button>
              </div>

              {appointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border rounded-2xl bg-card/40 border-dashed">
                  <Calendar className="w-12 h-12 text-muted-foreground/40 mb-3" />
                  <p className="font-semibold text-foreground">No appointments recorded</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    No scheduled consultations or prior visits exist for this patient.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {appointments.map((a) => (
                    <Card key={a.id} className="rounded-2xl border border-border/60 bg-card/60 shadow-sm">
                      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm text-foreground">
                              {a.appointment_date} {a.start_time ? `at ${a.start_time}` : ""}
                            </h4>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold ${
                                a.status === "CONFIRMED"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : a.status === "PENDING"
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                  : a.status === "COMPLETED"
                                  ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                  : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                              }`}
                            >
                              {a.status}
                            </Badge>
                          </div>
                          {a.notes && <p className="text-xs text-muted-foreground line-clamp-2">{a.notes}</p>}
                        </div>

                        {/* Doctor Controls on Appointment */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {a.status === "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs rounded-xl"
                                disabled={updatingAppointmentId === a.id}
                                onClick={() => handleUpdateAppointmentStatus(a.id, "REJECTED")}
                              >
                                Decline
                              </Button>
                              <Button
                                size="sm"
                                className="h-8 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white"
                                disabled={updatingAppointmentId === a.id}
                                onClick={() => handleUpdateAppointmentStatus(a.id, "CONFIRMED")}
                              >
                                Confirm Visit
                              </Button>
                            </>
                          )}
                          {a.status === "CONFIRMED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs rounded-xl border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                              disabled={updatingAppointmentId === a.id}
                              onClick={() => handleUpdateAppointmentStatus(a.id, "COMPLETED")}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Completed
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ════════════════════════════════════════════════════════════
                TAB 5: REFERRALS
               ════════════════════════════════════════════════════════════ */}
            <TabsContent value="referrals" className="pt-6 space-y-4">
              <div className="flex items-center justify-between pb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Specialist Doctor Referrals ({referrals.length})
                </h3>
                <Button
                  size="sm"
                  onClick={() => handleOpenReferral()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs h-8 shadow-sm"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Refer to Another Specialist
                </Button>
              </div>

              {referrals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border rounded-2xl bg-card/40 border-dashed">
                  <UserPlus className="w-12 h-12 text-muted-foreground/40 mb-3" />
                  <p className="font-semibold text-foreground">No doctor referrals on record</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    This patient has not been referred to any specialist physicians or clinics yet.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => handleOpenReferral()}
                    className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs shadow-sm"
                  >
                    Create Specialist Referral
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {referrals.map((ref) => {
                    const isIncoming = ref.referred_to_doctor_id === userId;

                    return (
                      <Card key={ref.id} className="rounded-2xl border border-border/60 bg-card/60 shadow-sm">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-foreground">
                                  {isIncoming ? "Referred to You" : `Referred to: Dr. ${ref.referred_to_doctor?.full_name || "Specialist"}`}
                                </h4>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-semibold ${
                                    ref.status === "ACCEPTED"
                                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                      : ref.status === "PENDING"
                                      ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                      : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                  }`}
                                >
                                  {ref.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {ref.specialization || ref.referred_to_doctor?.specialization || "Clinical Specialist"} •{" "}
                                {ref.referred_to_doctor?.hospital_name || "Network Clinic"} •{" "}
                                {new Date(ref.created_at).toLocaleDateString()}
                              </p>
                            </div>

                            {/* Accept/Decline button for incoming referral */}
                            {isIncoming && ref.status === "PENDING" && (
                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs rounded-xl"
                                  onClick={() => handleDeclineReferral(ref.id)}
                                >
                                  Decline
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-8 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white"
                                  onClick={() => handleAcceptReferral(ref.id)}
                                >
                                  Accept Referral
                                </Button>
                              </div>
                            )}
                          </div>

                          <div className="p-3 rounded-xl bg-muted/30 border border-border/40 text-xs space-y-1.5">
                            <div>
                              <span className="font-bold text-muted-foreground uppercase text-[10px]">
                                Clinical Reason:
                              </span>{" "}
                              <span className="text-foreground">{ref.reason}</span>
                            </div>
                            {ref.notes && (
                              <div>
                                <span className="font-bold text-muted-foreground uppercase text-[10px]">
                                  Physician Notes:
                                </span>{" "}
                                <span className="text-muted-foreground italic">{ref.notes}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          MODAL 1: REFERRAL WITH INTERACTIVE HOSPITAL MAP
         ════════════════════════════════════════════════════════════ */}
      <Dialog open={isReferralOpen} onOpenChange={setIsReferralOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-500" /> Refer Patient to Specialist Doctor
            </DialogTitle>
            <DialogDescription>
              Collaborate by referring <strong>{patient?.full_name}</strong> to a specialist physician or clinic.
            </DialogDescription>
          </DialogHeader>

          {selectedRecordForReferral && (
            <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-xs space-y-1">
              <p>
                <strong>Attaching Clinical Record:</strong> {selectedRecordForReferral.title}
              </p>
              {selectedRecordForReferral.description && (
                <p className="text-muted-foreground line-clamp-1">
                  {selectedRecordForReferral.description}
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmitReferral} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Select Specialist Doctor (Browse Map / Clinics) *
              </label>
              <DoctorHospitalPicker
                selectedDoctorId={selectedDoctorId}
                onSelectDoctor={(doc) => {
                  setSelectedDoctorId(doc?.user_id || "");
                  if (doc?.specialization) {
                    setReferralSpecialization(doc.specialization);
                  }
                }}
                currentDoctorUserId={userId}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Specialization / Department
              </label>
              <Input
                value={referralSpecialization}
                onChange={(e) => setReferralSpecialization(e.target.value)}
                placeholder="e.g. Cardiology, Orthopedics, Neurology..."
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Clinical Reason for Referral *
              </label>
              <textarea
                value={referralReason}
                onChange={(e) => setReferralReason(e.target.value)}
                placeholder="Describe the medical reason for referral (e.g. persistent symptoms, specialized procedure, second opinion)..."
                rows={3}
                className="w-full text-sm bg-muted/40 border border-border/60 rounded-xl p-3 outline-none focus:border-primary transition resize-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Clinical Notes & Observations (Optional)
              </label>
              <textarea
                value={referralNotes}
                onChange={(e) => setReferralNotes(e.target.value)}
                placeholder="Include diagnostic observations, current medications, or instructions for the specialist..."
                rows={2}
                className="w-full text-sm bg-muted/40 border border-border/60 rounded-xl p-3 outline-none focus:border-primary transition resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReferralOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingReferral || !selectedDoctorId || !referralReason.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm"
              >
                {isSubmittingReferral ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <Send className="w-4 h-4 mr-1.5" />
                )}
                Send Referral
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════
          MODAL 2: ADD CLINICAL NOTE ON MEDICAL RECORD
         ════════════════════════════════════════════════════════════ */}
      <Dialog
        open={!!selectedRecordForNote}
        onOpenChange={(open) => !open && setSelectedRecordForNote(null)}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> Add Clinical Note
            </DialogTitle>
            <DialogDescription>
              Document your observations and clinical comments on this medical record.
            </DialogDescription>
          </DialogHeader>

          {selectedRecordForNote && (
            <form onSubmit={handleSaveNote} className="space-y-4 pt-2">
              <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-xs space-y-1">
                <p>
                  <strong>Document:</strong> {selectedRecordForNote.title}
                </p>
                <p className="text-muted-foreground">
                  Patient: {patient?.full_name}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Physician&apos;s Clinical Note *
                </label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Enter diagnostic assessment, test interpretation, or follow-up recommendation..."
                  rows={4}
                  className="w-full text-sm bg-muted/40 border border-border/60 rounded-xl p-3 outline-none focus:border-primary transition resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedRecordForNote(null)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm"
                  disabled={isSubmittingNote || !noteText.trim()}
                >
                  {isSubmittingNote ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  ) : (
                    <Send className="w-4 h-4 mr-1.5" />
                  )}
                  Save Note
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════
          MODAL 3: REQUEST RECORDS ACCESS FROM PATIENT
         ════════════════════════════════════════════════════════════ */}
      <Dialog open={isAccessRequestOpen} onOpenChange={setIsAccessRequestOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-primary" /> Request Medical Records Access
            </DialogTitle>
            <DialogDescription>
              Submit an official clinical request to access medical history and diagnostic files for <strong>{patient?.full_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitAccessRequest} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Clinical Reason for Request *
              </label>
              <textarea
                value={accessReason}
                onChange={(e) => setAccessReason(e.target.value)}
                placeholder="State why access to patient records is needed (e.g. Diagnostic baseline, reviewing prior lab results, secondary consultation)..."
                rows={3}
                className="w-full text-sm bg-muted/40 border border-border/60 rounded-xl p-3 outline-none focus:border-primary transition resize-none"
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAccessRequestOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm"
                disabled={isSubmittingAccess || !accessReason.trim()}
              >
                {isSubmittingAccess ? (
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

      {/* ════════════════════════════════════════════════════════════
          MODAL 4: PRESCRIPTION QR CODE MODAL
         ════════════════════════════════════════════════════════════ */}
      <Dialog
        open={!!selectedPrescriptionForQR}
        onOpenChange={(open) => !open && setSelectedPrescriptionForQR(null)}
      >
        <DialogContent className="sm:max-w-md p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-500" /> Digital Prescription QR
            </DialogTitle>
            <DialogDescription>
              Pharmacies can scan this QR code to verify authenticity and dispense prescribed medications.
            </DialogDescription>
          </DialogHeader>
          {selectedPrescriptionForQR && (
            <div className="py-2">
              <PrescriptionQR
                prescriptionId={selectedPrescriptionForQR.id}
                patientId={selectedPrescriptionForQR.patient_id}
                doctorId={selectedPrescriptionForQR.doctor_id || userId}
                qrToken={selectedPrescriptionForQR.qr_token}
                hash={selectedPrescriptionForQR.hash}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PatientDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
          <p className="text-sm font-medium text-muted-foreground">Loading patient clinical profile...</p>
        </div>
      }
    >
      <PatientDetailContent />
    </Suspense>
  );
}
