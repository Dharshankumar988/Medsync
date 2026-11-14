"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Skeleton, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@medsync/ui";
import { Pill, Download, AlertCircle, QrCode, Plus, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { PrescriptionQR } from "@medsync/ui"; 
import { toast } from "sonner";
import axios from "axios";
import api from "@/lib/api";
import { getApiUrl } from "@/lib/backend-config";
import Link from "next/link";

export default function DoctorPrescriptionsPage() {
  const [userId, setUserId] = useState<string>("");
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const loadPrescriptions = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Primary: Fetch via FastAPI backend (supports doctor profile & patient name mapping)
      try {
        const res = await api.get('/api/v1/prescriptions/');
        const apiData = res.data?.data || res.data;
        if (Array.isArray(apiData) && apiData.length > 0) {
          const formatted = apiData.map((p: any) => ({
            ...p,
            patient: { full_name: p.patient_name || "Patient" },
            prescription_items: p.prescription_items || []
          }));
          setPrescriptions(formatted);
          setLoading(false);
          return;
        }
      } catch (backendErr) {
        console.warn("Backend prescription fetch fallback:", backendErr);
      }

      // 2. Secondary: Fallback to Supabase
      if (userId) {
        // Query doctor profile to get any linked ID
        const { data: docProf } = await supabase.from('doctors').select('id, user_id').eq('user_id', userId).maybeSingle();
        const docIds = docProf ? [userId, docProf.id] : [userId];

        const { data, error } = await supabase
          .from("prescriptions")
          .select(`
            *,
            prescription_items(*)
          `)
          .in("doctor_id", docIds)
          .order("created_at", { ascending: false });
          
        if (!error && data) {
          let finalData = data;
          const patientIds = [...new Set(finalData.map(p => p.patient_id).filter(Boolean))];
          if (patientIds.length > 0) {
            const { data: pData } = await supabase.from('patients').select('user_id, full_name').in('user_id', patientIds);
            finalData = finalData.map(p => {
              const pat = pData?.find(x => x.user_id === p.patient_id);
              return { ...p, patient: { full_name: pat?.full_name || "Patient" } };
            });
          }
          setPrescriptions(finalData);
          setLoading(false);
          return;
        }
      }
      setPrescriptions([]);
    } catch (err) {
      console.error("Error loading prescriptions", err);
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  const handleDownload = async (id: string) => {
    try {
      const response = await api.get(`/api/v1/prescriptions/${id}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `prescription-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      toast.success("Download started");
    } catch (err: any) {
      console.error("Download error", err);
      toast.error(err?.response?.data?.detail || "Failed to download prescription");
    }
  };

  return (
    <div className="relative space-y-8 pb-12 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
            Prescriptions
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md leading-relaxed">
            Manage prescriptions issued to your patients.
          </p>
        </div>
        
        <Button asChild className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white">
          <Link href="/doctor/prescriptions/new">
            <Plus className="mr-2 h-4 w-4" /> Create Prescription
          </Link>
        </Button>
      </motion.div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-60 w-full rounded-2xl" />)}
        </div>
      ) : prescriptions.length === 0 ? (
        <Card className="rounded-2xl border border-dashed bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <Pill className="h-12 w-12 text-emerald-500/50 mb-4" />
            <p className="text-lg font-medium">No prescriptions issued</p>
            <p className="text-sm text-muted-foreground mt-1">You haven&apos;t created any prescriptions yet.</p>
            <Button variant="outline" className="mt-4" asChild>
               <Link href="/doctor/prescriptions/new">Create First Prescription</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {prescriptions.map(prescription => (
            <Card key={prescription.id} className="group overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                      <Pill className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-1.5"><User className="w-4 h-4 text-muted-foreground" /> {prescription.patient?.full_name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(prescription.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  {prescription.is_dispensed ? (
                    <Badge variant="outline" className="bg-muted text-muted-foreground">Dispensed</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col">
                <div className="mb-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Diagnosis</p>
                  <p className="text-sm font-medium">{prescription.diagnosis || 'Not specified'}</p>
                </div>
                
                <div className="mb-6 flex-1">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Medicines</p>
                  <div className="space-y-3">
                    {prescription.prescription_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center text-sm p-2 bg-muted/30 rounded-lg border border-border/50">
                        <div>
                          <p className="font-medium text-emerald-700 dark:text-emerald-400">{item.medicine_name}</p>
                          <p className="text-xs text-muted-foreground">{item.dosage} - {item.frequency}</p>
                        </div>
                        <span className="text-xs font-medium bg-background px-2.5 py-1 rounded-md shadow-sm border">{item.duration_days} days</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-auto pt-4 border-t border-border/50">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDownload(prescription.id)}>
                    <Download className="mr-2 h-4 w-4" /> PDF & Print
                  </Button>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="secondary" size="sm" className="shrink-0 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-transparent">
                        <QrCode className="h-4 w-4 mr-2" /> Share QR
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md p-4">
                      <DialogHeader className="sr-only">
                        <DialogTitle>Prescription QR</DialogTitle>
                      </DialogHeader>
                      <PrescriptionQR 
                        prescriptionId={prescription.id} 
                        patientId={prescription.patient_id} 
                        doctorId={prescription.doctor_id} 
                        qrToken={prescription.qr_token}
                        hash={prescription.hash}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
