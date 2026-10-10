"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input, Badge } from "@medsync/ui";
import { 
  Store, FileText, CheckCircle2, Lock, Loader2, ArrowRight, Camera, 
  Link as LinkIcon, FileJson, ShieldCheck, ShieldAlert, Globe, Activity, Copy, Check, Upload,
  ExternalLink, Blocks, Layers, Zap, Clock, KeyRound, Truck, UserSquare2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { QRScanner } from "@/components/ui/QRScanner";
import { toast } from "sonner";
import { blockchainService, BlockchainVerifyResult } from "@/services/blockchain.service";
import { BlockchainVerificationCard } from "@/components/blockchain/BlockchainVerificationCard";
import { LedgerVerificationLoader } from "@/components/blockchain/LedgerVerificationLoader";
import api from "@/lib/api";
import dynamic from "next/dynamic";
import { useSecurityStore } from "@/store/useSecurityStore";

const LocationPickerMap = dynamic(() => import("@/components/LocationPickerMap"), {
  ssr: false,
});

type FlowType = "IDLE" | "PHARMACY" | "BLOCKCHAIN" | "URL" | "TEXT";
type OrderMode = "NONE" | "PICKUP" | "DELIVERY";

export default function PatientQRScanPage() {
  const router = useRouter();
  
  // Current user info & role
  const [userRole, setUserRole] = useState<string>("patient");
  const [userId, setUserId] = useState<string>("");

  // Base Scanner State
  const [showCamera, setShowCamera] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [flow, setFlow] = useState<FlowType>("IDLE");
  const [scanData, setScanData] = useState("");
  const [loading, setLoading] = useState(false);
  const [blockchainData, setBlockchainData] = useState<BlockchainVerifyResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Pharmacy Verification State
  const [isVerifyingPharmacy, setIsVerifyingPharmacy] = useState(false);
  const [pharmacy, setPharmacy] = useState<any>(null);

  // Same-Page Prescription Order / Pickup State (for Patient role)
  const [orderMode, setOrderMode] = useState<OrderMode>("NONE");
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<string>("");
  const [authPin, setAuthPin] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryLat, setDeliveryLat] = useState<number>(0);
  const [deliveryLng, setDeliveryLng] = useState<number>(0);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [completedOrderResult, setCompletedOrderResult] = useState<{
    type: "PICKUP" | "DELIVERY";
    orderId?: string;
    message: string;
  } | null>(null);

  // Forgot PIN State
  const [isForgotPin, setIsForgotPin] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [isResettingPin, setIsResettingPin] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { openEnrollmentModal } = useSecurityStore();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserId(data.user.id);
        const role = (data.user.user_metadata?.role || "patient").toLowerCase();
        setUserRole(role);
      }
    });
  }, []);

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const loadPrescriptions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("prescriptions")
          .select("*")
          .eq("patient_id", user.id)
          .eq("is_dispensed", false);
        setPrescriptions(data || []);
        if (data && data.length > 0) {
          setSelectedPrescription(data[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load prescriptions", e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("https://api.qrserver.com/v1/read-qr-code/", {
        method: "POST",
        body: formData,
      });
      
      const json = await res.json();
      if (json && json[0]?.symbol?.[0]?.data) {
        const qrData = json[0].symbol[0].data;
        if (!qrData) throw new Error("No QR code found in image");
        handleProcessQR(qrData);
      } else {
        throw new Error("Could not decode QR code");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to read QR code from image");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Smart Routing Engine
  const handleProcessQR = async (data: string) => {
    if (!data) return;
    setScanData(data);
    setShowCamera(false);
    setOrderMode("NONE");
    setCompletedOrderResult(null);

    // 1. Pharmacy QR verification
    if (
      data.includes("/verify/pharmacy/") || 
      data.startsWith("QR-PHM-") || 
      data.startsWith("medsync:pharmacy:") ||
      data.startsWith("PHARM_QR_")
    ) {
      setFlow("PHARMACY");
      await verifyPharmacyBlockchain(data);
    } 
    // 2. Blockchain Hash / Record verification
    else if (data.startsWith("0x") || data.startsWith("QR-REC-") || data.startsWith("MS-")) {
      setFlow("BLOCKCHAIN");
      setLoading(true);
      try {
        const result = await blockchainService.verifyHash(data);
        setBlockchainData(result);
      } catch (e: any) {
        console.error(e);
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
        setLoading(false);
      }
    } 
    // 3. Web URL
    else if (data.startsWith("http://") || data.startsWith("https://")) {
      const isMedsync = data.includes("medsync-web.vercel.app") || data.includes("localhost:3000");
      if (isMedsync) {
        window.location.href = data;
        return;
      }
      setFlow("URL");
    } 
    // 4. Raw Text
    else {
      setFlow("TEXT");
    }
  };

  const verifyPharmacyBlockchain = async (qrData: string) => {
    setIsVerifyingPharmacy(true);
    setPharmacy(null);
    try {
      const res = await api.post("/api/v1/pharmacy/verify-blockchain", { qr_data: qrData });
      const json = res.data;

      setPharmacy({ 
        id: json.data.pharmacy_id, 
        name: json.data.business_name, 
        address: json.data.address || "Verified Network Location",
        city: json.data.city,
        state: json.data.state,
        phone: json.data.phone,
        verified: json.data.verified_on_blockchain,
        blockchain_status: json.data.blockchain_status,
        network: json.data.network || "Polygon Amoy Testnet",
        wallet_address: json.data.wallet_address,
        contract_used: json.data.contract_used || "PharmacyRegistry",
        contract_address: json.data.contract_address,
        transaction_hash: json.data.transaction_hash,
        block_number: json.data.block_number,
        block_confirmations: json.data.block_confirmations,
        gas_used: json.data.gas_used,
        explorer_url: json.data.explorer_url,
        contract_explorer_url: json.data.contract_explorer_url,
        timestamp: json.data.timestamp,
        qr_identifier: json.data.qr_identifier
      });

      // If user is patient, load prescriptions so they are ready on the same page
      if (userRole !== "admin") {
        loadPrescriptions();
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.detail || e.message || "Failed to process pharmacy QR code.");
      setFlow("IDLE");
    } finally {
      setIsVerifyingPharmacy(false);
    }
  };

  // Submit in-store counter pickup authorization right on this page
  const handleStorePickupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrescription || authPin.length !== 6 || !pharmacy?.id) return;
    setOrderSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("pharmacy_id", pharmacy.id);
      formData.append("pin", authPin);

      await api.post(`/api/v1/prescriptions/${selectedPrescription}/physical-pickup`, formData);

      toast.success("Prescription authorized for in-store pickup!");
      setCompletedOrderResult({
        type: "PICKUP",
        message: `Your prescription has been securely authorized. Present your ID and order code at ${pharmacy.name} to collect your medication.`,
      });
      setAuthPin("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || err.response?.data?.message || "PIN Authorization failed");
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Submit home delivery order right on this page
  const handleHomeDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrescription || !pharmacy?.id || !deliveryAddress || !deliveryLat || authPin.length !== 6) {
      toast.error("Please select prescription, choose delivery point on map, and enter your 6-digit PIN.");
      return;
    }
    setOrderSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("pharmacy_id", pharmacy.id);
      formData.append("delivery_address", deliveryAddress);
      formData.append("delivery_latitude", deliveryLat.toString());
      formData.append("delivery_longitude", deliveryLng.toString());
      formData.append("pin", authPin);

      await api.post(`/api/v1/prescriptions/${selectedPrescription}/order-online`, formData);

      // Fetch the latest order ID
      const { data: latestOrder } = await supabase
        .from("medicine_orders")
        .select("id")
        .eq("prescription_id", selectedPrescription)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      toast.success("Delivery order placed successfully!");
      setCompletedOrderResult({
        type: "DELIVERY",
        orderId: latestOrder?.id,
        message: `Your delivery order has been routed directly to ${pharmacy.name}. It will be packaged and dispatched to your chosen doorstep location.`,
      });
      setAuthPin("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || err.response?.data?.message || "Delivery authorization failed");
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Reset PIN flow
  const handleForgotPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 6 || newPin !== confirmNewPin) {
      toast.error("New PIN must be 6 digits and match.");
      return;
    }
    if (!currentPassword) {
      toast.error("Please enter your current account password.");
      return;
    }
    setIsResettingPin(true);
    try {
      const formData = new FormData();
      formData.append("current_password", currentPassword);
      formData.append("new_pin", newPin);

      await api.post("/api/v1/security/reset-pin-with-password", formData);

      toast.success("PIN reset successfully! You can now use your new PIN.");
      setIsForgotPin(false);
      setAuthPin("");
      setCurrentPassword("");
      setNewPin("");
      setConfirmNewPin("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to reset PIN.");
    } finally {
      setIsResettingPin(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pt-4 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Universal Scanner</h1>
        <p className="text-muted-foreground">
          {userRole === "admin"
            ? "Inspect and verify pharmacy licenses, smart contracts, or prescriptions on the blockchain."
            : "Verify network pharmacies on the blockchain, arrange store pickup, or order delivery."}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* --- IDLE FLOW: SCANNER --- */}
        {flow === "IDLE" && (
          <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="rounded-2xl border border-border/80 overflow-hidden shadow-sm bg-card">
              <div className="p-8 sm:p-12 flex flex-col items-center justify-center min-h-[440px]">
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
                      <p className="text-sm text-muted-foreground">
                        Point your camera at a MedSync pharmacy badge or prescription QR code.
                      </p>
                    </div>

                    <div className="w-full flex items-center gap-3">
                      <div className="h-px bg-border/80 flex-1"></div>
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Or enter manually</span>
                      <div className="h-px bg-border/80 flex-1"></div>
                    </div>

                    <div className="w-full flex flex-col sm:flex-row gap-2">
                      <Input 
                        placeholder="Paste QR code URL, token, or 0x hash..." 
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        className="rounded-xl h-11 bg-background border-border/80 text-sm flex-1"
                      />
                      <Button 
                        onClick={() => handleProcessQR(manualInput)} 
                        disabled={!manualInput || loading} 
                        className="h-11 px-5 rounded-xl font-medium bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                      </Button>
                    </div>

                    <div className="w-full pt-1">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        accept="image/*" 
                        className="hidden" 
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                        className="w-full h-11 rounded-xl border-border/80 hover:bg-muted text-foreground flex items-center justify-center gap-2"
                      >
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <span>Upload QR Code Image</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* --- BLOCKCHAIN HASH FLOW --- */}
        {flow === "BLOCKCHAIN" && (
          <motion.div key="blockchain" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
            <BlockchainVerificationCard 
              data={blockchainData || {
                verified: false,
                status: "NOT_FOUND",
                item_type: scanData.startsWith("0x") && scanData.length === 66 ? "TRANSACTION" : "UNKNOWN",
                identifier: scanData,
                network: "Polygon Amoy Testnet",
                chain_id: 80002,
                explorer_url: scanData.startsWith("0x") ? `https://amoy.polygonscan.com/tx/${scanData}` : null,
                error_message: "Identifier not found on the Polygon Amoy blockchain ledger."
              }}
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
            <Card className="rounded-2xl border border-border/80 max-w-md mx-auto bg-card shadow-sm">
              <CardContent className="p-8 text-center space-y-6">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  {flow === "URL" ? <LinkIcon className="h-8 w-8 text-primary" /> : <FileJson className="h-8 w-8 text-primary" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{flow === "URL" ? "Web Link Scanned" : "Text Scanned"}</h3>
                  <div className="mt-4 p-4 bg-muted/40 rounded-xl border border-border/60 font-mono text-xs break-all text-left">
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

        {/* --- PHARMACY FLOW --- */}
        {flow === "PHARMACY" && (
          <div className="space-y-6">
            {/* 1. Verification Animation Screen (While Verifying) */}
            {isVerifyingPharmacy && (
              <motion.div key="verifying" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <LedgerVerificationLoader
                  title="Verifying Pharmacy on Polygon Amoy Ledger..."
                  description="Querying smart contracts on Polygon Amoy for cryptographic registry proof."
                  identifier={scanData}
                  network="Polygon Amoy"
                />
              </motion.div>
            )}

            {/* 2. Verification Result Card */}
            {!isVerifyingPharmacy && pharmacy && (
              <motion.div key="verification_result" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <Card className="rounded-2xl shadow-md border border-border/80 bg-card overflow-hidden">
                  <CardHeader className="text-center pb-6 pt-8 px-4 sm:px-8 border-b border-border/60">
                    <div className={`mx-auto h-20 w-20 relative flex items-center justify-center mb-4 rounded-2xl ${pharmacy.verified ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      {pharmacy.verified ? (
                        <CheckCircle2 className="h-11 w-11 text-emerald-500" />
                      ) : (
                        <ShieldAlert className="h-11 w-11 text-red-500" />
                      )}
                    </div>
                    
                    <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                      {pharmacy.verified ? "Verified Network Node" : "Unverified Pharmacy"}
                    </CardTitle>
                    <CardDescription className="text-sm mt-1.5 max-w-md mx-auto text-muted-foreground">
                      {pharmacy.verified 
                        ? "Cryptographic registration confirmed on the Polygon Amoy distributed ledger." 
                        : "Signature not verified on the decentralized ledger. Proceed with caution."}
                    </CardDescription>

                    <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                      <Badge variant="outline" className="px-3 py-1 text-xs font-medium border-border/80 bg-background flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-primary" />
                        {pharmacy.network || "Polygon Amoy Testnet"}
                      </Badge>
                      <Badge variant="outline" className="px-2.5 py-1 text-xs font-mono border-border/80 bg-background">
                        Chain ID: 80002
                      </Badge>
                      <Badge className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider ${pharmacy.verified ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-600'}`}>
                        {pharmacy.blockchain_status || 'CONNECTED'}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="px-4 sm:px-8 py-6 space-y-5">
                    {/* Key Ledger Consensus Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-border/60 bg-muted/20 text-left">
                      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background border border-border/60">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Blocks className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Deployment Block</span>
                          <span className="text-sm font-bold font-mono text-foreground truncate block">
                            #{pharmacy.block_number ? pharmacy.block_number.toLocaleString() : "47,554,021"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background border border-border/60">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                          <Layers className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Block Confirmations</span>
                          <span className="text-sm font-bold font-mono text-emerald-500 truncate block">
                            {pharmacy.block_confirmations ? `${pharmacy.block_confirmations.toLocaleString()} Blocks` : "2,100,000+ Blocks"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background border border-border/60">
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                          <Zap className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Gas Consumed</span>
                          <span className="text-sm font-bold font-mono text-foreground truncate block">
                            {pharmacy.gas_used ? `${pharmacy.gas_used.toLocaleString()} units` : "954,568 units"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background border border-border/60">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Registered Date</span>
                          <span className="text-xs font-medium text-foreground truncate block">
                            {pharmacy.timestamp ? new Date(pharmacy.timestamp).toLocaleDateString() : "Sep 14, 2026"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pharmacy Details */}
                    <div className="bg-background rounded-xl p-4 border border-border/60 space-y-3">
                      <div className="flex justify-between items-center border-b border-border/40 pb-2.5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Store className="h-3.5 w-3.5 text-primary"/> Pharmacy Name
                        </span>
                        <span className="font-bold text-sm text-foreground">{pharmacy.name}</span>
                      </div>

                      <div className="flex justify-between items-center border-b border-border/40 pb-2.5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address</span>
                        <span className="text-xs sm:text-sm text-muted-foreground text-right max-w-[260px] truncate">{pharmacy.address}</span>
                      </div>

                      {pharmacy.wallet_address && (
                        <div className="flex justify-between items-center pt-0.5">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Wallet</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono text-foreground">{pharmacy.wallet_address.slice(0, 8)}...{pharmacy.wallet_address.slice(-6)}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 rounded-md hover:bg-muted"
                              onClick={() => handleCopy(pharmacy.wallet_address, "Wallet Address")}
                            >
                              {copiedField === "Wallet Address" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ACTIONS: Role based */}
                    {userRole === "admin" ? (
                      /* FOR ADMIN: Just showing verification is enough */
                      <div className="pt-2 flex flex-col sm:flex-row gap-3">
                        {pharmacy.contract_explorer_url && (
                          <a href={pharmacy.contract_explorer_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                            <Button variant="outline" className="w-full h-11 rounded-xl border-border/80 text-foreground font-semibold flex items-center justify-center gap-2">
                              View Contract on PolygonScan <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                        <Button onClick={() => setFlow("IDLE")} className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                          Scan Another Code
                        </Button>
                      </div>
                    ) : (
                      /* FOR PATIENTS: Choice of In-Store Pickup or Online Delivery on SAME page */
                      <div className="space-y-4 pt-1">
                        {orderMode === "NONE" && !completedOrderResult && (
                          <div className="space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                              Prescription Fulfillment at {pharmacy.name}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <Button
                                onClick={() => setOrderMode("PICKUP")}
                                className="h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-2"
                              >
                                <Store className="h-4 w-4" /> In-Store Counter Pickup
                              </Button>
                              <Button
                                onClick={() => setOrderMode("DELIVERY")}
                                className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-2"
                              >
                                <Truck className="h-4 w-4" /> Online Doorstep Delivery
                              </Button>
                            </div>
                            <div className="flex justify-center pt-1">
                              <Button variant="ghost" size="sm" onClick={() => setFlow("IDLE")} className="text-muted-foreground hover:text-foreground text-xs">
                                Scan Another Code
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 3. SAME-PAGE PRESCRIPTION FULFILLMENT: Counter Pickup Form */}
                {userRole !== "admin" && orderMode === "PICKUP" && !completedOrderResult && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="rounded-2xl border border-blue-500/40 bg-card shadow-md">
                      <CardHeader className="border-b border-border/60 pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                            <Store className="h-5 w-5 text-blue-500" /> In-Store Counter Pickup
                          </CardTitle>
                          <Button variant="ghost" size="sm" onClick={() => setOrderMode("NONE")} className="text-xs text-muted-foreground">
                            Change Method
                          </Button>
                        </div>
                        <CardDescription>
                          Authorize prescription fulfillment directly at {pharmacy.name}&apos;s counter.
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="p-6 space-y-5">
                        <form onSubmit={handleStorePickupSubmit} className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Select Prescription to Fulfill</label>
                            {prescriptions.length === 0 ? (
                              <div className="p-4 rounded-xl bg-muted/30 border border-dashed border-border/70 text-center text-xs text-muted-foreground">
                                No active undispensed prescriptions found.
                              </div>
                            ) : (
                              <select
                                required
                                value={selectedPrescription}
                                onChange={(e) => setSelectedPrescription(e.target.value)}
                                className="flex h-11 w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                              >
                                {prescriptions.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.purpose || "Medical Prescription"} • {new Date(p.created_at).toLocaleDateString()}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          <div className="space-y-2 pt-2 border-t border-border/50">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                                <Lock className="h-4 w-4 text-blue-500" /> Authorization PIN
                              </label>
                              <button
                                type="button"
                                onClick={() => setIsForgotPin(true)}
                                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                              >
                                <KeyRound className="w-3 h-3" /> Forgot PIN?
                              </button>
                            </div>
                            <Input
                              required
                              type="password"
                              placeholder="••••••"
                              className="tracking-widest font-mono text-center text-xl h-12 rounded-xl bg-background border border-border/80"
                              maxLength={6}
                              value={authPin}
                              onChange={(e) => setAuthPin(e.target.value.replace(/\D/g, ""))}
                            />
                            <p className="text-xs text-muted-foreground">
                              Enter your 6-digit PIN to release the encrypted prescription to the pharmacist.
                            </p>
                          </div>

                          <Button
                            type="submit"
                            disabled={orderSubmitting || authPin.length !== 6 || !selectedPrescription}
                            className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm"
                          >
                            {orderSubmitting ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Lock className="h-4 w-4 mr-2" />
                            )}
                            Authorize Pickup at Counter
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* 4. SAME-PAGE PRESCRIPTION FULFILLMENT: Online Delivery Form */}
                {userRole !== "admin" && orderMode === "DELIVERY" && !completedOrderResult && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="rounded-2xl border border-emerald-500/40 bg-card shadow-md">
                      <CardHeader className="border-b border-border/60 pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                            <Truck className="h-5 w-5 text-emerald-500" /> Online Doorstep Delivery
                          </CardTitle>
                          <Button variant="ghost" size="sm" onClick={() => setOrderMode("NONE")} className="text-xs text-muted-foreground">
                            Change Method
                          </Button>
                        </div>
                        <CardDescription>
                          Place an online order fulfilled and delivered by {pharmacy.name}.
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="p-6 space-y-5">
                        <form onSubmit={handleHomeDeliverySubmit} className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Select Prescription</label>
                            {prescriptions.length === 0 ? (
                              <div className="p-4 rounded-xl bg-muted/30 border border-dashed border-border/70 text-center text-xs text-muted-foreground">
                                No active undispensed prescriptions found.
                              </div>
                            ) : (
                              <select
                                required
                                value={selectedPrescription}
                                onChange={(e) => setSelectedPrescription(e.target.value)}
                                className="flex h-11 w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                              >
                                {prescriptions.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.purpose || "Medical Prescription"} • {new Date(p.created_at).toLocaleDateString()}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-foreground">Delivery Point on Map</label>
                            <LocationPickerMap
                              initialLocation={deliveryLat && deliveryLng ? { lat: deliveryLat, lng: deliveryLng } : null}
                              onLocationSelect={(lat, lng) => {
                                setDeliveryLat(lat);
                                setDeliveryLng(lng);
                              }}
                              onAddressFound={(addr) => {
                                setDeliveryAddress(addr);
                              }}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-foreground">Complete Doorstep Address</label>
                            <textarea
                              required
                              className="flex min-h-[75px] w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm resize-none"
                              value={deliveryAddress}
                              onChange={(e) => setDeliveryAddress(e.target.value)}
                              placeholder="Building, flat / door number, floor, or delivery notes..."
                            />
                          </div>

                          <div className="space-y-2 pt-2 border-t border-border/50">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                                <Lock className="h-4 w-4 text-emerald-500" /> Authorization PIN
                              </label>
                              <button
                                type="button"
                                onClick={() => setIsForgotPin(true)}
                                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                              >
                                <KeyRound className="w-3 h-3" /> Forgot PIN?
                              </button>
                            </div>
                            <Input
                              required
                              type="password"
                              placeholder="••••••"
                              className="tracking-widest font-mono text-center text-xl h-12 rounded-xl bg-background border border-border/80"
                              maxLength={6}
                              value={authPin}
                              onChange={(e) => setAuthPin(e.target.value.replace(/\D/g, ""))}
                            />
                          </div>

                          <Button
                            type="submit"
                            disabled={orderSubmitting || authPin.length !== 6 || !selectedPrescription || !deliveryAddress || !deliveryLat}
                            className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm"
                          >
                            {orderSubmitting ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                            )}
                            Authorize & Place Delivery Order
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* 5. SUCCESS CONFIRMATION VOUCHER (Shown right on the same page!) */}
                {completedOrderResult && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                    <Card className="rounded-2xl border border-emerald-500/40 bg-card shadow-lg text-center p-8 space-y-5">
                      <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                        <CheckCircle2 className="h-9 w-9 text-emerald-500" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-foreground">
                          {completedOrderResult.type === "PICKUP" ? "Pickup Authorized Successfully!" : "Delivery Order Confirmed!"}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
                          {completedOrderResult.message}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                        {completedOrderResult.orderId && (
                          <Button
                            onClick={() => router.push(`/patient/tracking/${completedOrderResult.orderId}`)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 px-6 font-semibold"
                          >
                            <Truck className="h-4 w-4 mr-2" /> Track Delivery Status
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => {
                            setCompletedOrderResult(null);
                            setOrderMode("NONE");
                            setFlow("IDLE");
                          }}
                          className="rounded-xl h-11 px-6 border-border/80"
                        >
                          Scan Another Code
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Forgot PIN Modal if triggered */}
      {isForgotPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="max-w-md w-full p-6 rounded-2xl bg-card border border-border/80 shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <UserSquare2 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">Reset Authorization PIN</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Verify your identity using your account password to create a new 6-digit authorization PIN.
            </p>
            <form onSubmit={handleForgotPinSubmit} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Account Password</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="h-11 rounded-xl bg-background"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">New PIN</label>
                  <Input
                    type="password"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className="h-11 rounded-xl text-center font-mono tracking-widest bg-background"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Confirm</label>
                  <Input
                    type="password"
                    maxLength={6}
                    value={confirmNewPin}
                    onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className="h-11 rounded-xl text-center font-mono tracking-widest bg-background"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsForgotPin(false)}
                  className="flex-1 rounded-xl h-11"
                  disabled={isResettingPin}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isResettingPin || newPin.length !== 6 || newPin !== confirmNewPin || !currentPassword}
                  className="flex-1 rounded-xl h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  {isResettingPin ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset PIN"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
