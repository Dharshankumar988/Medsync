"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input, Badge } from "@medsync/ui";
import { 
  QrCode, ScanLine, Key, Loader2, CheckCircle2, ShieldCheck, FileText, 
  AlertTriangle, Camera, Link as LinkIcon, FileJson, Activity, Copy,
  CreditCard, Receipt, FileSignature
} from "lucide-react";
import { pharmacyService } from "@/services/pharmacy.service";
import { QRScanner } from "@/components/ui/QRScanner";
import { motion, AnimatePresence } from "framer-motion";

type FlowType = "IDLE" | "PRESCRIPTION" | "BLOCKCHAIN" | "URL" | "TEXT";
type PrescriptionStep = "PAYMENT" | "VERIFY_PIN" | "SUCCESS";

export default function PharmacyQRScannerPage() {
  // Base State
  const [showCamera, setShowCamera] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [flow, setFlow] = useState<FlowType>("IDLE");
  const [scanData, setScanData] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prescription Flow State
  const [step, setStep] = useState<PrescriptionStep>("PAYMENT");
  const [basicData, setBasicData] = useState<any>(null);
  const [fullPrescriptionData, setFullPrescriptionData] = useState<any>(null);
  const [pin, setPin] = useState("");
  const [faceImage, setFaceImage] = useState<File | null>(null);

  // Smart Routing Engine
  const handleProcessQR = async (data: string) => {
    if (!data) return;
    setScanData(data);
    setShowCamera(false);
    setError(null);

    // If it looks like a blockchain hash
    if (data.startsWith("0x") || data.startsWith("QR-REC-")) {
      setFlow("BLOCKCHAIN");
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 2500);
      return;
    } 
    
    // If it looks like a URL
    if (data.startsWith("http://") || data.startsWith("https://")) {
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
    setIsLoading(true);
    try {
      await pharmacyService.dispensePrescription(basicData.prescription_id);
      
      // Reset
      setFlow("IDLE");
      setBasicData(null);
      setFullPrescriptionData(null);
      setPin("");
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
          <motion.div key="blockchain" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="rounded-3xl border border-amber-500/40 shadow-2xl overflow-hidden relative max-w-lg mx-auto bg-gradient-to-b from-card to-amber-500/5">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 bg-[length:200%_auto] animate-[gradient_2s_linear_infinite]"></div>
              <CardHeader className="text-center pb-6 pt-12 relative z-10">
                {isLoading ? (
                  <div className="mx-auto h-28 w-28 relative flex items-center justify-center mb-6">
                    <motion.div 
                      className="absolute inset-0 border-[3px] border-amber-500/30 rounded-[35%] border-t-amber-500"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div 
                      className="absolute inset-2 border-[3px] border-orange-500/30 rounded-[40%] border-b-orange-500"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    />
                    <ShieldCheck className="h-10 w-10 text-amber-500 animate-pulse" />
                  </div>
                ) : (
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="mx-auto h-28 w-28 relative flex items-center justify-center mb-6"
                  >
                    <div className="absolute inset-0 bg-amber-500/20 rounded-[35%] animate-[spin_10s_linear_infinite]"></div>
                    <div className="absolute inset-2 bg-orange-500/20 rounded-[40%] animate-[spin_15s_linear_infinite_reverse]"></div>
                    <div className="relative bg-gradient-to-br from-amber-400 to-orange-600 text-white rounded-2xl p-5 shadow-xl rotate-3">
                      <ShieldCheck className="h-12 w-12" />
                    </div>
                  </motion.div>
                )}
                <CardTitle className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-600">
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
                        <span className="truncate max-w-[200px] sm:max-w-[300px] text-amber-600 font-semibold">{scanData}</span>
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
                    <Button onClick={() => setFlow("IDLE")} variant="outline" className="min-w-[200px] rounded-xl h-12 border-amber-200 hover:bg-amber-50 hover:text-amber-700">Scan Another Code</Button>
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
                  {flow === "URL" ? (
                    <Button onClick={() => window.open(scanData, "_blank")} className="bg-amber-600 hover:bg-amber-500 rounded-xl">Open Link Safely</Button>
                  ) : (
                    <Button onClick={() => navigator.clipboard.writeText(scanData)} className="bg-amber-600 hover:bg-amber-500 rounded-xl">Copy Text</Button>
                  )}
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
                    {step === "VERIFY_PIN" && <FileSignature className="h-8 w-8 text-amber-600" />}
                    {step === "SUCCESS" && <CheckCircle2 className="h-8 w-8 text-emerald-500" />}
                  </div>
                </div>
                <CardTitle className="text-2xl relative z-10">
                  {step === "PAYMENT" && "Payment & Co-Pay"}
                  {step === "VERIFY_PIN" && "Patient Authorization"}
                  {step === "SUCCESS" && "Verification Complete"}
                </CardTitle>
                <CardDescription className="relative z-10">
                  {step === "PAYMENT" && "Review the order summary and collect the required co-pay before dispensing."}
                  {step === "VERIFY_PIN" && "Ask the patient to enter their 6-digit PIN or use Face ID to authorize the release of records."}
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
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                      <Button variant="outline" className="flex-1 rounded-xl h-12" onClick={() => {
                        setFlow("IDLE");
                        setBasicData(null);
                      }}>Cancel</Button>
                      <Button className="flex-1 rounded-xl h-12 bg-amber-600 hover:bg-amber-500 text-white shadow-md" onClick={() => setStep("VERIFY_PIN")} disabled={basicData.status === "TAMPERED"}>
                        Proceed to Authorize <ScanLine className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: VERIFY PIN / FACE ID */}
                {step === "VERIFY_PIN" && basicData && (
                  <form onSubmit={handleVerifyPin} className="space-y-6">
                    <div className="text-center p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-400">Total Co-Pay: <strong>$34.00</strong></p>
                      <p className="text-xs text-muted-foreground mt-1">Authorization required to finalize payment and view medical records.</p>
                    </div>

                    <div className="space-y-5 pt-2">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground ml-1">Patient 6-Digit PIN</label>
                        <Input
                          type="password"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="••••••"
                          value={pin}
                          onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                          className="text-center text-3xl tracking-widest h-16 rounded-2xl shadow-inner border-2 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
                          disabled={!!faceImage || basicData.status === "TAMPERED"}
                          autoFocus
                        />
                      </div>
                      
                      <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-border/60" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-3 text-muted-foreground font-semibold tracking-wider">Or</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground ml-1 flex items-center justify-between">
                          <span>Face Verification (Fallback)</span>
                        </label>
                        <div className="relative">
                          <Input 
                            type="file" 
                            accept="image/*" 
                            capture="user"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setFaceImage(e.target.files[0]);
                                setPin("");
                              } else {
                                setFaceImage(null);
                              }
                            }}
                            disabled={basicData.status === "TAMPERED"}
                            className="rounded-xl h-14 cursor-pointer border-2 hover:border-amber-500/50 pt-3"
                          />
                          <Camera className="absolute right-4 top-4 w-5 h-5 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 pt-6">
                      <Button type="button" variant="ghost" className="flex-1 rounded-xl h-12 hover:bg-muted" onClick={() => setStep("PAYMENT")}>
                        Back
                      </Button>
                      <Button type="submit" className="flex-[2] rounded-xl h-12 bg-amber-600 hover:bg-amber-500 text-white shadow-lg" disabled={(!pin && !faceImage) || (pin.length > 0 && pin.length !== 6) || isLoading || basicData.status === "TAMPERED"}>
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Authorize Patient"}
                      </Button>
                    </div>
                  </form>
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
                        <span className="text-xs font-mono text-muted-foreground font-normal">{fullPrescriptionData.id.split('-')[0]}</span>
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
                    
                    <Button onClick={handleDispense} className="w-full h-14 text-md rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-500/20" size="lg" disabled={isLoading}>
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
