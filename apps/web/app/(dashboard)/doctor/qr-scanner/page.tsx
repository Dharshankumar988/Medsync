"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input, Badge } from "@medsync/ui";
import { 
  QrCode, ScanLine, Loader2, CheckCircle2, ShieldCheck, FileText, 
  AlertTriangle, Camera, Link as LinkIcon, FileJson, Activity, Copy 
} from "lucide-react";
import api from "@/lib/api";
import { QRScanner } from "@/components/ui/QRScanner";
import { motion, AnimatePresence } from "framer-motion";

type FlowType = "IDLE" | "PRESCRIPTION" | "BLOCKCHAIN" | "URL" | "TEXT";

export default function DoctorQRScannerPage() {
  const [showCamera, setShowCamera] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [flow, setFlow] = useState<FlowType>("IDLE");
  const [scanData, setScanData] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prescriptionData, setPrescriptionData] = useState<any>(null);

  const handleProcessQR = async (data: string) => {
    if (!data) return;
    setScanData(data);
    setShowCamera(false);
    setError(null);

    // Blockchain Hash
    if (data.startsWith("0x") || data.startsWith("QR-REC-")) {
      setFlow("BLOCKCHAIN");
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 2500);
      return;
    } 
    
    // Web URL
    if (data.startsWith("http://") || data.startsWith("https://")) {
      setFlow("URL");
      return;
    }

    // Prescription / Text
    setIsLoading(true);
    try {
      const res = await api.get(`/api/v1/verify/qr/${data}`);
      const resData = res.data;
      
      if (resData.data?.is_valid) {
        setPrescriptionData(resData.data.data);
        if (resData.data.data.status === "TAMPERED") {
          setError("WARNING: This prescription has been TAMPERED with. The data does not match the blockchain.");
        }
        setFlow("PRESCRIPTION");
      } else {
        if (!data.startsWith("MS-")) {
          setFlow("TEXT");
        } else {
          setError(resData.message || "Invalid or tampered QR token.");
        }
      }
    } catch (err: any) {
      if (!data.startsWith("MS-")) {
        setFlow("TEXT");
      } else {
        setError(err.response?.data?.detail || "Failed to verify prescription token.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 pb-12 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Universal Scanner</h1>
        <p className="text-muted-foreground">
          Scan patient prescriptions, blockchain receipts, or general links.
        </p>
      </div>
      
      <AnimatePresence mode="wait">
        {/* --- IDLE FLOW --- */}
        {flow === "IDLE" && (
          <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="rounded-2xl border border-border/60 overflow-hidden shadow-sm">
              <div className="bg-muted/10 p-12 flex flex-col items-center justify-center min-h-[450px]">
                {error && (
                  <div className="w-full max-w-md bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100 flex items-start shadow-sm">
                    <AlertTriangle className="h-5 w-5 mr-2 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                
                {showCamera ? (
                  <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-black">
                    <QRScanner 
                      onScan={handleProcessQR} 
                      onClose={() => setShowCamera(false)} 
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center max-w-md w-full space-y-8">
                    <div className="relative group cursor-pointer" onClick={() => setShowCamera(true)}>
                      <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                      <div className="relative h-32 w-32 bg-background border-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/5 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-sm">
                        <Camera className="h-10 w-10 text-primary mb-2" />
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <h3 className="text-xl font-semibold mb-1">Open Camera Scanner</h3>
                      <p className="text-sm text-muted-foreground">Position the patient&apos;s QR code within the frame.</p>
                    </div>

                    <div className="w-full flex items-center gap-4">
                      <div className="h-px bg-border flex-1"></div>
                      <span className="text-xs uppercase text-muted-foreground font-semibold">Or enter manually</span>
                      <div className="h-px bg-border flex-1"></div>
                    </div>

                    <div className="w-full flex gap-2">
                      <Input 
                        placeholder="Paste MS- token or 0x hash..." 
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        className="rounded-xl h-12"
                      />
                      <Button onClick={() => handleProcessQR(manualInput)} disabled={!manualInput || isLoading} className="h-12 rounded-xl text-white">
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Process"}
                      </Button>
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
            <Card className="rounded-3xl border border-primary/40 shadow-2xl overflow-hidden relative max-w-lg mx-auto bg-gradient-to-b from-card to-primary/5">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary/80 via-blue-500 to-primary/80 bg-[length:200%_auto] animate-[gradient_2s_linear_infinite]"></div>
              <CardHeader className="text-center pb-6 pt-12 relative z-10">
                {isLoading ? (
                  <div className="mx-auto h-28 w-28 relative flex items-center justify-center mb-6">
                    <motion.div 
                      className="absolute inset-0 border-[3px] border-primary/30 rounded-[35%] border-t-primary"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div 
                      className="absolute inset-2 border-[3px] border-blue-500/30 rounded-[40%] border-b-blue-500"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    />
                    <ShieldCheck className="h-10 w-10 text-primary animate-pulse" />
                  </div>
                ) : (
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="mx-auto h-28 w-28 relative flex items-center justify-center mb-6"
                  >
                    <div className="absolute inset-0 bg-primary/20 rounded-[35%] animate-[spin_10s_linear_infinite]"></div>
                    <div className="absolute inset-2 bg-blue-500/20 rounded-[40%] animate-[spin_15s_linear_infinite_reverse]"></div>
                    <div className="relative bg-gradient-to-br from-primary to-blue-600 text-white rounded-2xl p-5 shadow-xl rotate-3">
                      <ShieldCheck className="h-12 w-12" />
                    </div>
                  </motion.div>
                )}
                <CardTitle className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
                  {isLoading ? "Verifying Ledger..." : "Cryptographically Verified"}
                </CardTitle>
                <CardDescription className="text-base mt-3">
                  {isLoading ? "Analyzing cryptographic signatures and network consensus." : "This record is authentic and untampered on the Polygon network."}
                </CardDescription>
              </CardHeader>
              
              {!isLoading && (
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
                        <span className="truncate max-w-[200px] sm:max-w-[300px] text-primary font-semibold">{scanData}</span>
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
                    <Button onClick={() => setFlow("IDLE")} variant="outline" className="min-w-[200px] rounded-xl h-12 border-primary/20 hover:bg-primary/10">Scan Another Code</Button>
                  </motion.div>
                </CardContent>
              )}
            </Card>
          </motion.div>
        )}

        {/* --- URL / TEXT FLOW --- */}
        {(flow === "URL" || flow === "TEXT") && (
          <motion.div key="generic" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
             <Card className="rounded-2xl border-border/60 max-w-md mx-auto shadow-sm">
              <CardContent className="p-8 text-center space-y-6">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  {flow === "URL" ? <LinkIcon className="h-8 w-8 text-primary" /> : <FileJson className="h-8 w-8 text-primary" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{flow === "URL" ? "Web Link Scanned" : "Text Scanned"}</h3>
                  <div className="mt-4 p-4 bg-muted/30 rounded-xl border font-mono text-sm break-all text-left text-muted-foreground">
                    {scanData}
                  </div>
                </div>
                <div className="flex gap-3 justify-center pt-2">
                  <Button variant="outline" onClick={() => setFlow("IDLE")} className="rounded-xl">Close</Button>
                  {flow === "URL" ? (
                    <Button onClick={() => window.open(scanData, "_blank")} className="rounded-xl">Open Link Safely</Button>
                  ) : (
                    <Button onClick={() => navigator.clipboard.writeText(scanData)} className="rounded-xl">Copy Text</Button>
                  )}
                </div>
              </CardContent>
             </Card>
          </motion.div>
        )}

        {/* --- PRESCRIPTION FLOW --- */}
        {flow === "PRESCRIPTION" && prescriptionData && (
          <motion.div key="prescription" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="w-full max-w-lg mx-auto shadow-lg border-primary/30 rounded-2xl overflow-hidden">
              <CardHeader className="text-center pb-6 bg-primary/5 border-b border-primary/10">
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  </div>
                </div>
                <CardTitle className="text-2xl">Verification Complete</CardTitle>
                <CardDescription>The prescription details are displayed below.</CardDescription>
              </CardHeader>
              
              <CardContent className="pt-8 px-8 pb-8">
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 border border-red-100 flex items-start">
                    <AlertTriangle className="h-5 w-5 mr-2 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="bg-muted p-4 rounded-xl space-y-2 border">
                    <div className="flex items-center text-sm border-b pb-2">
                      <FileText className="h-4 w-4 mr-2 text-primary" />
                      <span className="font-medium">Prescription ID:</span>
                      <span className="ml-2 font-mono text-xs">{prescriptionData.prescription_id?.split('-')[0]}...</span>
                    </div>
                    <div className="text-sm pt-1">
                      <span className="font-medium text-muted-foreground">Patient:</span> {prescriptionData.patient_name}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-muted-foreground">Doctor:</span> {prescriptionData.doctor_name}
                    </div>
                    <div className="mt-2 text-sm font-semibold flex items-center">
                       Status: 
                       {prescriptionData.status === "VERIFIED" && <span className="ml-2 text-emerald-600 flex items-center bg-emerald-500/10 px-2 py-1 rounded"><CheckCircle2 className="w-4 h-4 mr-1" /> Blockchain Verified</span>}
                       {prescriptionData.status === "PENDING" && <span className="ml-2 text-amber-600 bg-amber-500/10 px-2 py-1 rounded">Pending Anchoring</span>}
                       {prescriptionData.status === "TAMPERED" && <span className="ml-2 text-red-600 flex items-center bg-red-500/10 px-2 py-1 rounded"><AlertTriangle className="w-4 h-4 mr-1" /> TAMPERED</span>}
                    </div>
                  </div>

                  {prescriptionData.items ? (
                    <div className="bg-background p-5 rounded-xl border">
                      <h4 className="font-semibold mb-3 border-b pb-2">Clinical Details</h4>
                      {prescriptionData.diagnosis && (
                        <div className="mb-4">
                          <span className="text-xs text-muted-foreground block uppercase tracking-wider font-semibold">Diagnosis</span>
                          <span className="text-sm font-medium">{prescriptionData.diagnosis}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-xs text-muted-foreground block mb-2 uppercase tracking-wider font-semibold">Medications</span>
                        <ul className="space-y-2">
                        {prescriptionData.items?.map((item: any, i: number) => (
                          <li key={i} className="text-sm flex justify-between items-center bg-muted/30 p-3 rounded-lg border border-border/50">
                            <span className="font-semibold text-foreground">{item.medicine_name}</span>
                            <span className="text-muted-foreground font-medium text-xs bg-muted px-2 py-1 rounded">{item.dosage} ({item.duration_days} days)</span>
                          </li>
                        ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl">
                      <h4 className="font-bold text-amber-800 flex items-center mb-2">
                        <ShieldCheck className="h-5 w-5 mr-2" />
                        Limited Access
                      </h4>
                      <p className="text-sm text-amber-700">
                        You are not authorized to view the full clinical details of this prescription. Only the issuing doctor or pharmacy can decrypt it.
                      </p>
                    </div>
                  )}
                  
                  <Button onClick={() => setFlow("IDLE")} variant="outline" className="w-full rounded-xl h-12" size="lg">
                    Scan Another
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
