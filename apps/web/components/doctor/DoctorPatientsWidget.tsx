"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input } from "@medsync/ui";
import { Users, Search, Pill, ChevronRight, FileText, UserPlus, Phone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import Link from "next/link";

function calculateAge(dobString: string): number {
  const birthDate = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function DoctorPatientsWidget() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadPatients() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
          const res = await api.get("/api/v1/doctor-collaboration/consulted-patients");
          if (res.data?.data && Array.isArray(res.data.data)) {
            setPatients(res.data.data);
            setLoading(false);
            return;
          }
        } catch {
          // Fallback to supabase appointments & prescriptions
          const [apptsRes, presRes] = await Promise.all([
            supabase.from("appointments").select("patient_id, created_at").eq("doctor_id", user.id),
            supabase.from("prescriptions").select("patient_id, created_at").eq("doctor_id", user.id)
          ]);

          const patIds = [
            ...new Set([
              ...(apptsRes.data?.map(a => a.patient_id) || []),
              ...(presRes.data?.map(p => p.patient_id) || [])
            ].filter(Boolean))
          ];

          if (patIds.length > 0) {
            const { data: patientRows } = await supabase
              .from("patients")
              .select("id, user_id, full_name, date_of_birth, gender, phone_number, blood_group")
              .in("user_id", patIds);

            setPatients(patientRows || []);
          }
        }
      } catch (err) {
        console.warn("Notice loading doctor patients:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPatients();
  }, []);

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    return (
      (p.full_name || "").toLowerCase().includes(q) ||
      (p.phone_number || "").toLowerCase().includes(q)
    );
  });

  return (
    <Card className="rounded-2xl border border-border/60 bg-card/50 shadow-sm overflow-hidden h-full flex flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40 bg-muted/10">
          <div>
            <div className="flex items-center gap-2">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <Users className="h-4 w-4" />
              </div>
              <CardTitle className="text-base font-semibold">Your Patients</CardTitle>
            </div>
            <CardDescription className="text-xs mt-1">
              Active consultations & clinical medical files
            </CardDescription>
          </div>

          <Button variant="ghost" size="sm" asChild className="rounded-lg text-xs text-muted-foreground hover:text-foreground">
            <Link href="/doctor/patients">
              All <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="pt-3.5 space-y-3">
          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search patients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 rounded-lg text-xs bg-muted/30 border-border/50"
            />
          </div>

          {/* Patients List */}
          {loading ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs space-y-2">
              <Users className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="font-medium text-foreground">No patients found</p>
              <p className="text-[11px] max-w-[200px] mx-auto">
                {search ? "No matching patient results." : "When you consult patients, they will appear here for fast access."}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {filtered.slice(0, 5).map((pat) => {
                const patientId = pat.user_id || pat.id;
                const age = pat.date_of_birth ? calculateAge(pat.date_of_birth) : null;

                return (
                  <div
                    key={patientId}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 hover:border-primary/40 bg-muted/20 hover:bg-primary/[0.02] transition-all gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs text-foreground truncate">
                        {pat.full_name || "Patient"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {[age ? `${age}y` : null, pat.gender, pat.blood_group].filter(Boolean).join(" • ") || "Registered Patient"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        asChild
                        className="h-7 px-2 text-[11px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                        title="Create Prescription"
                      >
                        <Link href={`/doctor/prescriptions/new?patient_id=${patientId}`}>
                          <Pill className="h-3 w-3 mr-1" /> Rx
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="h-7 px-2 text-[11px] hover:border-primary/50"
                        title="View Records"
                      >
                        <Link href={`/doctor/patients/${patientId}`}>
                          <FileText className="h-3 w-3 mr-1" /> Files
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </div>

      <div className="p-4 pt-0">
        <Button variant="outline" asChild className="w-full rounded-xl text-xs font-semibold h-9">
          <Link href="/doctor/patients">
            View All Patients & Medical Records
          </Link>
        </Button>
      </div>
    </Card>
  );
}
export default DoctorPatientsWidget;
