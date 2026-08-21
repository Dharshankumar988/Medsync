"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { Avatar } from "@medsync/ui/components/avatar";
import { Button } from "@medsync/ui";
import { Search, Loader2, Activity, ChevronRight, Filter } from "lucide-react";
import { Input } from "@medsync/ui";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.05 } } };

export default function DoctorPatientsPage() {
  const [userId, setUserId] = useState<string>("");
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    async function fetchPatients() {
      try {
        // Find authorized patients via appointments
        const { data: appts } = await supabase
          .from('appointments')
          .select('patient_id')
          .eq('doctor_id', userId);

        // Find authorized patients via prescriptions
        const { data: pres } = await supabase
          .from('prescriptions')
          .select('patient_id')
          .eq('doctor_id', userId);

        const apptPatientIds = appts?.map(a => a.patient_id) || [];
        const presPatientIds = pres?.map(p => p.patient_id) || [];
        
        // Distinct patient IDs
        const distinctPatientIds = Array.from(new Set([...apptPatientIds, ...presPatientIds]));

        if (distinctPatientIds.length === 0) {
          setPatients([]);
          setLoading(false);
          return;
        }

        const { data: patientsData, error } = await supabase
          .from('patients')
          .select('*')
          .in('user_id', distinctPatientIds);

        if (error) throw error;

        setPatients(patientsData || []);
      } catch (err) {
        console.error("Error fetching patients:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPatients();
  }, [userId]);

  const filteredPatients = patients.filter(p => 
    (p.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Patients</h1>
          <p className="text-muted-foreground mt-1">Patients you are authorized to view and treat.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b border-border/40 mb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search patients by name..." 
                className="pl-9 bg-muted/50 border-transparent focus-visible:border-primary"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
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
              <p className="text-muted-foreground max-w-sm mt-1">
                {search ? "No patients match your search." : "You do not have authorization to view any patients yet. Patients will appear here after an appointment is booked."}
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
                  <Link href={`/doctor/patients/${patient.user_id}`} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-4">
                      <Avatar fallback={patient.full_name} src={patient.profile_picture_url} className="w-12 h-12 border-2 border-background shadow-sm" />
                      <div>
                        <p className="font-semibold text-foreground group-hover:text-emerald-600 transition-colors">
                          {patient.full_name}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                          {patient.gender && <span className="capitalize">{patient.gender.toLowerCase()}</span>}
                          {patient.gender && patient.date_of_birth && <span>•</span>}
                          {patient.date_of_birth && <span>DOB: {patient.date_of_birth}</span>}
                          {patient.blood_group && <span>•</span>}
                          {patient.blood_group && <span className="text-rose-500 font-medium">{patient.blood_group}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="secondary" size="sm" className="hidden sm:flex">View Record</Button>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
