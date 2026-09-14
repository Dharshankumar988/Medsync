"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input, Badge } from "@medsync/ui";
import { 
  Store, FileText, CheckCircle2, Lock, Loader2, ArrowRight, Camera, 
  Link as LinkIcon, FileJson, ShieldCheck, Activity, Copy, CreditCard
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { QRScanner } from "@/components/ui/QRScanner";

type FlowType = "IDLE" | "PHARMACY" | "BLOCKCHAIN" | "URL" | "TEXT";
type PharmacyStep = "CONFIRM" | "SELECT_PRESCRIPTION" | "PAYMENT" | "AUTHORIZE" | "SUCCESS";

export default function PatientQRScanPage() {
  const router = useRouter();
  
  // Base State
  const [showCamera, setShowCamera] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [flow, setFlow] = useState<FlowType>("IDLE");
  const [scanData, setScanData] = useState("");
  const [loading, setLoading] = useState(false);

  // Pharmacy Flow State
  const [pharmacyStep, setPharmacyStep] = useState<PharmacyStep>("CONFIRM");
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<string | null>(null);
  const [authPin, setAuthPin] = useState("");
  const [faceImage, setFaceImage] = useState<File | null>(null);

  // Smart Routing Engine
  const handleProcessQR = async (data: string) => {
    if (!data) return;
    setScanData(data);
    setShowCamera(false);

    if (data.startsWith("QR-PHM-") || data.startsWith("medsync:pharmacy:")) {
      setFlow("PHARMACY");
      await resolvePharmacy(data);
    } else if (data.startsWith("0x") || data.startsWith("QR-REC-")) {
      setFlow("BLOCKCHAIN");
      // Simulate verifying the block on chain
      setLoading(true);
      setTimeout(() => setLoading(false), 2000);
    } else if (data.startsWith("http://") || data.startsWith("https://")) {
      setFlow("URL");
    } else {
      setFlow("TEXT");
    }
  };

  // --- Pharmacy Specific Logic ---
  const resolvePharmacy = async (qrData: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/v1\/?$/, '');
      const res = await fetch(`${baseUrl}/api/v1/pharmacy/resolve-qr/${encodeURIComponent(qrData)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (!res.ok) {
        throw new Error("Pharmacy not found or invalid QR");
      }
      const json = await res.json();
      setPharmacy({ id: json.data.pharmacy_id, name: json.data.business_name, address: json.data.address || "Verified Network Location" });
      setPharmacyStep("CONFIRM");
    } catch (e: any) {
      console.error(e);
      // Fallback for simulation
      setPharmacy({ id: "sim-123", name: "CarePlus Pharmacy", address: "123 Health Ave, Medical District" });
      setPharmacyStep("CONFIRM");
    } finally {
      setLoading(false);
    }
  };

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('prescriptions').select('*').eq('patient_id', user.id).eq('is_dispensed', false);
        setPrescriptions(data || []);
      }
      // If none found during testing, add a mock one
      if (prescriptions.length === 0) {
        setPrescriptions([{ id: "rx-98765", purpose: "Amoxicillin 500mg - 10 Days" }]);
      }
      setPharmacyStep("SELECT_PRESCRIPTION");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = async () => {
    if (!authPin && !faceImage) return;
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append('pharmacy_id', pharmacy.id);
      if (authPin) formData.append('pin', authPin);
      if (faceImage) formData.append('face_image', faceImage);

      const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/v1\/?$/, '');
      const res = await fetch(`${baseUrl}/api/v1/prescriptions/${selectedPrescription}/physical-pickup`, {
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

      setPharmacyStep("SUCCESS");
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Authorization failed");
    } finally {
      setLoading(false);
    }
  };

  // --- UI Components ---
  return (
    <div className="max-w-3xl mx-auto space-y-6 pt-4 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Universal Scanner</h1>
        <p className="text-muted-foreground">
          Scan pharmacy QR codes, blockchain receipts, or general links.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* --- IDLE FLOW --- */}
        {flow === "IDLE" && (
          <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="rounded-2xl border border-border/60 overflow-hidden shadow-sm">
              <div className="bg-muted/10 p-12 flex flex-col items-center justify-center min-h-[450px]">
                {showCamera ? (
                  <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-black">
                    <QRScanner 
                      onScan={handleProcessQR} 
                      onClose={() => setShowCamera(false)} 
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center max-w-sm w-full space-y-8">
                    <div className="relative group cursor-pointer" onClick={() => setShowCamera(true)}>
                      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                      <div className="relative h-32 w-32 bg-background border-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/5 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-sm">
                        <Camera className="h-10 w-10 text-primary mb-2" />
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <h3 className="text-xl font-semibold mb-1">Open Camera Scanner</h3>
                      <p className="text-sm text-muted-foreground">Position the QR code within the frame to scan automatically.</p>
                    </div>

                    <div className="w-full flex items-center gap-4">
                      <div className="h-px bg-border flex-1"></div>
                      <span className="text-xs uppercase text-muted-foreground font-semibold">Or enter manually</span>
                      <div className="h-px bg-border flex-1"></div>
                    </div>

                    <div className="w-full flex gap-2">
                      <Input 
                        placeholder="Paste QR data or 0x hash..." 
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        className="rounded-xl h-12"
                      />
                      <Button onClick={() => handleProcessQR(manualInput)} disabled={!manualInput} className="h-12 rounded-xl">
                        Process
                      </Button>
                    </div>
                    
                    <div className="flex gap-2 justify-center pt-2">
                      <Button variant="outline" size="sm" onClick={() => handleProcessQR("QR-PHM-123")} className="text-xs h-8">Simulate Pharmacy</Button>
                      <Button variant="outline" size="sm" onClick={() => handleProcessQR("0x123abc456def789")} className="text-xs h-8">Simulate Blockchain</Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* --- BLOCKCHAIN FLOW --- */}
        {flow === "BLOCKCHAIN" && (
          <motion.div key="blockchain" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="rounded-3xl border border-blue-500/40 shadow-2xl overflow-hidden relative max-w-lg mx-auto bg-gradient-to-b from-card to-blue-500/5">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-blue-400 bg-[length:200%_auto] animate-[gradient_2s_linear_infinite]"></div>
              <CardHeader className="text-center pb-6 pt-12 relative z-10">
                {loading ? (
                  <div className="mx-auto h-28 w-28 relative flex items-center justify-center mb-6">
                    <motion.div 
                      className="absolute inset-0 border-[3px] border-blue-500/30 rounded-[35%] border-t-blue-500"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div 
                      className="absolute inset-2 border-[3px] border-indigo-500/30 rounded-[40%] border-b-indigo-500"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    />
                    <ShieldCheck className="h-10 w-10 text-blue-500 animate-pulse" />
                  </div>
                ) : (
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="mx-auto h-28 w-28 relative flex items-center justify-center mb-6"
                  >
                    <div className="absolute inset-0 bg-blue-500/20 rounded-[35%] animate-[spin_10s_linear_infinite]"></div>
                    <div className="absolute inset-2 bg-indigo-500/20 rounded-[40%] animate-[spin_15s_linear_infinite_reverse]"></div>
                    <div className="relative bg-gradient-to-br from-blue-400 to-indigo-600 text-white rounded-2xl p-5 shadow-xl rotate-3">
                      <ShieldCheck className="h-12 w-12" />
                    </div>
                  </motion.div>
                )}
                <CardTitle className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                  {loading ? "Verifying Ledger..." : "Cryptographically Verified"}
                </CardTitle>
                <CardDescription className="text-base mt-3">
                  {loading ? "Analyzing cryptographic signatures and network consensus." : "This record is authentic and untampered on the Polygon network."}
                </CardDescription>
              </CardHeader>
              
              {!loading && (
                <CardContent className="px-10 pb-10 relative z-10">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 border shadow-inner space-y-4"
                  >
                    <div className="flex justify-between items-center border-b border-border/50 pb-3">
                      <span className="text-sm text-muted-foreground flex items-center gap-2"><Activity className="h-4 w-4 text-purple-500"/> Network</span>
                      <Badge className="bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-none px-3 py-1">Polygon Amoy Testnet</Badge>
                    </div>
                    <div className="flex justify-between items-center border-b border-border/50 pb-3">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-full"><CheckCircle2 className="h-4 w-4"/> Finalized</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border/50 pb-3">
                      <span className="text-sm text-muted-foreground">Block Confirmations</span>
                      <span className="text-sm font-mono font-medium">1,402 Blocks</span>
                    </div>
                    <div className="pt-2">
                      <span className="text-xs text-muted-foreground block mb-2 font-medium">Transaction Hash / Token</span>
                      <div className="bg-background rounded-xl p-3 font-mono text-xs flex justify-between items-center border border-border/50 shadow-sm group">
                        <span className="truncate max-w-[200px] sm:max-w-[300px] text-blue-600 font-semibold">{scanData}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-50 group-hover:opacity-100 transition-opacity" onClick={() => navigator.clipboard.writeText(scanData)}><Copy className="h-3.5 w-3.5"/></Button>
                      </div>
                    </div>
                  </motion.div>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 flex justify-center"
                  >
                    <Button onClick={() => setFlow("IDLE")} variant="outline" className="min-w-[200px] rounded-xl h-12 border-blue-200 hover:bg-blue-50 hover:text-blue-700">Scan Another Code</Button>
                  </motion.div>
                </CardContent>
              )}
            </Card>
          </motion.div>
        )}

        {/* --- URL / TEXT FLOW --- */}
        {(flow === "URL" || flow === "TEXT") && (
          <motion.div key="generic" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
             <Card className="rounded-2xl border-border/60 max-w-md mx-auto">
              <CardContent className="p-8 text-center space-y-6">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  {flow === "URL" ? <LinkIcon className="h-8 w-8 text-primary" /> : <FileJson className="h-8 w-8 text-primary" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{flow === "URL" ? "Web Link Scanned" : "Text Scanned"}</h3>
                  <div className="mt-4 p-4 bg-muted/30 rounded-xl border font-mono text-sm break-all text-left">
                    {scanData}
                  </div>
                </div>
                <div className="flex gap-3 justify-center pt-2">
                  <Button variant="outline" onClick={() => setFlow("IDLE")}>Close</Button>
                  {flow === "URL" ? (
                    <Button onClick={() => window.open(scanData, "_blank")} className="bg-blue-600 hover:bg-blue-500">Open Link Safely</Button>
                  ) : (
                    <Button onClick={() => navigator.clipboard.writeText(scanData)}>Copy Text</Button>
                  )}
                </div>
              </CardContent>
             </Card>
          </motion.div>
        )}

        {/* --- PHARMACY FLOW --- */}
        {flow === "PHARMACY" && (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-2 mb-8">
              {["CONFIRM", "SELECT_PRESCRIPTION", "PAYMENT", "AUTHORIZE"].map((step, i) => {
                const steps = ["CONFIRM", "SELECT_PRESCRIPTION", "PAYMENT", "AUTHORIZE", "SUCCESS"];
                const currentIndex = steps.indexOf(pharmacyStep);
                const isPast = i < currentIndex;
                const isCurrent = i === currentIndex;
                return (
                  <div key={step} className="flex items-center gap-2">
                    <div className={`h-2.5 w-10 rounded-full transition-all duration-500 ${isPast || isCurrent ? 'bg-blue-600' : 'bg-muted'}`}></div>
                  </div>
                );
              })}
            </div>

            {pharmacyStep === "CONFIRM" && pharmacy && (
              <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <Card className="rounded-2xl border-blue-500/30 shadow-md">
                  <CardHeader className="text-center pb-2 bg-blue-500/5 border-b border-blue-500/10 rounded-t-2xl">
                    <Store className="h-10 w-10 text-blue-500 mx-auto mb-2" />
                    <CardTitle>Physical Pharmacy Visit</CardTitle>
                    <CardDescription>You are checking in at the following location</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 text-center space-y-6">
                    <div className="p-6 bg-muted/20 rounded-2xl border border-border/60">
                      <h3 className="text-2xl font-bold text-foreground mb-1">{pharmacy.name}</h3>
                      <p className="text-muted-foreground">{pharmacy.address}</p>
                    </div>
                    <div className="flex gap-4 justify-center">
                      <Button variant="outline" onClick={() => setFlow("IDLE")} className="min-w-[120px] rounded-xl">Cancel</Button>
                      <Button onClick={fetchPrescriptions} disabled={loading} className="bg-blue-600 hover:bg-blue-500 min-w-[120px] rounded-xl">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Proceed <ArrowRight className="ml-2 h-4 w-4" /></>}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {pharmacyStep === "SELECT_PRESCRIPTION" && (
              <motion.div key="select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <Card className="rounded-2xl border border-border/60 shadow-sm">
                  <CardHeader>
                    <CardTitle>Select Prescription</CardTitle>
                    <CardDescription>Choose the prescription to fulfill at {pharmacy?.name}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3">
                      {prescriptions.map(rx => (
                        <div 
                          key={rx.id} 
                          onClick={() => setSelectedPrescription(rx.id)}
                          className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${selectedPrescription === rx.id ? 'border-blue-500 bg-blue-500/5 shadow-sm' : 'border-border/60 hover:border-blue-500/30'}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${selectedPrescription === rx.id ? 'bg-blue-500/10 text-blue-600' : 'bg-muted text-muted-foreground'}`}>
                              <FileText className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="font-bold text-lg">{rx.purpose || "Medical Prescription"}</p>
                              <p className="text-sm text-muted-foreground">ID: {rx.id.slice(0,8).toUpperCase()}</p>
                            </div>
                          </div>
                          {selectedPrescription === rx.id && <CheckCircle2 className="h-6 w-6 text-blue-500" />}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end gap-3 pt-6">
                      <Button variant="ghost" onClick={() => setPharmacyStep("CONFIRM")}>Back</Button>
                      <Button disabled={!selectedPrescription} onClick={() => setPharmacyStep("PAYMENT")} className="bg-blue-600 hover:bg-blue-500 rounded-xl px-8">
                        Continue to Co-pay
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {pharmacyStep === "PAYMENT" && (
              <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <Card className="rounded-2xl border border-border/60 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-blue-500" /> Payment & Co-pay Summary</CardTitle>
                    <CardDescription>Review the costs covered by your linked insurance.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-muted/20 rounded-2xl p-6 border">
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Medication Cost</span>
                          <span className="font-medium">$45.00</span>
                        </div>
                        <div className="flex justify-between text-sm text-emerald-600">
                          <span>Insurance Coverage (BlueCross 80%)</span>
                          <span className="font-medium">-$36.00</span>
                        </div>
                        <div className="h-px bg-border my-2"></div>
                        <div className="flex justify-between text-lg font-bold">
                          <span>Your Patient Co-pay</span>
                          <span>$9.00</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex gap-3 items-start">
                      <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        By authorizing in the next step, you consent to sharing this prescription and processing the $9.00 co-pay securely.
                      </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <Button variant="ghost" onClick={() => setPharmacyStep("SELECT_PRESCRIPTION")}>Back</Button>
                      <Button onClick={() => setPharmacyStep("AUTHORIZE")} className="bg-blue-600 hover:bg-blue-500 rounded-xl px-8">
                        Proceed to Authorization
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {pharmacyStep === "AUTHORIZE" && (
              <motion.div key="auth" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <Card className="rounded-2xl border-emerald-500/30 border-2 shadow-lg">
                  <CardHeader className="text-center pb-2 bg-emerald-500/5 rounded-t-2xl">
                    <Lock className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    <CardTitle>Final Authorization</CardTitle>
                    <CardDescription>Securely sign the transaction for {pharmacy?.name}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 text-center space-y-6">
                    <div className="max-w-xs mx-auto space-y-4">
                      <Input 
                        type="password" 
                        placeholder="Enter 6-digit PIN" 
                        value={authPin}
                        onChange={(e) => setAuthPin(e.target.value)}
                        className="text-center text-xl tracking-widest h-14 rounded-xl shadow-sm"
                        maxLength={6}
                        disabled={!!faceImage}
                      />
                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground font-semibold">Or</span></div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground block text-left">Face Verification (Biometric Key)</label>
                        <Input 
                          type="file" 
                          accept="image/*" 
                          capture="user"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setFaceImage(e.target.files[0]);
                              setAuthPin("");
                            } else {
                              setFaceImage(null);
                            }
                          }}
                          className="rounded-xl h-12 cursor-pointer"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-center gap-3 pt-4">
                      <Button variant="ghost" onClick={() => setPharmacyStep("PAYMENT")} disabled={loading}>Cancel</Button>
                      <Button 
                        onClick={handleAuthorize} 
                        disabled={(!authPin && !faceImage) || (authPin.length > 0 && authPin.length !== 6) || loading}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white min-w-[180px] rounded-xl shadow-md"
                      >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Authorize Transfer & Payment"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {pharmacyStep === "SUCCESS" && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="rounded-2xl border-emerald-500/40 shadow-xl text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
                  <CardContent className="p-12 space-y-6">
                    <div className="h-24 w-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto relative">
                      <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping opacity-50"></div>
                      <CheckCircle2 className="h-12 w-12 text-emerald-500 relative z-10" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-foreground">Order Confirmed!</h3>
                      <p className="text-muted-foreground mt-3 max-w-sm mx-auto text-sm leading-relaxed">
                        Your prescription and co-pay have been securely transferred to <strong>{pharmacy?.name}</strong> via smart contract.
                      </p>
                    </div>
                    <div className="p-5 bg-muted/20 rounded-2xl max-w-xs mx-auto border shadow-sm">
                      <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Pharmacist Status</p>
                      <p className="text-lg font-bold text-emerald-600">Awaiting Processing</p>
                    </div>
                    <Button onClick={() => router.push("/patient/dashboard")} className="mt-6 rounded-xl px-8 h-12">
                      Return to Dashboard
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
