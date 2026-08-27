"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input } from "@medsync/ui";
import { Camera, Store, FileText, CheckCircle2, ChevronRight, Lock, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

export default function PatientQRScanPage() {
  const router = useRouter();
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [pharmacyId, setPharmacyId] = useState<string | null>(null);
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [step, setStep] = useState<"scan" | "confirm_pharmacy" | "select_prescription" | "authorize" | "success">("scan");
  
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<string | null>(null);
  const [authPin, setAuthPin] = useState("");
  const [loading, setLoading] = useState(false);

  // In a real app, you would use a library like react-qr-reader. 
  // For this implementation, we simulate the camera or allow manual input for testing if camera fails.
  const handleSimulateScan = () => {
    // We expect "medsync:pharmacy:{id}"
    // Assuming a test pharmacy id exists or we can just mock the ID format
    setScanResult("medsync:pharmacy:test-pharmacy-123");
  };

  useEffect(() => {
    if (scanResult && scanResult.startsWith("medsync:pharmacy:")) {
      const id = scanResult.split(":")[2];
      setPharmacyId(id);
      resolvePharmacy(id);
    }
  }, [scanResult]);

  const resolvePharmacy = async (id: string) => {
    setLoading(true);
    // In production, this would hit /api/v1/pharmacies/{id}
    try {
      // Mock lookup for demonstration if no DB record found
      let name = "MedSync Network Pharmacy";
      
      const { data, error } = await supabase.from('users').select('full_name, email').eq('id', id).single();
      if (data) {
        name = data.full_name || data.email || name;
      }
      
      setPharmacy({ id, name, address: "Verified Network Location" });
      setStep("confirm_pharmacy");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('prescriptions').select('*').eq('patient_id', user.id).eq('is_dispensed', false);
      setPrescriptions(data || []);
      setStep("select_prescription");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = async () => {
    if (!authPin) return;
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append('pharmacy_id', pharmacyId as string);
      formData.append('pin', authPin);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/prescriptions/${selectedPrescription}/physical-pickup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Authorization failed");
      }

      setStep("success");
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Authorization failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pt-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Physical Pharmacy Visit</h1>
        <p className="text-muted-foreground">
          Scan the pharmacy&apos;s official QR code to share your prescription securely.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {step === "scan" && (
          <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="rounded-2xl border border-border/60 overflow-hidden">
              <div className="bg-muted/30 p-16 flex flex-col items-center justify-center min-h-[400px]">
                <div className="relative w-64 h-64 border-4 border-blue-500/30 rounded-3xl flex items-center justify-center mb-6 overflow-hidden">
                  <div className="absolute inset-0 bg-blue-500/5 animate-pulse" />
                  <Camera className="h-12 w-12 text-blue-500/50" />
                  {/* Scanner line animation */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
                </div>
                <p className="font-medium mb-4">Point your camera at the pharmacy QR</p>
                <div className="flex gap-2 w-full max-w-sm">
                  <Input 
                    placeholder="Or paste QR data..." 
                    onChange={(e) => setScanResult(e.target.value)}
                  />
                  <Button onClick={handleSimulateScan} variant="outline">Simulate</Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {step === "confirm_pharmacy" && pharmacy && (
          <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="rounded-2xl border-blue-500/30 shadow-md">
              <CardHeader className="text-center pb-2 bg-blue-500/5 border-b border-blue-500/10">
                <Store className="h-10 w-10 text-blue-500 mx-auto mb-2" />
                <CardTitle>Confirm Pharmacy</CardTitle>
                <CardDescription>You scanned the following location</CardDescription>
              </CardHeader>
              <CardContent className="p-8 text-center space-y-6">
                <div className="p-6 bg-muted/20 rounded-2xl border border-border/60">
                  <h3 className="text-2xl font-bold text-foreground mb-1">{pharmacy.name}</h3>
                  <p className="text-muted-foreground">{pharmacy.address}</p>
                </div>
                
                <div className="flex gap-4 justify-center">
                  <Button variant="outline" onClick={() => setStep("scan")} className="min-w-[120px]">
                    Cancel
                  </Button>
                  <Button onClick={fetchPrescriptions} className="bg-blue-600 hover:bg-blue-500 min-w-[120px]">
                    Proceed <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "select_prescription" && (
          <motion.div key="select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="rounded-2xl border border-border/60">
              <CardHeader>
                <CardTitle>Select Prescription</CardTitle>
                <CardDescription>Choose the prescription to share with {pharmacy?.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {prescriptions.length === 0 ? (
                  <div className="text-center p-8 bg-muted/20 rounded-xl">
                    <p>No active prescriptions found.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {prescriptions.map(rx => (
                      <div 
                        key={rx.id} 
                        onClick={() => setSelectedPrescription(rx.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-colors flex items-center justify-between ${selectedPrescription === rx.id ? 'border-blue-500 bg-blue-500/5' : 'border-border/60 hover:border-blue-500/30'}`}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className={`h-5 w-5 ${selectedPrescription === rx.id ? 'text-blue-500' : 'text-muted-foreground'}`} />
                          <div>
                            <p className="font-semibold">{rx.purpose || "Prescription"}</p>
                            <p className="text-xs text-muted-foreground">ID: {rx.id.slice(0,8)}</p>
                          </div>
                        </div>
                        {selectedPrescription === rx.id && <CheckCircle2 className="h-5 w-5 text-blue-500" />}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
                  <Button variant="outline" onClick={() => setStep("confirm_pharmacy")}>Back</Button>
                  <Button 
                    disabled={!selectedPrescription} 
                    onClick={() => setStep("authorize")}
                    className="bg-blue-600 hover:bg-blue-500"
                  >
                    Next Step
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "authorize" && (
          <motion.div key="auth" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="rounded-2xl border-emerald-500/30 border-2">
              <CardHeader className="text-center pb-2 bg-emerald-500/5">
                <Lock className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <CardTitle>Authorization Required</CardTitle>
                <CardDescription>Enter PIN or use Face ID to authorize transfer to {pharmacy?.name}</CardDescription>
              </CardHeader>
              <CardContent className="p-8 text-center space-y-6">
                
                <div className="max-w-xs mx-auto space-y-4">
                  <Input 
                    type="password" 
                    placeholder="Enter 6-digit PIN" 
                    value={authPin}
                    onChange={(e) => setAuthPin(e.target.value)}
                    className="text-center text-xl tracking-widest h-12 rounded-xl"
                    maxLength={6}
                  />
                  <div className="text-xs text-muted-foreground">OR</div>
                  <Button variant="outline" className="w-full h-12 rounded-xl border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10">
                    Use Face ID
                  </Button>
                </div>
                
                <div className="flex justify-center gap-3 pt-4">
                  <Button variant="ghost" onClick={() => setStep("select_prescription")} disabled={loading}>Cancel</Button>
                  <Button 
                    onClick={handleAuthorize} 
                    disabled={!authPin || loading}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white min-w-[140px] rounded-xl"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Authorize & Send"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="rounded-2xl border-emerald-500/40 shadow-lg text-center">
              <CardContent className="p-12 space-y-6">
                <div className="h-20 w-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">Order Confirmed!</h3>
                  <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                    Your prescription has been securely shared with <strong>{pharmacy?.name}</strong>. The pharmacy is processing your physical pickup.
                  </p>
                </div>
                <div className="p-4 bg-muted/20 rounded-xl max-w-xs mx-auto">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Pickup Status</p>
                  <p className="text-lg font-bold text-foreground">Awaiting Processing</p>
                </div>
                <Button onClick={() => router.push("/patient/dashboard")} className="mt-4">
                  Return to Dashboard
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
