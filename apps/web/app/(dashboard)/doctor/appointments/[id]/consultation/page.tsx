"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input, Badge
} from "@medsync/ui";
import {
  Loader2, ArrowLeft, Save, Pill, CheckCircle2, User,
  Calendar, Clock, FileText, Stethoscope, Heart, ClipboardList
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion } from "framer-motion";

const API_PREFIX = "/api/v1";

export default function ConsultationPage() {
  const { id } = useParams();
  const router = useRouter();
  const appointmentId = id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [appointment, setAppointment] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [consultation, setConsultation] = useState<any>(null);
  const [userId, setUserId] = useState("");

  // Consultation form fields
  const [formData, setFormData] = useState({
    symptoms: "",
    observations: "",
    diagnosis: "",
    treatment_plan: "",
    clinical_notes: "",
    follow_up_date: "",
    follow_up_notes: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const fetchConsultationData = useCallback(async () => {
    try {
      // Load appointment
      const { data: apptData, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId)
        .single();

      if (error) throw error;
      setAppointment(apptData);

      // Load patient
      const { data: patientData } = await supabase
        .from("patients")
        .select("*")
        .eq("user_id", apptData.patient_id)
        .single();
      setPatient(patientData);

      // Load existing consultation via API
      try {
        const res = await api.get(`${API_PREFIX}/consultations/appointment/${appointmentId}`);
        const consultData = res.data?.data;
        if (consultData) {
          setConsultation(consultData);
          setFormData({
            symptoms: consultData.symptoms || "",
            observations: consultData.observations || "",
            diagnosis: consultData.diagnosis || "",
            treatment_plan: consultData.treatment_plan || "",
            clinical_notes: consultData.clinical_notes || "",
            follow_up_date: consultData.follow_up_date || "",
            follow_up_notes: consultData.follow_up_notes || "",
          });
        }
      } catch {
        // No existing consultation found — that's OK
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load consultation data");
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    if (appointmentId) fetchConsultationData();
  }, [appointmentId, fetchConsultationData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (consultation) {
        // Update existing consultation
        const updateData: any = {};
        Object.entries(formData).forEach(([key, value]) => {
          if (value !== "" || (consultation as any)[key] !== null) {
            updateData[key] = value || null;
          }
        });

        await api.patch(`${API_PREFIX}/consultations/${consultation.id}`, updateData);
        toast.success("Consultation notes saved");
      } else {
        // Create new consultation
        const res = await api.post(`${API_PREFIX}/consultations`, {
          appointment_id: appointmentId,
          ...Object.fromEntries(
            Object.entries(formData).filter(([, v]) => v !== "").map(([k, v]) => [k, v || null])
          ),
        });
        setConsultation(res.data?.data);
        toast.success("Consultation created");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to save";
      toast.error(msg);
      // Fallback: save notes to appointment directly
      await supabase
        .from("appointments")
        .update({ notes: formData.clinical_notes || formData.diagnosis })
        .eq("id", appointmentId);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      if (!consultation) {
        // Create first, then complete
        const createRes = await api.post(`${API_PREFIX}/consultations`, {
          appointment_id: appointmentId,
          ...Object.fromEntries(
            Object.entries(formData).filter(([, v]) => v !== "").map(([k, v]) => [k, v || null])
          ),
        });
        const newConsult = createRes.data?.data;

        await api.patch(`${API_PREFIX}/consultations/${newConsult.id}/complete`, {
          diagnosis: formData.diagnosis || null,
          treatment_plan: formData.treatment_plan || null,
          clinical_notes: formData.clinical_notes || null,
          follow_up_date: formData.follow_up_date || null,
          follow_up_notes: formData.follow_up_notes || null,
        });
      } else {
        await api.patch(`${API_PREFIX}/consultations/${consultation.id}/complete`, {
          diagnosis: formData.diagnosis || null,
          treatment_plan: formData.treatment_plan || null,
          clinical_notes: formData.clinical_notes || null,
          follow_up_date: formData.follow_up_date || null,
          follow_up_notes: formData.follow_up_notes || null,
        });
      }

      toast.success("Consultation completed!");
      router.push("/doctor/appointments");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to complete consultation";
      toast.error(msg);
      // Fallback
      await supabase
        .from("appointments")
        .update({ status: "COMPLETED", notes: formData.clinical_notes || formData.diagnosis })
        .eq("id", appointmentId);
      toast.success("Consultation completed (fallback)");
      router.push("/doctor/appointments");
    } finally {
      setCompleting(false);
    }
  };

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );

  const isCompleted = appointment?.status === "COMPLETED" || consultation?.completed_at;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/doctor/appointments">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Consultation</h1>
          <p className="text-muted-foreground mt-1">
            Patient: <span className="text-foreground font-medium">{patient?.full_name || "Unknown"}</span>
            {isCompleted && (
              <Badge variant="outline" className="ml-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
              </Badge>
            )}
          </p>
        </div>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main: Consultation Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="md:col-span-2 space-y-6"
        >
          <Card className="rounded-2xl border border-border/60 bg-card/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Stethoscope className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <CardTitle>Clinical Assessment</CardTitle>
                  <CardDescription>Document patient symptoms, examination, and findings.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5 text-rose-500" /> Symptoms
                </label>
                <textarea
                  className="flex w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px] resize-y"
                  placeholder="Patient-reported symptoms (e.g. fever for 3 days, headache, body ache...)"
                  value={formData.symptoms}
                  onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                  disabled={isCompleted}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5 text-blue-500" /> Observations
                </label>
                <textarea
                  className="flex w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] resize-y"
                  placeholder="Physical examination findings, vitals, test results..."
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  disabled={isCompleted}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-amber-500" /> Diagnosis
                </label>
                <textarea
                  className="flex w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] resize-y"
                  placeholder="Primary and secondary diagnoses..."
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  disabled={isCompleted}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Treatment Plan</label>
                <textarea
                  className="flex w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] resize-y"
                  placeholder="Prescribed treatment, lifestyle changes, follow-up instructions..."
                  value={formData.treatment_plan}
                  onChange={(e) => setFormData({ ...formData, treatment_plan: e.target.value })}
                  disabled={isCompleted}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Additional Clinical Notes</label>
                <textarea
                  className="flex w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px] resize-y"
                  placeholder="Any additional notes, observations, or clinical reasoning..."
                  value={formData.clinical_notes}
                  onChange={(e) => setFormData({ ...formData, clinical_notes: e.target.value })}
                  disabled={isCompleted}
                />
              </div>

              {!isCompleted && (
                <div className="flex justify-between border-t border-border/40 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-xl"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Draft
                  </Button>
                  <Button
                    onClick={handleComplete}
                    disabled={completing}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    {completing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Complete Consultation
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          {/* Follow-up */}
          <Card className="rounded-2xl border border-border/60 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Follow-up</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Follow-up Date</label>
                <Input
                  type="date"
                  value={formData.follow_up_date}
                  onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                  disabled={isCompleted}
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Follow-up Notes</label>
                <textarea
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[60px] resize-y"
                  placeholder="Instructions for next visit..."
                  value={formData.follow_up_notes}
                  onChange={(e) => setFormData({ ...formData, follow_up_notes: e.target.value })}
                  disabled={isCompleted}
                />
              </div>
            </CardContent>
          </Card>

          {/* Prescription */}
          <Card className="rounded-2xl border border-border/60 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Prescription</CardTitle>
              <CardDescription>Issue a prescription for this consultation.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full rounded-xl" variant="outline" asChild>
                <Link
                  href={`/doctor/prescriptions/new?appointment_id=${appointmentId}&patient_id=${appointment?.patient_id}`}
                >
                  <Pill className="w-4 h-4 mr-2" /> Create Prescription
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Patient Vitals */}
          <Card className="rounded-2xl border border-border/60 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Patient Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{patient?.full_name || "—"}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Blood Group</span>
                <span className="font-medium text-rose-500">{patient?.blood_group || "—"}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Gender</span>
                <span className="font-medium">{patient?.gender || "—"}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">DOB</span>
                <span className="font-medium">{patient?.date_of_birth || "—"}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Allergies</span>
                <span className="font-medium">{patient?.allergies || "None"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Medical Alerts</span>
                <span className="font-medium text-amber-600">{patient?.medical_alerts || "None"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Appointment Info */}
          <Card className="rounded-2xl border border-border/60 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Appointment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" /> {appointment?.appointment_date}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />{" "}
                {String(appointment?.start_time).slice(0, 5)} –{" "}
                {String(appointment?.end_time).slice(0, 5)}
              </div>
              <Badge
                variant="outline"
                className={`mt-2 capitalize ${
                  appointment?.status === "COMPLETED"
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                }`}
              >
                {(appointment?.status || "").toLowerCase()}
              </Badge>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
