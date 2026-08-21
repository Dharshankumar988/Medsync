"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { Avatar } from "@medsync/ui/components/avatar";
import { Button } from "@medsync/ui";
import { Loader2, Activity, ShieldAlert, FileText, Calendar, Heart, Pill, Fingerprint } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@medsync/ui";

export default function PatientDetailPage() {
  const { id } = useParams();
  const patientId = id as string;
  const [userId, setUserId] = useState<string>("");
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

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
        // Verify authorization (has appointment or prescription)
        const { data: appts } = await supabase.from('appointments').select('id').eq('doctor_id', userId).eq('patient_id', patientId).limit(1);
        const { data: pres } = await supabase.from('prescriptions').select('id').eq('doctor_id', userId).eq('patient_id', patientId).limit(1);
        
        // Also could check record_permissions if needed, but for now appointments/prescriptions are enough for basic profile viewing
        if ((appts && appts.length > 0) || (pres && pres.length > 0)) {
          setAuthorized(true);
          
          const { data: pData } = await supabase.from('patients').select('*').eq('user_id', patientId).single();
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

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground max-w-md">
          You are not authorized to view this patient&apos;s medical information. Access has either expired or was revoked.
        </p>
        <Button variant="outline">Request Access</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Left Sidebar Profile */}
        <div className="w-full md:w-80 space-y-6 shrink-0">
          <Card className="overflow-hidden border shadow-sm">
            <div className="h-24 bg-gradient-to-r from-emerald-500/20 to-teal-500/20"></div>
            <CardContent className="px-6 pb-6 pt-0 relative">
              <Avatar fallback={patient?.full_name} src={patient?.profile_picture_url} className="w-24 h-24 border-4 border-background shadow-md -mt-12 mb-4" />
              <h2 className="text-xl font-bold">{patient?.full_name}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                {patient?.gender && <span className="capitalize">{patient?.gender.toLowerCase()}</span>}
                {patient?.gender && patient?.date_of_birth && <span>•</span>}
                <span>{patient?.date_of_birth || "DOB Unknown"}</span>
              </div>
              <div className="flex gap-2 mt-4">
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 border border-rose-500/20">
                  <Fingerprint className="w-3 h-3 mr-1" /> {patient?.blood_group || "O+"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <Heart className="w-4 h-4 text-rose-500" /> Allergies & Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Medical Alerts</p>
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400">{patient?.medical_alerts || "None documented"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Known Allergies</p>
                  <p className="text-sm">{patient?.allergies || "No known allergies"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <Activity className="w-4 h-4" /> Vitals Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Height</span>
                <span className="text-sm font-medium">{patient?.height_cm ? `${patient.height_cm} cm` : "--"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Weight</span>
                <span className="text-sm font-medium">{patient?.weight_kg ? `${patient.weight_kg} kg` : "--"}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Main Content */}
        <div className="flex-1">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-12 p-0 space-x-6">
              <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none h-full bg-transparent px-0">Overview</TabsTrigger>
              <TabsTrigger value="records" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none h-full bg-transparent px-0">Medical Records</TabsTrigger>
              <TabsTrigger value="prescriptions" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none h-full bg-transparent px-0">Prescriptions</TabsTrigger>
              <TabsTrigger value="appointments" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none h-full bg-transparent px-0">Appointments</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="pt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Phone Number</p>
                    <p className="font-medium text-sm">{patient?.phone_number || "--"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="font-medium text-sm">{patient?.address || "--"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[patient?.city, patient?.state, patient?.country].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="font-medium text-sm">{patient?.emergency_contact_name || "--"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone Number</p>
                    <p className="font-medium text-sm">{patient?.emergency_contact_number || "--"}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="records" className="pt-6">
              <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-card border-dashed">
                <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground">View Medical Records</h3>
                <p className="text-muted-foreground max-w-sm mt-1 mb-4">
                  To view this patient&apos;s medical records, navigate to the Medical Records section.
                </p>
                <Button variant="outline" asChild>
                  <a href={`/doctor/records?patient_id=${patientId}`}>Go to Records</a>
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="prescriptions" className="pt-6">
              <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-card border-dashed">
                <Pill className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground">Prescriptions</h3>
                <p className="text-muted-foreground max-w-sm mt-1 mb-4">
                  View or create new prescriptions for this patient.
                </p>
                <Button variant="outline" asChild>
                  <a href={`/doctor/prescriptions?patient_id=${patientId}`}>Manage Prescriptions</a>
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="appointments" className="pt-6">
               <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-card border-dashed">
                <Calendar className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground">Appointments</h3>
                <p className="text-muted-foreground max-w-sm mt-1 mb-4">
                  View past and upcoming consultations with this patient.
                </p>
                <Button variant="outline" asChild>
                  <a href={`/doctor/appointments?patient_id=${patientId}`}>View Appointments</a>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
