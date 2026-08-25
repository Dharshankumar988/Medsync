"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Skeleton, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@medsync/ui";
import { Pill, Download, CheckCircle2, AlertCircle, QrCode, ShoppingCart, Loader2, Store } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import Link from "next/link";
import { PrescriptionQR } from "@medsync/ui"; 
import { toast } from "sonner";
import axios from "axios";
import SecureDownloadModal from "@/components/patient/SecureDownloadModal";
import SecureOrderModal from "@/components/patient/SecureOrderModal";

export default function PrescriptionsPage() {
  const [userId, setUserId] = useState<string>("");
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(null);
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const loadPrescriptions = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("prescriptions")
        .select(`
          *,
          prescription_items(*)
        `)
        .eq("patient_id", userId)
        .order("created_at", { ascending: false });
        
      if (data) {
        const doctorIds = [...new Set(data.map(p => p.doctor_id))];
        const { data: docData } = await supabase
          .from("doctors")
          .select("*")
          .in("user_id", doctorIds);
          
        const docsMap = (docData || []).reduce((acc: any, doc: any) => {
          acc[doc.user_id] = doc;
          return acc;
        }, {});
        
        const mapped = data.map(p => ({
          ...p,
          doctor: docsMap[p.doctor_id]
        }));
        
        setPrescriptions(mapped);
      }
    } catch (err) {
      console.error("Error loading prescriptions", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  return (
    <div className="relative space-y-8 pb-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-widest uppercase text-blue-500 mb-2">My Health</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
            Prescriptions
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md leading-relaxed">
            Manage your medicines and active prescriptions.
          </p>
        </div>
        
        <Button asChild className="shrink-0">
          <Link href="/patient/qr">
            <QrCode className="mr-2 h-4 w-4" /> View My QR
          </Link>
        </Button>
      </motion.div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}
        </div>
      ) : prescriptions.length === 0 ? (
        <Card className="rounded-2xl border border-dashed bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Pill className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No prescriptions found</p>
            <p className="text-sm text-muted-foreground">You do not have any active or past prescriptions.</p>
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
                      <CardTitle className="text-base">Dr. {prescription.doctor?.full_name || 'Unknown'}</CardTitle>
                      <p className="text-xs text-muted-foreground">{new Date(prescription.created_at).toLocaleDateString()}</p>
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
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <div>
                          <p className="font-medium">{item.medicine_name}</p>
                          <p className="text-xs text-muted-foreground">{item.dosage} - {item.frequency}</p>
                        </div>
                        <span className="text-xs bg-muted px-2 py-1 rounded-md">{item.duration_days} days</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-auto pt-4 border-t border-border/50">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1" 
                    onClick={() => {
                      setSelectedPrescriptionId(prescription.id);
                      setDownloadDialogOpen(true);
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" /> Download PDF
                  </Button>
                  
                  {!prescription.is_dispensed && (
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedPrescriptionId(prescription.id);
                        setOrderDialogOpen(true);
                      }}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" /> Order Online
                    </Button>
                  )}
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="secondary" size="sm" className="shrink-0">
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm text-center">
                      <DialogHeader>
                        <DialogTitle className="text-center">Prescription QR</DialogTitle>
                      </DialogHeader>
                      <div className="py-6 flex justify-center">
                        <div className="p-4 bg-white rounded-xl shadow-inner border">
                          <PrescriptionQR 
                            prescriptionId={prescription.id} 
                            patientId={prescription.patient_id} 
                            doctorId={prescription.doctor_id} 
                            qrToken={prescription.qr_token}
                            hash={prescription.hash}
                          />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        Show this QR code at any MedSync network pharmacy.
                      </p>
                      
                      <div className="mt-4 pt-4 border-t border-dashed">
                          <p className="text-xs font-semibold text-muted-foreground mb-2 text-left">SECURE TOKEN</p>
                          <div className="bg-muted p-2 rounded-md font-mono text-xs break-all text-left select-all">
                              {prescription.hash || "Token generation pending..."}
                          </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <SecureDownloadModal 
        prescriptionId={selectedPrescriptionId}
        open={downloadDialogOpen}
        onOpenChange={setDownloadDialogOpen}
      />
      
      <SecureOrderModal
        prescriptionId={selectedPrescriptionId}
        open={orderDialogOpen}
        onOpenChange={setOrderDialogOpen}
        onOrderSuccess={loadPrescriptions}
      />
    </div>
  );
}

