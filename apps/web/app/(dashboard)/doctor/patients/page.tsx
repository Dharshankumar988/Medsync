"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@medsync/ui";
import { Avatar } from "@medsync/ui/components/avatar";
import {
  Search,
  Loader2,
  Activity,
  ChevronRight,
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Stethoscope,
  Send
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.05 } } };

export default function DoctorPatientsPage() {
  const [userId, setUserId] = useState<string>("");
  const [patients, setPatients] = useState<any[]>([]);
  const [incomingReferrals, setIncomingReferrals] = useState<any[]>([]);
  const [outgoingReferrals, setOutgoingReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [processingReferralId, setProcessingReferralId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const fetchPatients = useCallback(async (silent = false) => {
    if (!userId) return;
    try {
      if (!silent) setLoading(true);

      // 1. Try backend consulted-patients endpoint first (handles appointments, prescriptions, referrals & permissions)
      try {
        const res = await api.get("/api/v1/doctor-collaboration/consulted-patients");
        if (res.data?.data && Array.isArray(res.data.data)) {
          setPatients(res.data.data);
          if (!silent) setLoading(false);
          return;
        }
      } catch (backendErr) {
        console.warn("Backend consulted-patients endpoint fallback:", backendErr);
      }

      // 2. Fallback: Query Supabase
      const [apptsRes, presRes, permsRes, refsRes] = await Promise.all([
        supabase.from("appointments").select("patient_id").eq("doctor_id", userId),
        supabase.from("prescriptions").select("patient_id").eq("doctor_id", userId),
        supabase
          .from("record_permissions")
          .select("medical_records:record_id(patient_id)")
          .eq("granted_to", userId)
          .eq("is_revoked", false),
        supabase
          .from("doctor_referrals")
          .select("patient_id")
          .or(`referring_doctor_id.eq.${userId},referred_to_doctor_id.eq.${userId}`),
      ]);

      const permPatientIds = (permsRes.data || [])
        .map((p: any) => p?.medical_records?.patient_id)
        .filter(Boolean);

      const apptPatientIds = apptsRes.data?.map((a: any) => a.patient_id) || [];
      const presPatientIds = presRes.data?.map((p: any) => p.patient_id) || [];
      const refPatientIds = refsRes.data?.map((r: any) => r.patient_id) || [];

      // Distinct patient IDs
      const distinctPatientIds = Array.from(
        new Set([...apptPatientIds, ...presPatientIds, ...permPatientIds, ...refPatientIds])
      );

      if (distinctPatientIds.length === 0) {
        setPatients((prev) => (prev.length > 0 && silent ? prev : []));
        return;
      }

      const { data: patientsData, error } = await supabase
        .from("patients")
        .select("*")
        .in("user_id", distinctPatientIds);

      if (error) throw error;

      // Ensure fallback to users.profile_image_url if profile_picture_url is null
      const missingAvatarIds = (patientsData || [])
        .filter((p) => !p.profile_picture_url)
        .map((p) => p.user_id);

      let enrichedPatients = patientsData || [];
      if (missingAvatarIds.length > 0) {
        const { data: usersData } = await supabase
          .from("users")
          .select("id, profile_image_url")
          .in("id", missingAvatarIds);

        const uMap = (usersData || []).reduce((acc: any, u: any) => {
          acc[u.id] = u.profile_image_url;
          return acc;
        }, {});

        enrichedPatients = enrichedPatients.map((p) => ({
          ...p,
          profile_picture_url: p.profile_picture_url || uMap[p.user_id],
        }));
      }

      setPatients(enrichedPatients);
    } catch (err) {
      console.error("Error fetching patients:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [userId]);

  const fetchReferrals = useCallback(async (silent = false) => {
    if (!userId) return;
    try {
      if (!silent) setReferralsLoading(true);
      const [incRes, outRes] = await Promise.all([
        api.get("/api/v1/doctor-collaboration/referrals/incoming"),
        api.get("/api/v1/doctor-collaboration/referrals/outgoing"),
      ]);
      setIncomingReferrals(incRes.data?.data || []);
      setOutgoingReferrals(outRes.data?.data || []);
    } catch (err) {
      console.error("Error fetching referrals:", err);
    } finally {
      if (!silent) setReferralsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchPatients();
      fetchReferrals();
    }
  }, [userId, fetchPatients, fetchReferrals]);

  const handleAcceptReferral = async (referralId: string) => {
    setProcessingReferralId(referralId);
    // 1. Instant optimistic UI update: status changes to ACCEPTED immediately
    const acceptedRef = incomingReferrals.find((r) => r.id === referralId);
    setIncomingReferrals((prev) =>
      prev.map((r) => (r.id === referralId ? { ...r, status: "ACCEPTED" } : r))
    );

    // 2. Add patient to local state immediately so patient tab reflects acceptance instantly
    if (acceptedRef?.patient_id) {
      setPatients((prev) => {
        if (prev.some((p) => (p.user_id || p.id) === acceptedRef.patient_id)) return prev;
        return [
          {
            id: acceptedRef.patient_id,
            user_id: acceptedRef.patient_id,
            full_name: acceptedRef.patient_name || "Patient",
            phone_number: acceptedRef.patient_phone || null,
          },
          ...prev,
        ];
      });
    }

    try {
      const res = await api.post(`/api/v1/doctor-collaboration/referrals/${referralId}/accept`);
      if (res.data?.data) {
        setIncomingReferrals((prev) =>
          prev.map((r) => (r.id === referralId ? { ...r, ...res.data.data, status: "ACCEPTED" } : r))
        );
      }
      toast.success("Referral accepted. You now have clinical access to the patient's records.");
      await Promise.all([fetchReferrals(true), fetchPatients(true)]);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to accept referral");
      fetchReferrals(true);
      fetchPatients(true);
    } finally {
      setProcessingReferralId(null);
    }
  };

  const handleDeclineReferral = async (referralId: string) => {
    setProcessingReferralId(referralId);
    // Instant optimistic UI update
    setIncomingReferrals((prev) =>
      prev.map((r) => (r.id === referralId ? { ...r, status: "REJECTED" } : r))
    );
    try {
      const res = await api.post(`/api/v1/doctor-collaboration/referrals/${referralId}/decline`);
      if (res.data?.data) {
        setIncomingReferrals((prev) =>
          prev.map((r) => (r.id === referralId ? { ...r, ...res.data.data, status: "REJECTED" } : r))
        );
      }
      toast.info("Referral declined.");
      await fetchReferrals(true);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to decline referral");
      fetchReferrals(true);
    } finally {
      setProcessingReferralId(null);
    }
  };

  const pendingIncomingCount = incomingReferrals.filter(
    (r) => r.status === "PENDING"
  ).length;

  const filteredPatients = patients.filter((p) =>
    (p.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Patient Directory & Referrals
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your authorized patients and collaborate across clinical practices with physician referrals.
          </p>
        </div>
      </div>

      <Tabs defaultValue="patients" className="w-full">
        <TabsList className="bg-muted/40 p-1 rounded-xl">
          <TabsTrigger value="patients" className="rounded-lg text-sm font-medium">
            My Authorized Patients ({patients.length})
          </TabsTrigger>
          <TabsTrigger value="incoming" className="rounded-lg text-sm font-medium flex items-center gap-2">
            Incoming Referrals
            {pendingIncomingCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[11px] bg-primary text-primary-foreground">
                {pendingIncomingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="rounded-lg text-sm font-medium">
            Sent Referrals ({outgoingReferrals.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: My Patients */}
        <TabsContent value="patients" className="pt-4 space-y-4">
          <Card className="rounded-2xl border border-border/60">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search patients by name..."
                    className="pl-9 bg-muted/30 border-border/60 focus-visible:border-primary rounded-xl"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Activity className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground">No authorized patients</h3>
                  <p className="text-muted-foreground max-w-sm mt-1 text-sm">
                    {search
                      ? "No patients match your search query."
                      : "Patients will appear here automatically once an appointment is scheduled or a doctor referral is accepted."}
                  </p>
                </div>
              ) : (
                <motion.div
                  className="divide-y divide-border/40"
                  initial="hidden"
                  animate="visible"
                  variants={stagger}
                >
                  {filteredPatients.map((patient, idx) => (
                    <motion.div key={patient.user_id || idx} variants={fadeUp}>
                      <Link
                        href={`/doctor/patients/${patient.user_id}`}
                        className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar
                            fallback={patient.full_name}
                            src={patient.profile_picture_url}
                            className="w-12 h-12 border-2 border-background shadow-sm"
                          />
                          <div>
                            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {patient.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                              {patient.gender && (
                                <span className="capitalize">{patient.gender.toLowerCase()}</span>
                              )}
                              {patient.gender && patient.date_of_birth && <span>•</span>}
                              {patient.date_of_birth && <span>DOB: {patient.date_of_birth}</span>}
                              {patient.blood_group && <span>•</span>}
                              {patient.blood_group && (
                                <span className="text-rose-500 font-medium">
                                  {patient.blood_group}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button variant="secondary" size="sm" className="hidden sm:flex rounded-lg text-xs">
                            View Patient File
                          </Button>
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Incoming Referrals */}
        <TabsContent value="incoming" className="pt-4 space-y-4">
          <Card className="rounded-2xl border border-border/60">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-semibold">Incoming Referrals</CardTitle>
              <CardDescription>
                Patients referred to you by fellow physicians for clinical evaluations and treatment.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {referralsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : incomingReferrals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-14 h-14 bg-muted/60 rounded-full flex items-center justify-center mb-3">
                    <UserPlus className="w-7 h-7 text-muted-foreground/60" />
                  </div>
                  <h3 className="text-base font-medium text-foreground">No incoming referrals</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    When other doctors refer patients to your care, they will appear here with medical context and clinical notes.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {incomingReferrals.map((ref) => (
                    <div key={ref.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground text-sm">
                            {ref.patient_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            referred by <strong className="text-foreground">Dr. {ref.referring_doctor_name}</strong>
                          </span>
                          {ref.specialization && (
                            <Badge variant="outline" className="text-[11px] bg-primary/5 text-primary border-primary/20">
                              <Stethoscope className="w-3 h-3 mr-1" /> {ref.specialization}
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-[11px] uppercase ${
                              ref.status === "PENDING"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                : ref.status === "ACCEPTED"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                : "bg-destructive/10 text-destructive border-destructive/30"
                            }`}
                          >
                            {ref.status}
                          </Badge>
                        </div>

                        <p className="text-xs text-foreground/90 font-medium">
                          Reason: {ref.reason}
                        </p>
                        {ref.notes && (
                          <p className="text-xs text-muted-foreground italic bg-muted/40 p-2 rounded-lg border border-border/40">
                            &ldquo;{ref.notes}&rdquo;
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Received: {new Date(ref.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {ref.status === "PENDING" ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs rounded-xl border-border/60"
                              disabled={processingReferralId === ref.id}
                              onClick={() => handleDeclineReferral(ref.id)}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1 text-destructive" /> Decline
                            </Button>
                            <Button
                              size="sm"
                              className="text-xs rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white"
                              disabled={processingReferralId === ref.id}
                              onClick={() => handleAcceptReferral(ref.id)}
                            >
                              {processingReferralId === ref.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              )}
                              Accept Referral
                            </Button>
                          </>
                        ) : ref.status === "ACCEPTED" ? (
                          <Button variant="outline" size="sm" asChild className="text-xs rounded-xl">
                            <Link href={`/doctor/patients/${ref.patient_id}`}>
                              View Patient File <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Sent Referrals */}
        <TabsContent value="outgoing" className="pt-4 space-y-4">
          <Card className="rounded-2xl border border-border/60">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-semibold">Sent Referrals</CardTitle>
              <CardDescription>
                Patients you have referred to other specialists across the MedSync network.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {referralsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : outgoingReferrals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-14 h-14 bg-muted/60 rounded-full flex items-center justify-center mb-3">
                    <Send className="w-7 h-7 text-muted-foreground/60" />
                  </div>
                  <h3 className="text-base font-medium text-foreground">No outgoing referrals</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    To refer a patient, visit the patient&apos;s record page and click &quot;Refer to Specialist Doctor&quot;.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {outgoingReferrals.map((ref) => (
                    <div key={ref.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground text-sm">
                            {ref.patient_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            referred to <strong className="text-foreground">Dr. {ref.referred_to_doctor_name}</strong>
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[11px] uppercase ${
                              ref.status === "PENDING"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                : ref.status === "ACCEPTED"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                : "bg-destructive/10 text-destructive border-destructive/30"
                            }`}
                          >
                            {ref.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-foreground/90">Reason: {ref.reason}</p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Submitted on {new Date(ref.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" asChild className="text-xs rounded-xl">
                        <Link href={`/doctor/patients/${ref.patient_id}`}>
                          View Patient <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
