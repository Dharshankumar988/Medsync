"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Skeleton,
} from "@medsync/ui";
import {
  UserPlus,
  Stethoscope,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileText,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import Link from "next/link";

export default function PatientReferralsPage() {
  const [userId, setUserId] = useState<string>("");
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const fetchReferrals = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // 1. Try backend API endpoint
      try {
        const res = await api.get("/api/v1/doctor-collaboration/patient/referrals");
        if (res.data?.data && Array.isArray(res.data.data)) {
          setReferrals(res.data.data);
          setLoading(false);
          return;
        }
      } catch (err) {
        // Fallback to Supabase
      }

      // 2. Fallback to Supabase query
      const { data: refData } = await supabase
        .from("doctor_referrals")
        .select("*")
        .eq("patient_id", userId)
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
          .select("user_id, full_name, specialization, hospital_name, clinic_name")
          .in("user_id", docUserIds);

        const docMap = (docProfiles || []).reduce((acc: any, d: any) => {
          acc[d.user_id] = d;
          return acc;
        }, {});

        const enriched = refData.map((r) => ({
          ...r,
          referring_doctor_name: docMap[r.referring_doctor_id]?.full_name || "Referring Doctor",
          referred_to_doctor_name: docMap[r.referred_to_doctor_id]?.full_name || "Specialist Doctor",
          specialization: r.specialization || docMap[r.referred_to_doctor_id]?.specialization,
          hospital_name: docMap[r.referred_to_doctor_id]?.hospital_name,
        }));
        setReferrals(enriched);
      } else {
        setReferrals([]);
      }
    } catch (err) {
      console.error("Failed to load patient referrals", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const acceptedCount = referrals.filter((r) => r.status === "ACCEPTED").length;
  const pendingCount = referrals.filter((r) => r.status === "PENDING").length;

  return (
    <div className="relative space-y-8 pb-12 max-w-6xl mx-auto">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-emerald-500/[0.04] rounded-full blur-[100px]" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <p className="text-sm font-medium tracking-widest uppercase text-emerald-500 mb-2">
            Clinical Care Collaboration
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
            Specialist Referrals
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
            Review recommendations from your attending physicians to consult specialist doctors and hospital departments across the MedSync healthcare network.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={fetchReferrals}
          className="rounded-xl border-border/70 hover:bg-muted/40 self-start md:self-auto h-9 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
        </Button>
      </motion.div>

      {/* Overview Metric Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <Card className="rounded-2xl border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/20 text-emerald-600 rounded-xl">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase font-semibold text-emerald-700/80 dark:text-emerald-300/80">
                Accepted Referrals
              </p>
              <h3 className="text-2xl font-bold text-foreground mt-0.5">{acceptedCount}</h3>
              <p className="text-[11px] text-muted-foreground">Ready for consultation</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-amber-500/20 bg-amber-500/5 relative overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-500/20 text-amber-600 rounded-xl">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase font-semibold text-amber-700/80 dark:text-amber-300/80">
                Under Review
              </p>
              <h3 className="text-2xl font-bold text-foreground mt-0.5">{pendingCount}</h3>
              <p className="text-[11px] text-muted-foreground">Awaiting specialist intake</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-blue-500/20 bg-blue-500/5 relative overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 text-blue-600 rounded-xl">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase font-semibold text-blue-700/80 dark:text-blue-300/80">
                Total Referrals
              </p>
              <h3 className="text-2xl font-bold text-foreground mt-0.5">{referrals.length}</h3>
              <p className="text-[11px] text-muted-foreground">Across all medical departments</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Referrals List Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" /> Specialist Consultation History
          </h2>
          <span className="text-xs text-muted-foreground">
            {referrals.length} {referrals.length === 1 ? "referral" : "referrals"}
          </span>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl bg-muted/50" />
            ))}
          </div>
        ) : referrals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border rounded-2xl bg-card/40 border-dashed">
            <div className="p-4 bg-emerald-500/10 rounded-full mb-3 text-emerald-500">
              <UserPlus className="h-10 w-10" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No Specialist Referrals Yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              When an attending doctor refers you to a specialist physician, second opinion clinic, or surgical center, your referral details and clinical summary will appear here.
            </p>
            <Button asChild className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs">
              <Link href="/patient/appointments">
                Browse Hospitals & Book Consultations <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {referrals.map((ref) => {
              const isAccepted = ref.status === "ACCEPTED";
              const isPending = ref.status === "PENDING";
              const isDeclined = ref.status === "DECLINED";

              return (
                <Card
                  key={ref.id}
                  className={`rounded-2xl border transition-all ${
                    isAccepted
                      ? "border-emerald-500/30 bg-card/70 shadow-sm"
                      : "border-border/60 bg-card/50"
                  }`}
                >
                  <CardContent className="p-6 space-y-4">
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-foreground">
                            Specialist: Dr. {ref.referred_to_doctor_name || "Specialist Physician"}
                          </h3>
                          <Badge
                            variant="outline"
                            className={`text-xs px-2 py-0.5 ${
                              isAccepted
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : isPending
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                            }`}
                          >
                            {isAccepted && <CheckCircle2 className="w-3 h-3 mr-1" />}
                            {isPending && <Clock className="w-3 h-3 mr-1" />}
                            {isDeclined && <AlertCircle className="w-3 h-3 mr-1" />}
                            {isAccepted
                              ? "Referral Accepted"
                              : isPending
                              ? "Pending Review"
                              : "Declined"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                          <span className="text-primary font-medium">
                            {ref.specialization || "Clinical Specialist"}
                          </span>
                          {ref.hospital_name && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" /> {ref.hospital_name}
                              </span>
                            </>
                          )}
                          <span>•</span>
                          <span>Referred on {new Date(ref.created_at).toLocaleDateString()}</span>
                        </p>
                      </div>

                      {/* Action Button for Accepted Referral */}
                      {isAccepted && (
                        <Button
                          asChild
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs shrink-0 h-9"
                        >
                          <Link href="/patient/appointments">
                            <Calendar className="w-3.5 h-3.5 mr-1.5" /> Book Consultation
                          </Link>
                        </Button>
                      )}
                    </div>

                    {/* Details Box */}
                    <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 text-xs space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-muted-foreground uppercase text-[10px] shrink-0 mt-0.5">
                          Referring Doctor:
                        </span>
                        <span className="font-medium text-foreground">
                          Dr. {ref.referring_doctor_name || "Attending Physician"}
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-muted-foreground uppercase text-[10px] shrink-0 mt-0.5">
                          Clinical Reason:
                        </span>
                        <span className="text-foreground leading-relaxed">{ref.reason}</span>
                      </div>

                      {ref.notes && (
                        <div className="flex items-start gap-2 pt-1 border-t border-border/30">
                          <span className="font-semibold text-muted-foreground uppercase text-[10px] shrink-0 mt-0.5">
                            Physician Notes:
                          </span>
                          <span className="text-muted-foreground italic leading-relaxed">
                            {ref.notes}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Banner note if accepted */}
                    {isAccepted && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300">
                        <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                        <span>
                          Dr. {ref.referred_to_doctor_name} has accepted your referral. Your prior clinical documentation has been authorized for review.
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
