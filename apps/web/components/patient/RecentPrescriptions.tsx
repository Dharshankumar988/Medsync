"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Badge } from "@medsync/ui";
import { Pill, Clock, ArrowRight, CheckCircle2, ChevronRight, Stethoscope } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDoctorName } from "@/lib/formatDoctorName";
import Link from "next/link";

interface RecentPrescriptionsProps {
  initialPrescriptions?: any[];
}

export function RecentPrescriptions({ initialPrescriptions = [] }: RecentPrescriptionsProps) {
  const [prescriptions, setPrescriptions] = useState<any[]>(initialPrescriptions);
  const [loading, setLoading] = useState(initialPrescriptions.length === 0);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("prescriptions")
          .select(`
            *,
            prescription_items(*)
          `)
          .eq("patient_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3);

        if (!error && data) {
          const doctorIds = [...new Set(data.map(p => p.doctor_id).filter(Boolean))];
          let docMap: Record<string, string> = {};

          if (doctorIds.length > 0) {
            const { data: doctors } = await supabase
              .from("doctors")
              .select("user_id, full_name")
              .in("user_id", doctorIds);

            if (doctors) {
              docMap = doctors.reduce((acc, d) => ({ ...acc, [d.user_id]: d.full_name }), {});
            }
          }

          const formatted = data.map(rx => ({
            ...rx,
            doctor_name: docMap[rx.doctor_id] || "Doctor"
          }));

          setPrescriptions(formatted);
        }
      } catch (err) {
        console.error("Failed to load recent prescriptions:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <Card className="col-span-full xl:col-span-2 rounded-2xl border border-border/60 bg-card/50">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Pill className="h-4 w-4" />
            </div>
            <CardTitle className="text-base font-semibold">Recent Prescriptions</CardTitle>
          </div>
          <CardDescription className="text-xs mt-1">
            Active digital medications & treatment plans
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild className="rounded-lg text-xs text-muted-foreground hover:text-foreground">
          <Link href="/patient/prescriptions">
            View All <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3 py-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/10 rounded-xl border border-border/40">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-2.5">
              <Pill className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">No active prescriptions</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[260px] leading-relaxed">
              When a doctor writes a prescription for you, it will appear here for 1-click pharmacy dispensing.
            </p>
            <Button size="sm" variant="outline" asChild className="mt-4 rounded-xl text-xs">
              <Link href="/patient/appointments">
                <Stethoscope className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Consult a Doctor
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {prescriptions.map((rx) => {
              const items = rx.prescription_items || [];
              const primaryMed = items[0]?.medicine_name || rx.diagnosis || "Medication";
              const dateStr = rx.created_at ? new Date(rx.created_at).toLocaleDateString() : "Recent";
              const isDispensed = rx.is_dispensed === true;

              return (
                <div
                  key={rx.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-border/50 hover:border-emerald-500/40 bg-muted/20 hover:bg-emerald-500/[0.02] transition-all gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isDispensed ? 'bg-muted text-muted-foreground' : 'bg-emerald-500/15 text-emerald-600'}`}>
                      <Pill className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold truncate text-foreground">{primaryMed}</p>
                        {items.length > 1 && (
                          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                            +{items.length - 1} more
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 rounded ${isDispensed
                            ? "bg-muted text-muted-foreground border-border"
                            : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            }`}
                        >
                          {isDispensed ? "Dispensed" : "Active Rx"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        Prescribed by {formatDoctorName(rx.doctor_name)} • {dateStr}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      className="h-8 px-3 rounded-lg text-xs hover:border-emerald-500/50 hover:text-emerald-600"
                    >
                      <Link href="/patient/prescriptions">
                        Order <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
export default RecentPrescriptions;

