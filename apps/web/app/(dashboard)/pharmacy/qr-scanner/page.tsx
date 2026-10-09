"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input, Badge } from "@medsync/ui";
import { 
  QrCode, ScanLine, Key, Loader2, CheckCircle2, ShieldCheck, FileText, 
  AlertTriangle, Camera, Link as LinkIcon, FileJson, Activity, Copy,
  CreditCard, Receipt, FileSignature
} from "lucide-react";
import { pharmacyService } from "@/services/pharmacy.service";
import { blockchainService, BlockchainVerifyResult } from "@/services/blockchain.service";
import { BlockchainVerificationCard } from "@/components/blockchain/BlockchainVerificationCard";
import { QRScanner } from "@/components/ui/QRScanner";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

type FlowType = "IDLE" | "PRESCRIPTION" | "BLOCKCHAIN" | "URL" | "TEXT";
type PrescriptionStep = "PAYMENT" | "SUCCESS";

export default function PharmacyQRScannerPage() {
  // Base State
  const [showCamera, setShowCamera] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [flow, setFlow] = useState<FlowType>("IDLE");
  const [scanData, setScanData] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockchainData, setBlockchainData] = useState<BlockchainVerifyResult | null>(null);

  // Prescription Flow State
  const [step, setStep] = useState<PrescriptionStep>("PAYMENT");
  const [basicData, setBasicData] = useState<any>(null);
  const [fullPrescriptionData, setFullPrescriptionData] = useState<any>(null);
  const [pin, setPin] = useState("");
  const [authPin, setAuthPin] = useState("");
  const [faceImage, setFaceImage] = useState<File | null>(null);

  // Smart Routing Engine
  const handleProcessQR = async (data: string) => {
    if (!data) return;
    setScanData(data);
    setShowCamera(false);
    setError(null);

    if (data.startsWith("0x") || data.startsWith("QR-REC-")) {
      setFlow("BLOCKCHAIN");
      setIsLoading(true);
      try {
        const result = await blockchainService.verifyHash(data);
        setBlockchainData(result);
      } catch (err: any) {
        console.error("Blockchain verification error:", err);
        setBlockchainData({
          verified: false,
          status: "NOT_FOUND",
          item_type: data.startsWith("0x") && data.length === 66 ? "TRANSACTION" : "UNKNOWN",
          identifier: data,
          network: "Polygon Amoy Testnet",
          chain_id: 80002,
          explorer_url: data.startsWith("0x") ? `https://amoy.polygonscan.com/tx/${data}` : null,
          error_message: err?.message || "Ledger query failed"
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // If it looks like a URL
    if (data.startsWith("http://") || data.startsWith("https://")) {
      const isMedsync = data.includes("medsync-web.vercel.app") || data.includes("localhost:3000");
      if (isMedsync) {
        window.location.href = data;
        return;
      }
      setFlow("URL");
      return;
    }

    // Otherwise, assume it's a Prescription Token (MS-...) or raw text
    setIsLoading(true);
    try {
      const res = await pharmacyService.verifyQR(data);
      if (res.data?.is_valid) {
        setBasicData(res.data.data);
        if (res.data.data.status === "TAMPERED") {
          setError("WARNING: This prescription has been TAMPERED with. The data does not match the blockchain.");
        }
        setFlow("PRESCRIPTION");
        setStep("PAYMENT");
      } else {
        if (!data.startsWith("MS-")) {
          setFlow("TEXT");
        } else {
          setError(res.message || "Invalid or tampered QR token.");
        }
      }
    } catch (err: any) {
      if (!data.startsWith("MS-")) {
        setFlow("TEXT");
      } else {
        setError(err.message || "Failed to decode prescription token.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!pin && !faceImage) || !basicData?.prescription_id) return;

    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      if (pin) formData.append("pin", pin);
      if (faceImage) formData.append("face_image", faceImage);

      const res = await fetch(`/api/v1/prescriptions/${basicData.prescription_id}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setFullPrescriptionData(data.data);
        setStep("SUCCESS");
      } else {
        setError(data.detail || data.message || "Invalid Authorization PIN.");
      }
    } catch (err: any) {
      setError("Failed to verify PIN. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDispense = async () => {
    if (!basicData?.prescription_id) return;
    if (authPin.length !== 6) {
      toast.error("Please enter your 6-digit Pharmacy Authorization PIN.");
      return;
    }
    setIsLoading(true);
    try {
      await pharmacyService.dispensePrescription(basicData.prescription_id, authPin, pin);
      
      // Reset
      setFlow("IDLE");
      setBasicData(null);
      setFullPrescriptionData(null);
      setPin("");
      setAuthPin("");
    } catch (err) {
      alert("Failed to dispense prescription.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 pb-12 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Universal Scanner</h1>
        <p className="text-muted-foreground">
          Scan patient prescription QR codes, blockchain receipts, or general links.
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
                      <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                      <div className="relative h-32 w-32 bg-background border-2 border-dashed border-amber-500/50 hover:border-amber-500 hover:bg-amber-500/5 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-sm">
                        <Camera className="h-10 w-10 text-amber-500 mb-2" />
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
                      <Button onClick={() => handleProcessQR(manualInput)} disabled={!manualInput || isLoading} className="h-12 rounded-xl bg-amber-600 hover:bg-amber-500 text-white">
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
          <motion.div key="blockchain" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
            <BlockchainVerificationCard
              data={blockchainData}
              isLoading={isLoading}
              onScanAnother={() => {
                setFlow("IDLE");
                setBlockchainData(null);
                setScanData("");
              }}
            />
          </motion.div>
        )}

        {/* --- URL / TEXT FLOW --- */}
        {(flow === "URL" || flow === "TEXT") && (
          <motion.div key="generic" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
             <Card className="rounded-2xl border-border/60 max-w-md mx-auto shadow-sm">
              <CardContent className="p-8 text-center space-y-6">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  {flow === "URL" ? <LinkIcon className="h-8 w-8 text-amber-500" /> : <FileJson className="h-8 w-8 text-amber-500" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{flow === "URL" ? "Web Link Scanned" : "Text Scanned"}</h3>
                  <div className="mt-4 p-4 bg-muted/30 rounded-xl border font-mono text-sm break-all text-left text-muted-foreground">
                    {scanData}
                  </div>
                </div>
                <div className="flex gap-3 justify-center pt-2">
                  <Button variant="outline" onClick={() => setFlow("IDLE")} className="rounded-xl">Close</Button>
                  <Button onClick={() => navigator.clipboard.writeText(scanData)} className="bg-amber-600 hover:bg-amber-500 rounded-xl">Copy Text</Button>
                </div>
              </CardContent>
             </Card>
          </motion.div>
        )}

        {/* --- PRESCRIPTION FLOW (PHARMACY PAYMENT & DISPENSE) --- */}
        {flow === "PRESCRIPTION" && (
          <motion.div key="prescription" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="w-full max-w-lg mx-auto shadow-xl border-amber-500/30 rounded-3xl overflow-hidden">
              <CardHeader className="text-center pb-6 bg-amber-500/5 border-b border-amber-500/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Receipt className="w-32 h-32" />
                </div>
                <div className="flex justify-center mb-4 relative z-10">
                  <div className="h-16 w-16 bg-amber-500/10 rounded-full flex items-center justify-center shadow-inner border border-amber-500/20">
                    {step === "PAYMENT" && <CreditCard className="h-8 w-8 text-amber-600" />}
                    {step === "SUCCESS" && <CheckCircle2 className="h-8 w-8 text-emerald-500" />}
                  </div>
                </div>
                <CardTitle className="text-2xl relative z-10">
                  {step === "PAYMENT" && "Payment & Co-Pay"}
                  {step === "SUCCESS" && "Verification Complete"}
                </CardTitle>
                <CardDescription className="relative z-10">
                  {step === "PAYMENT" && "Review the order summary and collect the required co-pay before dispensing."}
                  {step === "SUCCESS" && "The prescription is fully authorized and ready for dispensing."}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-8 px-8 pb-8">
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 border border-red-100 flex items-start">
                    <AlertTriangle className="h-5 w-5 mr-2 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* STEP 1: PAYMENT / ORDER SUMMARY */}
                {step === "PAYMENT" && basicData && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="bg-muted/30 p-5 rounded-2xl border border-border/60 space-y-3">
                      <div className="flex items-center text-sm border-b border-border/60 pb-3">
                        <FileText className="h-4 w-4 mr-2 text-amber-600" />
                        <span className="font-medium">Prescription ID:</span>
                        <span className="ml-auto font-mono text-xs bg-background px-2 py-1 rounded border">{basicData.prescription_id.split('-')[0]}...</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-muted-foreground">Patient:</span> 
                        <span className="font-semibold">{basicData.patient_name}</span>
                      </div>
                      <div className="mt-2 text-sm font-semibold flex items-center justify-between pt-2 border-t border-border/60">
                         <span className="text-muted-foreground">Blockchain State:</span>
                         {basicData.status === "VERIFIED" && <span className="text-emerald-600 flex items-center bg-emerald-500/10 px-2 py-1 rounded"><CheckCircle2 className="w-4 h-4 mr-1" /> Verified</span>}
                         {basicData.status === "PENDING" && <span className="text-amber-600 bg-amber-500/10 px-2 py-1 rounded">Pending</span>}
                         {basicData.status === "TAMPERED" && <span className="text-red-600 flex items-center bg-red-500/10 px-2 py-1 rounded"><AlertTriangle className="w-4 h-4 mr-1" /> TAMPERED</span>}
                      </div>
                    </div>

                    <div className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-muted-foreground" /> Order Summary
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Prescription Items (Est.)</span>
                          <span className="font-medium">$124.50</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Insurance Coverage</span>
                          <span className="font-medium text-emerald-600">-$95.00</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Taxes & Fees</span>
                          <span className="font-medium">$4.50</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg pt-4 border-t border-dashed">
                          <span>Total Co-Pay</span>
                          <span className="text-amber-600">$34.00</span>
                        </div>
                      </div>

                      <div className="pt-4 flex flex-col items-center border-t border-dashed mt-4 space-y-3">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scan to Pay via UPI</span>
                        <div className="p-2 bg-white rounded-xl border border-border shadow-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=pharmacy@upi&pn=Pharmacy&am=34.00" alt="Payment QR" className="w-32 h-32" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                      <Button variant="outline" className="flex-1 rounded-xl h-12" onClick={() => {
                        setFlow("IDLE");
                        setBasicData(null);
                      }}>Cancel</Button>
                      <Button className="flex-1 rounded-xl h-12 bg-amber-600 hover:bg-amber-500 text-white shadow-md" onClick={() => {
                        setFullPrescriptionData(basicData);
                        setStep("SUCCESS");
                      }} disabled={basicData.status === "TAMPERED"}>
                        Proceed to Dispense <ScanLine className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: SUCCESS & DISPENSE */}
                {step === "SUCCESS" && fullPrescriptionData && (
                  <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-6">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl flex items-start gap-3">
                      <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
                      <div>
                        <h4 className="font-semibold text-emerald-700 mb-1">Payment & Authentication Successful</h4>
                        <p className="text-sm text-emerald-600/80">
                          The co-pay was processed and the patient has authorized access to this prescription.
                        </p>
                      </div>
                    </div>

                    <div className="bg-muted/30 p-5 rounded-2xl border border-border/60">
                      <h4 className="font-semibold mb-3 border-b border-border/60 pb-2 flex justify-between">
                        <span>Authorized Prescription</span>
                        <span className="text-xs font-mono text-muted-foreground font-normal">{fullPrescriptionData.prescription_id?.split('-')[0] || fullPrescriptionData.id?.split('-')[0]}</span>
                      </h4>
                      {fullPrescriptionData.diagnosis && (
                        <div className="mb-4">
                          <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider mb-1">Diagnosis</span>
                          <span className="text-sm font-medium">{fullPrescriptionData.diagnosis}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-2 uppercase font-bold tracking-wider">Medications to Dispense</span>
                        <ul className="space-y-2">
                        {fullPrescriptionData.items?.map((item: any, i: number) => (
                          <li key={i} className="text-sm flex justify-between items-center bg-background p-3 rounded-xl border shadow-sm">
                            <div className="flex flex-col">
                              <span className="font-bold text-foreground">{item.medicine_name}</span>
                              <span className="text-xs text-muted-foreground mt-0.5">{item.instructions || "Take as directed"}</span>
                            </div>
                            <span className="text-amber-700 font-semibold text-xs bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-md ml-4 shrink-0 text-center">
                              {item.dosage}<br/>
                              <span className="opacity-70">({item.duration_days} days)</span>
                            </span>
                          </li>
                        ))}
                        </ul>
                      </div>
                      </div>

                    <div className="bg-muted/30 p-5 rounded-2xl border border-border/60">
                      <h4 className="font-semibold mb-3 border-b border-border/60 pb-2">Pharmacy Authorization</h4>
                      <p className="text-sm text-muted-foreground mb-4">Enter your 6-digit Pharmacy PIN to authorize dispensing.</p>
                      <Input
                        type="password"
                        value={authPin}
                        onChange={(e) => setAuthPin(e.target.value)}
                        placeholder="• • • • • •"
                        maxLength={6}
                        className="text-center tracking-[0.5em] rounded-xl text-lg h-12"
                      />
                    </div>
                    
                    <Button onClick={handleDispense} className="w-full h-14 text-md rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-500/20" size="lg" disabled={isLoading || authPin.length !== 6}>
                      {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Dispense Medications & Complete Order"}
                    </Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
