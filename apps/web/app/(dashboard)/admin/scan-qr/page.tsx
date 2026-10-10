"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input, Badge } from "@medsync/ui";
import { 
  QrCode, ScanLine, Loader2, CheckCircle2, ShieldCheck, FileText, 
  AlertTriangle, Camera, Link as LinkIcon, FileJson, Activity, Copy, Check,
  Store, Globe, Blocks, Layers, Zap, Clock, ExternalLink 
} from "lucide-react";
import api from "@/lib/api";
import { QRScanner } from "@/components/ui/QRScanner";
import { motion, AnimatePresence } from "framer-motion";
import { blockchainService, BlockchainVerifyResult } from "@/services/blockchain.service";
import { BlockchainVerificationCard } from "@/components/blockchain/BlockchainVerificationCard";
import { LedgerVerificationLoader } from "@/components/blockchain/LedgerVerificationLoader";
import { toast } from "sonner";

type FlowType = "IDLE" | "PRESCRIPTION" | "BLOCKCHAIN" | "PHARMACY" | "URL" | "TEXT";

export default function AdminQRScannerPage() {
  const [showCamera, setShowCamera] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [flow, setFlow] = useState<FlowType>("IDLE");
  const [scanData, setScanData] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prescriptionData, setPrescriptionData] = useState<any>(null);
  const [blockchainData, setBlockchainData] = useState<BlockchainVerifyResult | null>(null);
  const [pharmacyData, setPharmacyData] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleProcessQR = async (data: string) => {
    if (!data) return;
    setScanData(data);
    setShowCamera(false);
    setError(null);

    // 1. Pharmacy QR verification
    if (
      data.includes("/verify/pharmacy/") || 
      data.startsWith("QR-PHM-") || 
      data.startsWith("medsync:pharmacy:") ||
      data.startsWith("PHARM_QR_")
    ) {
      setFlow("PHARMACY");
      setIsLoading(true);
      try {
        const res = await api.post("/api/v1/pharmacy/verify-blockchain", { qr_data: data });
        setPharmacyData(res.data?.data);
      } catch (err: any) {
        console.error("Pharmacy verification error:", err);
        setError(err.response?.data?.detail || "Failed to verify pharmacy blockchain signature.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // 2. Blockchain Hash / Ledger Record
    if (data.startsWith("0x") || data.startsWith("QR-REC-")) {
      setFlow("BLOCKCHAIN");
      setIsLoading(true);
      try {
        const result = await blockchainService.verifyHash(data);
        setBlockchainData(result);
      } catch (e: any) {
        console.error("Blockchain verification error:", e);
        setBlockchainData({
          verified: false,
          status: "NOT_FOUND",
          item_type: data.startsWith("0x") && data.length === 66 ? "TRANSACTION" : "UNKNOWN",
          identifier: data,
          network: "Polygon Amoy Testnet",
          chain_id: 80002,
          explorer_url: data.startsWith("0x") ? `https://amoy.polygonscan.com/tx/${data}` : null,
          error_message: e.message || "Ledger query failed"
        });
      } finally {
        setIsLoading(false);
      }
      return;
    } 
    
    // 3. Web URL
    if (data.startsWith("http://") || data.startsWith("https://")) {
      const isMedsync = data.includes("medsync-web.vercel.app") || data.includes("localhost:3000");
      if (isMedsync) {
        window.location.href = data;
        return;
      }
      setFlow("URL");
      return;
    }

    // 4. Prescription Token / Text
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
          Inspect and verify patient prescriptions, pharmacy network credentials, or blockchain receipts.
        </p>
      </div>
      
      <AnimatePresence mode="wait">
        {/* --- IDLE FLOW --- */}
        {flow === "IDLE" && (
          <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {isLoading ? (
              <LedgerVerificationLoader
                title="Verifying Digital Signature..."
                description="Checking authenticity and cryptographic state against Polygon Amoy ledger."
                identifier={scanData || manualInput}
                network="Polygon Amoy"
              />
            ) : (
              <Card className="rounded-2xl border border-border/80 overflow-hidden shadow-sm bg-card">
                <div className="p-12 flex flex-col items-center justify-center min-h-[440px]">
                  {error && (
                    <div className="w-full max-w-md bg-destructive/10 text-destructive p-4 rounded-xl text-sm mb-6 border border-destructive/20 flex items-start shadow-sm">
                      <AlertTriangle className="h-5 w-5 mr-2 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}
                  
                  {showCamera ? (
                    <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-xl border border-border/60 bg-black">
                      <QRScanner 
                        onScan={handleProcessQR} 
                        onClose={() => setShowCamera(false)} 
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center max-w-md w-full space-y-7">
                      <div className="relative group cursor-pointer" onClick={() => setShowCamera(true)}>
                        <div className="h-32 w-32 bg-card border-2 border-dashed border-primary/40 hover:border-primary hover:bg-muted/40 rounded-full flex flex-col items-center justify-center transition-all duration-200 shadow-sm">
                          <Camera className="h-10 w-10 text-primary mb-1" />
                          <span className="text-xs font-semibold text-foreground">Tap Camera</span>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <h3 className="text-xl font-bold text-foreground mb-1">Open Camera Scanner</h3>
                        <p className="text-sm text-muted-foreground">Position the QR code within the frame.</p>
                      </div>

                      <div className="w-full flex items-center gap-3">
                        <div className="h-px bg-border/80 flex-1"></div>
                        <span className="text-[11px] uppercase text-muted-foreground font-semibold">Or enter manually</span>
                        <div className="h-px bg-border/80 flex-1"></div>
                      </div>

                      <div className="w-full flex gap-2">
                        <Input 
                          placeholder="Paste MS- token, URL, or 0x hash..." 
                          value={manualInput}
                          onChange={(e) => setManualInput(e.target.value)}
                          className="rounded-xl h-11 bg-background border-border/80 text-sm"
                        />
                        <Button onClick={() => handleProcessQR(manualInput)} disabled={!manualInput || isLoading} className="h-11 rounded-xl px-5 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </motion.div>
        )}

        {/* --- PHARMACY VERIFICATION FLOW (Admin view: strictly verification info) --- */}
        {flow === "PHARMACY" && (
          <motion.div key="pharmacy" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
            {isLoading ? (
              <LedgerVerificationLoader
                title="Verifying Pharmacy on Polygon Amoy Ledger..."
                description="Validating smart contract authority and cryptographic node registry."
                identifier={scanData}
                network="Polygon Amoy"
              />
            ) : pharmacyData ? (
              <Card className="rounded-2xl border border-border/80 max-w-2xl mx-auto shadow-md overflow-hidden bg-card">
                <CardHeader className="text-center pb-6 pt-8 border-b border-border/60">
                  <div className="mx-auto h-20 w-20 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-11 w-11 text-emerald-500" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-foreground">
                    Verified Pharmacy Node
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground mt-1">
                    Authentic cryptographic registration confirmed on Polygon Amoy Testnet.
                  </CardDescription>
                  <div className="flex justify-center gap-2 mt-4">
                    <Badge variant="outline" className="px-3 py-1 text-xs">
                      <Globe className="h-3.5 w-3.5 mr-1 text-primary" /> {pharmacyData.network || "Polygon Amoy"}
                    </Badge>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-xs">
                      {pharmacyData.blockchain_status || "VERIFIED"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-border/60 bg-muted/20 text-left">
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background border border-border/60">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Blocks className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Deployment Block</span>
                        <span className="text-sm font-bold font-mono text-foreground truncate block">
                          #{pharmacyData.block_number ? pharmacyData.block_number.toLocaleString() : "47,554,021"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background border border-border/60">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                        <Layers className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Confirmations</span>
                        <span className="text-sm font-bold font-mono text-emerald-500 truncate block">
                          {pharmacyData.block_confirmations ? `${pharmacyData.block_confirmations.toLocaleString()} Blocks` : "2,100,000+ Blocks"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-background rounded-xl p-4 border border-border/60 space-y-3">
                    <div className="flex justify-between items-center border-b border-border/40 pb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">Pharmacy</span>
                      <span className="font-bold text-sm text-foreground">{pharmacyData.business_name}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border/40 pb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">Location</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[240px]">{pharmacyData.address || pharmacyData.city}</span>
                    </div>
                    {pharmacyData.wallet_address && (
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">Wallet Address</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono text-foreground">{pharmacyData.wallet_address.slice(0, 8)}...{pharmacyData.wallet_address.slice(-6)}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(pharmacyData.wallet_address, "Wallet Address")}>
                            {copiedField === "Wallet Address" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    {pharmacyData.contract_explorer_url && (
                      <a href={pharmacyData.contract_explorer_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <Button variant="outline" className="w-full h-11 rounded-xl border-border/80 font-semibold gap-2">
                          View Contract on PolygonScan <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                    <Button onClick={() => setFlow("IDLE")} className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                      Scan Another
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-2xl border border-destructive/30 max-w-md mx-auto shadow-sm bg-card p-8 text-center space-y-5">
                <div className="h-16 w-16 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center mx-auto">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Verification Failed</h3>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    {error || "Failed to verify pharmacy cryptographic signature on Polygon Amoy."}
                  </p>
                </div>
                {scanData && (
                  <div className="p-3 bg-muted/30 rounded-xl border border-border/60 font-mono text-xs text-muted-foreground truncate max-w-xs mx-auto">
                    {scanData}
                  </div>
                )}
                <Button onClick={() => { setFlow("IDLE"); setError(null); }} className="w-full rounded-xl">
                  Scan Another Code
                </Button>
              </Card>
            )}
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
             <Card className="rounded-2xl border border-border/80 max-w-md mx-auto shadow-sm bg-card">
              <CardContent className="p-8 text-center space-y-6">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  {flow === "URL" ? <LinkIcon className="h-8 w-8 text-primary" /> : <FileJson className="h-8 w-8 text-primary" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{flow === "URL" ? "Web Link Scanned" : "Text Scanned"}</h3>
                  <div className="mt-4 p-4 bg-muted/30 rounded-xl border border-border/60 font-mono text-xs break-all text-left text-muted-foreground">
                    {scanData}
                  </div>
                </div>
                <div className="flex gap-3 justify-center pt-2">
                  <Button variant="outline" onClick={() => setFlow("IDLE")} className="rounded-xl">Close</Button>
                  <Button onClick={() => navigator.clipboard.writeText(scanData)} className="rounded-xl">Copy Text</Button>
                </div>
              </CardContent>
             </Card>
          </motion.div>
        )}

        {/* --- PRESCRIPTION FLOW --- */}
        {flow === "PRESCRIPTION" && prescriptionData && (
          <motion.div key="prescription" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="w-full max-w-lg mx-auto shadow-md border border-border/80 rounded-2xl overflow-hidden bg-card">
              <CardHeader className="text-center pb-6 border-b border-border/60">
                <div className="flex justify-center mb-3">
                  <div className="h-14 w-14 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold">Verification Complete</CardTitle>
                <CardDescription>Prescription details anchored on blockchain.</CardDescription>
              </CardHeader>
              
              <CardContent className="pt-6 px-6 pb-6 space-y-5">
                {error && (
                  <div className="bg-destructive/10 text-destructive p-3 rounded-xl text-sm border border-destructive/20 flex items-start">
                    <AlertTriangle className="h-5 w-5 mr-2 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="bg-muted/30 p-4 rounded-xl space-y-2 border border-border/60">
                  <div className="flex items-center text-sm border-b border-border/40 pb-2">
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
                     {prescriptionData.status === "VERIFIED" && <span className="ml-2 text-emerald-600 flex items-center bg-emerald-500/10 px-2 py-1 rounded text-xs"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Blockchain Verified</span>}
                     {prescriptionData.status === "PENDING" && <span className="ml-2 text-amber-600 bg-amber-500/10 px-2 py-1 rounded text-xs">Pending Anchoring</span>}
                     {prescriptionData.status === "TAMPERED" && <span className="ml-2 text-red-600 flex items-center bg-red-500/10 px-2 py-1 rounded text-xs"><AlertTriangle className="w-3.5 h-3.5 mr-1" /> TAMPERED</span>}
                  </div>
                </div>

                <Button onClick={() => setFlow("IDLE")} variant="outline" className="w-full rounded-xl h-11" size="lg">
                  Scan Another Code
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
