"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Badge } from "@medsync/ui";
import { Pill, Plus, ArrowRight, Stethoscope, Search, Clock, FileText, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

const QUICK_DIAGNOSES = [
  "Viral Pharyngitis",
  "Hypertension",
  "Type 2 Diabetes",
  "Seasonal Allergies"
];

const QUICK_MEDS = [
  "Paracetamol 650mg",
  "Amoxicillin 500mg",
  "Metformin 500mg",
  "Cetirizine 10mg"
];

export function CreatePrescriptionCard() {
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [selectedMed, setSelectedMed] = useState("");
  const [recentPrescriptions, setRecentPrescriptions] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"quick" | "recent">("quick");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch patients for this doctor
        try {
          const res = await api.get("/api/v1/doctor-collaboration/consulted-patients");
          if (res.data?.data && Array.isArray(res.data.data)) {
            setPatients(res.data.data);
          }
        } catch {
          // Fallback to supabase appointments/patients
          const { data: appts } = await supabase
            .from("appointments")
            .select("patient_id")
            .eq("doctor_id", user.id);

          const ids = [...new Set(appts?.map((a: any) => a.patient_id).filter(Boolean))];
          if (ids.length > 0) {
            const { data: pats } = await supabase
              .from("patients")
              .select("user_id, full_name")
              .in("user_id", ids);
            setPatients(pats || []);
          }
        }

        // Fetch doctor's recent prescriptions
        const { data: rxList } = await supabase
          .from("prescriptions")
          .select("id, patient_id, diagnosis, created_at, is_dispensed")
          .eq("doctor_id", user.id)
          .order("created_at", { ascending: false })
          .limit(4);

        if (rxList) {
          setRecentPrescriptions(rxList);
        }
      } catch (err) {
        console.warn("Notice loading prescription widget data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleLaunchStudio = () => {
    const params = new URLSearchParams();
    if (selectedPatientId) params.set("patient_id", selectedPatientId);
    if (diagnosis) params.set("diagnosis", diagnosis);
    router.push(`/doctor/prescriptions/new?${params.toString()}`);
  };

  return (
    <Card className="rounded-2xl border border-border/60 bg-card/50 shadow-sm overflow-hidden h-full flex flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40 bg-muted/10">
          <div>
            <div className="flex items-center gap-2">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <Pill className="h-4 w-4" />
              </div>
              <CardTitle className="text-base font-semibold">Create Prescription</CardTitle>
            </div>
            <CardDescription className="text-xs mt-1">
              Issue tamper-proof digital Rx anchored to blockchain
            </CardDescription>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="inline-flex p-0.5 rounded-lg bg-muted text-xs font-medium">
              <button
                type="button"
                onClick={() => setViewMode("quick")}
                className={`px-2.5 py-1 rounded-md transition-all ${viewMode === "quick" ? "bg-background shadow text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                Fast Rx
              </button>
              <button
                type="button"
                onClick={() => setViewMode("recent")}
                className={`px-2.5 py-1 rounded-md transition-all ${viewMode === "recent" ? "bg-background shadow text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                Recent
              </button>
            </div>

            <Button asChild size="sm" className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
              <Link href="/doctor/prescriptions/new">
                <Plus className="w-3.5 h-3.5 mr-1" /> New Rx
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {viewMode === "quick" ? (
            <div className="space-y-3.5">
              {/* Patient Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Target Patient
                </label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select a registered patient...</option>
                  {patients.map((p) => (
                    <option key={p.user_id || p.id} value={p.user_id || p.id}>
                      {p.full_name || "Patient"} {p.contact_number ? `(${p.contact_number})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Diagnosis + Fast Chips */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Diagnosis / Indication
                </label>
                <Input
                  placeholder="e.g. Acute Bronchitis"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="rounded-xl h-10 text-sm"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_DIAGNOSES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDiagnosis(d)}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${diagnosis === d
                        ? "bg-emerald-500/20 text-emerald-600 border-emerald-500/40 font-medium"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted border-border/60"
                        }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Medication Suggestion Chips */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Quick Medication Add
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_MEDS.map((med) => (
                    <button
                      key={med}
                      type="button"
                      onClick={() => setSelectedMed(med)}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${selectedMed === med
                        ? "bg-primary/20 text-primary border-primary/40 font-medium"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted border-border/60"
                        }`}
                    >
                      + {med}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentPrescriptions.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-xs">
                  No prescriptions issued yet. Click &apos;New Rx&apos; to create your first prescription.
                </div>
              ) : (
                recentPrescriptions.map((rx) => (
                  <div
                    key={rx.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border/40 hover:border-emerald-500/30 bg-muted/20 text-xs gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                        <FileText className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{rx.diagnosis || "Prescription"}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {rx.created_at ? new Date(rx.created_at).toLocaleDateString() : "Recent"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-2 py-0.5 shrink-0 ${rx.is_dispensed ? "text-muted-foreground border-border" : "text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
                        }`}
                    >
                      {rx.is_dispensed ? "Dispensed" : "Active"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </div>

      <div className="p-5 pt-0">
        <Button
          onClick={handleLaunchStudio}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm flex items-center justify-center gap-2"
        >
          <span>Continue in Prescription Studio</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
export default CreatePrescriptionCard;

