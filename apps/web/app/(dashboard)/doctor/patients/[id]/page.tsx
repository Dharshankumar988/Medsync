"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";
import DoctorHospitalPicker from "@/components/doctor/DoctorHospitalPicker";

export default function PatientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const patientId = id as string;
  const [userId, setUserId] = useState<string>("");
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // Patient Sub-Entities
  const [records, setRecords] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [downloadingRecordId, setDownloadingRecordId] = useState<string | null>(null);

  // Referral Modal State
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [referralSpecialization, setReferralSpecialization] = useState<string>("");
  const [referralReason, setReferralReason] = useState<string>("");
  const [referralNotes, setReferralNotes] = useState<string>("");
  const [isSubmittingReferral, setIsSubmittingReferral] = useState(false);

  // Record Access Request Modal (for unauthorized state)
  const [isAccessRequestOpen, setIsAccessRequestOpen] = useState(false);
  const [accessReason, setAccessReason] = useState("");
  const [isSubmittingAccess, setIsSubmittingAccess] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const fetchPatientData = useCallback(async () => {
    if (!userId || !patientId) return;

    try {
      setLoading(true);
      // Verify authorization (has appointment, prescription, or granted record permission)
      const { data: appts } = await supabase
        .from("appointments")
        .select("id")
        .eq("doctor_id", userId)
        .eq("patient_id", patientId)
        .limit(1);
      const { data: pres } = await supabase
        .from("prescriptions")
        .select("id")
        .eq("doctor_id", userId)
        .eq("patient_id", patientId)
        .limit(1);

      const { data: perms } = await supabase
        .from("record_permissions")
        .select("id")
        .eq("granted_to", userId)
        .eq("is_revoked", false)
        .limit(1);

      if ((appts && appts.length > 0) || (pres && pres.length > 0) || (perms && perms.length > 0)) {
        setAuthorized(true);

        // 1. Fetch Patient Profile
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

        // 2. Fetch Medical Records for this patient
        const { data: recData } = await supabase
          .from("medical_records")
          .select("*, record_versions(*, doctor_notes(*))")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false });
        setRecords(recData || []);

        // 3. Fetch Prescriptions for this patient
        const { data: presData } = await supabase
          .from("prescriptions")
          .select("*, prescription_items(*)")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false });
        setPrescriptions(presData || []);

        // 4. Fetch Appointments for this patient
        const { data: apptData } = await supabase
          .from("appointments")
          .select("*")
          .eq("patient_id", patientId)
          .order("appointment_date", { ascending: false });
        setAppointments(apptData || []);

        // 5. Fetch Referrals involving this patient
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
      } else {
        setAuthorized(false);
      }
    } catch (err) {
      console.error(err);
      setAuthorized(false);
    } finally {
      setLoading(false);
    }
  }, [userId, patientId]);

  useEffect(() => {
    fetchPatientData();
  }, [fetchPatientData]);

  const handleOpenReferral = () => {
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

      toast.success("Referral sent successfully to specialist physician");
      setIsReferralOpen(false);
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
      } else {
        toast.info("Document verified on blockchain ledger.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to download record");
    } finally {
      setDownloadingRecordId(null);
    }
  };

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
      toast.success("Record access request submitted. The patient has been notified in Privacy & Consent.");
      setIsAccessRequestOpen(false);
      setAccessReason("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to request record access");
    } finally {
      setIsSubmittingAccess(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 max-w-md mx-auto">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground text-sm">
          You are not currently authorized to view this patient&apos;s medical information. Access requires an appointment, direct referral, or patient consent.
        </p>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => router.push("/doctor/patients")}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Patients
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
            onClick={() => setIsAccessRequestOpen(true)}
          >
            <Lock className="w-4 h-4 mr-1.5" /> Request Access from Patient
          </Button>
        </div>

        {/* Access Request Dialog */}
        <Dialog open={isAccessRequestOpen} onOpenChange={setIsAccessRequestOpen}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Request Patient Record Access</DialogTitle>
              <DialogDescription>
                Submit an official clinical request to access this patient&apos;s medical history and records.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitAccessRequest} className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Clinical Reason *
                </label>
                <textarea
                  value={accessReason}
                  onChange={(e) => setAccessReason(e.target.value)}
                  placeholder="e.g. Consulted for medical opinion, need prior diagnostic history..."
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
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Navigation & Referral Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/doctor/patients")}
            className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {patient?.full_name}
              </h1>
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Authorized Patient
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Patient ID: {patientId.slice(0, 8)}... • Registered Clinical Record
            </p>
          </div>
        </div>

        {/* Doctor Referral Button */}
        <Button
          onClick={handleOpenReferral}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2 rounded-xl self-start sm:self-auto font-medium"
        >
          <UserPlus className="w-4 h-4" />
          Refer to Specialist Doctor
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Sidebar Profile */}
        <div className="w-full md:w-80 space-y-6 shrink-0">
          <Card className="overflow-hidden border border-border/60 shadow-sm rounded-2xl bg-card/60">
            <div className="h-24 bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-primary/20"></div>
            <CardContent className="px-6 pb-6 pt-0 relative">
              <Avatar
                fallback={patient?.full_name}
                src={patient?.profile_picture_url}
                className="w-24 h-24 border-4 border-background shadow-md -mt-12 mb-4"
              />
              <h2 className="text-xl font-bold">{patient?.full_name}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                {patient?.gender && <span className="capitalize">{patient?.gender.toLowerCase()}</span>}
                {patient?.gender && patient?.date_of_birth && <span>•</span>}
                <span>{patient?.date_of_birth || "DOB Unknown"}</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                  <Fingerprint className="w-3 h-3 mr-1" /> {patient?.blood_group || "Blood Group --"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Allergies & Alerts */}
          <Card className="border border-border/60 shadow-sm rounded-2xl bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-foreground">
                <Heart className="w-4 h-4 text-rose-500" /> Allergies & Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Medical Alerts
                  </p>
                  <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    {patient?.medical_alerts || "None documented"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Known Allergies
                  </p>
                  <p className="text-sm text-foreground">
                    {patient?.allergies || "No known allergies"}
                  </p>
                </div>
                {patient?.chronic_diseases && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Chronic Conditions
                    </p>
                    <p className="text-sm text-foreground">{patient.chronic_diseases}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Vitals Summary */}
          <Card className="border border-border/60 shadow-sm rounded-2xl bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-foreground">
                <Activity className="w-4 h-4 text-emerald-500" /> Vitals Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Height</span>
                <span className="text-sm font-semibold text-foreground">
                  {patient?.height_cm ? `${patient.height_cm} cm` : "--"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Weight</span>
                <span className="text-sm font-semibold text-foreground">
                  {patient?.weight_kg ? `${patient.weight_kg} kg` : "--"}
                </span>
              </div>
              {patient?.height_cm && patient?.weight_kg && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">BMI</span>
                  <span className="text-sm font-semibold text-foreground">
                    {(
                      patient.weight_kg /
                      Math.pow(patient.height_cm / 100, 2)
                    ).toFixed(1)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Main Content */}
        <div className="flex-1">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-12 p-0 space-x-6 overflow-x-auto">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none h-full bg-transparent px-0 font-medium"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="records"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none h-full bg-transparent px-0 font-medium"
              >
                Medical Records ({records.length})
              </TabsTrigger>
              <TabsTrigger
                value="prescriptions"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none h-full bg-transparent px-0 font-medium"
              >
                Prescriptions ({prescriptions.length})
              </TabsTrigger>
              <TabsTrigger
                value="appointments"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none h-full bg-transparent px-0 font-medium"
              >
                Appointments ({appointments.length})
              </TabsTrigger>
              <TabsTrigger
                value="referrals"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none h-full bg-transparent px-0 font-medium"
              >
                Referrals ({referrals.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: OVERVIEW */}
            <TabsContent value="overview" className="pt-6 space-y-6">
              <Card className="rounded-2xl border border-border/60 bg-card/60">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Phone Number</p>
                    <p className="font-medium text-sm text-foreground">{patient?.phone_number || "--"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="font-medium text-sm text-foreground">{patient?.address || "--"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[patient?.city, patient?.state, patient?.country].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-border/60 bg-card/60">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Contact Name</p>
                    <p className="font-medium text-sm text-foreground">{patient?.emergency_contact_name || "--"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone Number</p>
                    <p className="font-medium text-sm text-foreground">{patient?.emergency_contact_number || "--"}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: MEDICAL RECORDS INLINE */}
            <TabsContent value="records" className="pt-6 space-y-4">
              <div className="flex items-center justify-between pb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Patient Medical Records ({records.length})
                </h3>
                <Button size="sm" variant="outline" asChild className="rounded-xl text-xs h-8">
                  <Link href={`/doctor/records?patient_id=${patientId}`}>
                    Open in Records Workspace <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </Button>
              </div>

              {records.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border rounded-2xl bg-card/40 border-dashed">
                  <FileText className="w-12 h-12 text-muted-foreground/40 mb-3" />
                  <p className="font-medium text-foreground">No medical records documented</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    No clinical reports or lab diagnostics are on file for this patient.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {records.map((rec) => (
                    <Card key={rec.id} className="rounded-xl border border-border/60 bg-card/60 hover:border-border transition-all">
                      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm text-foreground truncate">{rec.title}</h4>
                            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                              {rec.category || "General"}
                            </Badge>
                            {rec.blockchain_status === "VERIFIED" && (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px]">
                                <ShieldCheck className="w-3 h-3 mr-1" /> Verified
                              </Badge>
                            )}
                          </div>
                          {rec.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{rec.description}</p>
                          )}
                          <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                            <span>Uploaded {new Date(rec.created_at).toLocaleDateString()}</span>
                            {rec.record_versions?.[0]?.doctor_notes?.length > 0 && (
                              <span className="text-primary">• {rec.record_versions[0].doctor_notes.length} Clinical Notes</span>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg text-xs"
                            onClick={() => handleDownloadRecord(rec.id)}
                            disabled={downloadingRecordId === rec.id}
                          >
                            {downloadingRecordId === rec.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            ) : (
                              <Download className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            View / Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB 3: PRESCRIPTIONS INLINE */}
            <TabsContent value="prescriptions" className="pt-6 space-y-4">
              <div className="flex items-center justify-between pb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Prescriptions Issued ({prescriptions.length})
                </h3>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-8" asChild>
                  <Link href={`/doctor/prescriptions/new?patient_id=${patientId}`}>
                    <Pill className="w-3.5 h-3.5 mr-1.5" /> Issue New Prescription
                  </Link>
                </Button>
              </div>

              {prescriptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border rounded-2xl bg-card/40 border-dashed">
                  <Pill className="w-12 h-12 text-muted-foreground/40 mb-3" />
                  <p className="font-medium text-foreground">No prescriptions issued</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    No active medications or digital prescriptions have been issued to this patient yet.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {prescriptions.map((p) => (
                    <Card key={p.id} className="rounded-xl border border-border/60 bg-card/60">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm text-foreground">
                                Diagnosis: {p.diagnosis || "Clinical Prescription"}
                              </h4>
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
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
                              {p.expires_at && ` • Expires: ${new Date(p.expires_at).toLocaleDateString()}`}
                            </p>
                          </div>
                          {p.qr_token && (
                            <Badge variant="outline" className="text-[10px] font-mono">
                              QR: {p.qr_token.slice(0, 8)}...
                            </Badge>
                          )}
                        </div>

                        {p.prescription_items && p.prescription_items.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40 space-y-1.5 text-xs">
                            <p className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">
                              Medications ({p.prescription_items.length}):
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {p.prescription_items.map((item: any) => (
                                <div key={item.id} className="p-2 rounded bg-background/50 border border-border/30">
                                  <p className="font-medium text-foreground">{item.medicine_name}</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {item.dosage} • {item.frequency} for {item.duration}
                                  </p>
                                  {item.instructions && (
                                    <p className="text-[10px] text-primary italic mt-0.5">{item.instructions}</p>
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

            {/* TAB 4: APPOINTMENTS INLINE */}
            <TabsContent value="appointments" className="pt-6 space-y-4">
              <div className="flex items-center justify-between pb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Consultation Appointments ({appointments.length})
                </h3>
              </div>

              {appointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border rounded-2xl bg-card/40 border-dashed">
                  <Calendar className="w-12 h-12 text-muted-foreground/40 mb-3" />
                  <p className="font-medium text-foreground">No appointments recorded</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    No prior consultations or scheduled visits exist with this patient.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {appointments.map((a) => (
                    <Card key={a.id} className="rounded-xl border border-border/60 bg-card/60">
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-foreground">
                              {a.appointment_date} at {a.start_time}
                            </h4>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                a.status === "CONFIRMED"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : a.status === "PENDING"
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {a.status}
                            </Badge>
                          </div>
                          {a.notes && <p className="text-xs text-muted-foreground">{a.notes}</p>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB 5: REFERRALS INLINE (NEW!) */}
            <TabsContent value="referrals" className="pt-6 space-y-4">
              <div className="flex items-center justify-between pb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Specialist Doctor Referrals ({referrals.length})
                </h3>
                <Button
                  size="sm"
                  onClick={handleOpenReferral}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-8"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Refer to Another Specialist
                </Button>
              </div>

              {referrals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border rounded-2xl bg-card/40 border-dashed">
                  <UserPlus className="w-12 h-12 text-muted-foreground/40 mb-3" />
                  <p className="font-medium text-foreground">No referrals recorded</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    This patient has not been referred to any specialist physicians yet.
                  </p>
                  <Button
                    size="sm"
                    onClick={handleOpenReferral}
                    className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs"
                  >
                    Create First Referral
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {referrals.map((ref) => (
                    <Card key={ref.id} className="rounded-xl border border-border/60 bg-card/60">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm text-foreground">
                                Referred to: Dr. {ref.referred_to_doctor?.full_name || "Specialist Physician"}
                              </h4>
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
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
                        </div>

                        <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-xs space-y-1.5">
                          <div>
                            <span className="font-semibold text-muted-foreground uppercase text-[10px]">
                              Clinical Reason:
                            </span>{" "}
                            <span className="text-foreground">{ref.reason}</span>
                          </div>
                          {ref.notes && (
                            <div>
                              <span className="font-semibold text-muted-foreground uppercase text-[10px]">
                                Physician Notes:
                              </span>{" "}
                              <span className="text-muted-foreground italic">{ref.notes}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Refer Patient to Specialist Dialog with Interactive Map */}
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

          <form onSubmit={handleSubmitReferral} className="space-y-4 pt-2">
            {/* Interactive Hospital Map & Specialist Picker */}
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
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
    </div>
  );
}
