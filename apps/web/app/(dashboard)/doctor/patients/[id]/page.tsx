"use client";

import { useEffect, useState } from "react";
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
  Badge
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
  Lock
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";

interface DoctorDirectoryItem {
  id: string;
  user_id: string;
  full_name: string;
  specialization?: string | null;
  hospital_name?: string | null;
  clinic_name?: string | null;
}

export default function PatientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const patientId = id as string;
  const [userId, setUserId] = useState<string>("");
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // Referral Modal State
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [doctorDirectory, setDoctorDirectory] = useState<DoctorDirectoryItem[]>([]);
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

  useEffect(() => {
    if (!userId || !patientId) return;

    async function verifyAndFetch() {
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
          const { data: pData } = await supabase
            .from("patients")
            .select("*")
            .eq("user_id", patientId)
            .single();
          setPatient(pData);
        } else {
          setAuthorized(false);
        }
      } catch (err) {
        console.error(err);
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    }

    verifyAndFetch();
  }, [userId, patientId]);

  // Load doctor directory for referrals
  const loadDoctorDirectory = async () => {
    try {
      const res = await api.get("/api/v1/doctor-collaboration/directory");
      if (res.data?.data) {
        setDoctorDirectory(res.data.data);
      }
    } catch {
      // Fallback to Supabase if endpoint unavailable
      const { data } = await supabase
        .from("doctors")
        .select("id, user_id, full_name, specialization, hospital_name, clinic_name")
        .neq("user_id", userId);
      if (data) setDoctorDirectory(data);
    }
  };

  const handleOpenReferral = () => {
    loadDoctorDirectory();
    setIsReferralOpen(true);
  };

  const handleDoctorSelect = (docUserId: string) => {
    setSelectedDoctorId(docUserId);
    const doc = doctorDirectory.find((d) => d.user_id === docUserId);
    if (doc?.specialization) {
      setReferralSpecialization(doc.specialization);
    }
  };

  const handleSubmitReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !referralReason.trim()) {
      toast.error("Please select a target doctor and provide a referral reason");
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

      const doc = doctorDirectory.find((d) => d.user_id === selectedDoctorId);
      toast.success(`Referral sent successfully to Dr. ${doc?.full_name || "Doctor"}`);
      setIsReferralOpen(false);
      setSelectedDoctorId("");
      setReferralReason("");
      setReferralNotes("");
      setReferralSpecialization("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to submit doctor referral");
    } finally {
      setIsSubmittingReferral(false);
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
      toast.success("Record access request submitted. The patient and attending doctor have been notified.");
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
          You are not currently authorized to view this patient&apos;s medical information. Access requires an appointment, direct referral, or authorized record consent.
        </p>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => router.push("/doctor/patients")}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Patients
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
            onClick={() => setIsAccessRequestOpen(true)}
          >
            <Lock className="w-4 h-4 mr-1.5" /> Request Access
          </Button>
        </div>

        {/* Access Request Dialog */}
        <Dialog open={isAccessRequestOpen} onOpenChange={setIsAccessRequestOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Request Patient Record Access</DialogTitle>
              <DialogDescription>
                Submit an official request to access this patient&apos;s medical history and clinical records.
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
                  placeholder="e.g. Referred for consultation, need prior diagnostic history..."
                  rows={3}
                  className="w-full text-sm bg-muted/40 border border-border/60 rounded-xl p-3 outline-none focus:border-primary transition resize-none"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                disabled={isSubmittingAccess || !accessReason.trim()}
              >
                {isSubmittingAccess ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <Send className="w-4 h-4 mr-1.5" />
                )}
                Submit Access Request
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
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm flex items-center gap-2 rounded-xl self-start sm:self-auto"
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
            <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-12 p-0 space-x-6">
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
                Medical Records
              </TabsTrigger>
              <TabsTrigger
                value="prescriptions"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none h-full bg-transparent px-0 font-medium"
              >
                Prescriptions
              </TabsTrigger>
              <TabsTrigger
                value="appointments"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none h-full bg-transparent px-0 font-medium"
              >
                Appointments
              </TabsTrigger>
            </TabsList>

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

            <TabsContent value="records" className="pt-6">
              <div className="flex flex-col items-center justify-center py-16 text-center border rounded-2xl bg-card/40 border-dashed">
                <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground">View Medical Records</h3>
                <p className="text-muted-foreground max-w-sm mt-1 mb-4 text-sm">
                  Access and review diagnostic documents, lab reports, and clinical notes with verified QR codes.
                </p>
                <Button variant="outline" asChild className="rounded-xl">
                  <Link href={`/doctor/records?patient_id=${patientId}`}>Open Records Directory</Link>
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="prescriptions" className="pt-6">
              <div className="flex flex-col items-center justify-center py-16 text-center border rounded-2xl bg-card/40 border-dashed">
                <Pill className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground">Prescriptions</h3>
                <p className="text-muted-foreground max-w-sm mt-1 mb-4 text-sm">
                  Generate digital prescriptions or check current medications for this patient.
                </p>
                <Button variant="outline" asChild className="rounded-xl">
                  <Link href={`/doctor/prescriptions?patient_id=${patientId}`}>Manage Prescriptions</Link>
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="appointments" className="pt-6">
              <div className="flex flex-col items-center justify-center py-16 text-center border rounded-2xl bg-card/40 border-dashed">
                <Calendar className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground">Appointments</h3>
                <p className="text-muted-foreground max-w-sm mt-1 mb-4 text-sm">
                  Review upcoming consultations and past medical visits with this patient.
                </p>
                <Button variant="outline" asChild className="rounded-xl">
                  <Link href={`/doctor/appointments?patient_id=${patientId}`}>View Appointments</Link>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Refer Patient to Specialist Dialog */}
      <Dialog open={isReferralOpen} onOpenChange={setIsReferralOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" /> Refer Patient to Specialist Doctor
            </DialogTitle>
            <DialogDescription>
              Collaborate by referring <strong>{patient?.full_name}</strong> to another physician. The doctor will receive a real-time notification and access to medical history.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitReferral} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Select Specialist / Doctor *
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => handleDoctorSelect(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border/70 bg-background text-sm outline-none focus:border-primary transition"
                required
              >
                <option value="">-- Choose a doctor --</option>
                {doctorDirectory.map((doc) => (
                  <option key={doc.user_id} value={doc.user_id}>
                    Dr. {doc.full_name} {doc.specialization ? `(${doc.specialization})` : ""} {doc.hospital_name ? `• ${doc.hospital_name}` : ""}
                  </option>
                ))}
              </select>
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
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
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
