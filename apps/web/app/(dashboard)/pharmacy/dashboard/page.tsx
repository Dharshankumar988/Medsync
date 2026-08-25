"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Pill, 
  Package, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Search, 
  AlertTriangle, 
  RefreshCw,
  FileCheck,
  TrendingUp,
  MapPin,
  Brain
} from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Input } from "@medsync/ui";
import { pharmacyService, PharmacyInventoryItem, PharmacyOrder } from "@/services/pharmacy.service";
import dynamic from "next/dynamic";
const DeliveryMap = dynamic(() => import("@/components/pharmacy/DeliveryMap").then(m => m.DeliveryMap), { ssr: false });
import { ProfileCompletionCard } from "@/components/profile-wizard/ProfileCompletionCard";
import { InventoryOverviewWidget } from "@/components/pharmacy/InventoryOverviewWidget";
import { ExpiringMedicines } from "@/components/pharmacy/ExpiringMedicines";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] } },
};
const stagger = { visible: { transition: { staggerChildren: 0.03 } } };

export default function PharmacyDashboardPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [verificationInput, setVerificationInput] = useState("");
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean; txHash?: string } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [dispensingOrderId, setDispensingOrderId] = useState<string | null>(null);
  const [verifiedRxHash, setVerifiedRxHash] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");

  const { data: inventory = [], isLoading: isLoadingInventory } = useQuery({
    queryKey: ["pharmacyInventory"],
    queryFn: () => pharmacyService.getInventory(),
  });

  const { data: orders = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ["pharmacyOrders"],
    queryFn: () => pharmacyService.getOrders(),
  });

  const loading = isLoadingInventory || isLoadingOrders;

  const loadData = () => {
    queryClient.invalidateQueries({ queryKey: ["pharmacyInventory"] });
    queryClient.invalidateQueries({ queryKey: ["pharmacyOrders"] });
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const handleDispense = async (prescriptionId: string, orderId: string) => {
    if (verificationResult?.valid && verifiedRxHash === prescriptionId) {
      await pharmacyService.dispensePrescription(prescriptionId);
      queryClient.invalidateQueries({ queryKey: ["pharmacyOrders"] });
      setDispensingOrderId(orderId);
    } else {
      alert("SECURITY BLOCK: You must scan and verify the QR code for this prescription before dispensing medication.");
    }
  };

  const handleVerifyPrescription = async () => {
    if (!verificationInput.trim()) return;
    setVerifying(true);
    
    // Check if it looks like a JWT token (QR code)
    if (verificationInput.split('.').length === 3) {
      const res = await pharmacyService.verifyQR(verificationInput.trim());
      if (res.data?.is_valid) {
        setVerificationResult({ 
          valid: true, 
          txHash: res.data.data?.blockchain_tx || undefined,
        });
        
        // For PRESCRIPTION_ACCESS, allow dispensing using prescription_id
        if (res.data.purpose === "PRESCRIPTION_ACCESS") {
          setVerifiedRxHash(res.data.resource_id);
          alert(`QR Verified! Purpose: ${res.data.purpose}\nPatient: ${res.data.data.patient_id}`);
        } else if (res.data.purpose === "DELIVERY_CONFIRMATION") {
          alert(`Delivery Confirmed via QR!\nOrder: ${res.data.resource_id}`);
          queryClient.invalidateQueries({ queryKey: ["pharmacyOrders"] });
        } else if (res.data.purpose === "IN_STORE_ORDER") {
          alert(`In-Store Order Verified!\nOrder: ${res.data.resource_id}`);
        }
      } else {
        setVerificationResult({ valid: false });
        alert(`Verification Failed: ${res.message}`);
      }
    } else {
      // Fallback to old blockchain hash verification
      const res = await pharmacyService.verifyBlockchainPrescription(verificationInput.trim());
      setVerificationResult(res);
      if (res.valid) {
        setVerifiedRxHash(verificationInput.trim());
      }
    }
    setVerifying(false);
  };

  const handleDispatch = async (orderId: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL as string;
      const res = await fetch(`${baseUrl}/orders/${orderId}/dispatch`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Order dispatched! Simulation started. OTP: ${data.data.otp}`);
        queryClient.invalidateQueries({ queryKey: ["pharmacyOrders"] });
      } else {
        alert("Failed to dispatch order.");
      }
    } catch (e) {
      alert("Error dispatching order.");
    }
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => 
      item.medication_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.dosage.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [inventory, searchQuery]);

  const pendingOrders = useMemo(() => orders.filter(o => o.status === "PENDING").length, [orders]);
  const dispensedOrders = useMemo(() => orders.filter(o => o.status === "DISPENSED").length, [orders]);

  const stats = [
    { title: "Pending Fulfillments", value: pendingOrders, subtitle: "Awaiting verification & release", icon: Clock, accent: "amber" },
    { title: "Dispensed Today", value: dispensedOrders, subtitle: <span className="flex items-center"><TrendingUp className="h-3 w-3 text-emerald-500 mr-1" /><span className="text-emerald-500 font-medium">8%</span>&nbsp;vs yesterday</span>, icon: CheckCircle2, accent: "emerald" },
    { title: "Inventory Items", value: inventory.length, subtitle: "Monitored pharmaceutical SKUs", icon: Package, accent: "blue" },
    { title: "Low Stock Alerts", value: inventory.filter(i => i.stock < 100).length, subtitle: "Items below reorder threshold", icon: AlertTriangle, accent: "red", pulse: true },
  ];

  const accentMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    amber:   { bg: "bg-amber-500/10",   text: "text-amber-500",   border: "hover:border-amber-500/40",   glow: "from-amber-500/[0.07]" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "hover:border-emerald-500/40", glow: "from-emerald-500/[0.07]" },
    blue:    { bg: "bg-blue-500/10",    text: "text-blue-500",    border: "hover:border-blue-500/40",    glow: "from-blue-500/[0.07]" },
    red:     { bg: "bg-red-500/10",     text: "text-red-500",     border: "hover:border-red-500/40",     glow: "from-red-500/[0.07]" },
  };

  return (
    <div className="relative space-y-8 pb-12">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/[0.04] rounded-full blur-[100px]" />

      {userId && <ProfileCompletionCard userId={userId} role="pharmacy" />}

      {/* ─── Header Banner ─── */}
      <motion.div initial="hidden" animate="visible" variants={stagger}>
        <motion.div
          variants={fadeUp}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-card/50 border border-border/60 relative overflow-hidden group"
        >
          <div className="absolute right-0 top-0 w-72 h-72 bg-amber-500/[0.04] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 group-hover:bg-amber-500/[0.08] transition-colors duration-500" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="border-amber-500/40 text-amber-500 bg-amber-500/10 font-semibold px-3 py-1 rounded-lg">
                Pharmacy Portal
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />Node ID: PHARM-882</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
              Pharmacy Dispensing & Inventory
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl leading-relaxed">
              Verify blockchain prescriptions, fulfill patient orders, and manage real-time drug stock seamlessly.
            </p>
          </div>
          <Button onClick={loadData} variant="outline" className="relative z-10 rounded-xl border-amber-500/30 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 bg-background/50 backdrop-blur-sm">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh Data
          </Button>
        </motion.div>
      </motion.div>

      {/* ─── Stat Cards ─── */}
      <motion.div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4" initial="hidden" animate="visible" variants={stagger}>
        {stats.map((s, i) => {
          const a = accentMap[s.accent];
          return (
            <motion.div key={i} variants={fadeUp}>
              <Card className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 ${a.border}`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${a.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
                  <div className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl ${a.bg} transition-transform duration-300 group-hover:scale-110`}>
                    {(s as any).pulse && <span className="absolute h-2.5 w-2.5 rounded-full bg-red-500 animate-ping top-1.5 right-1.5" />}
                    <s.icon className={`h-5 w-5 ${a.text}`} />
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className={`text-2xl font-bold tracking-tight ${s.accent === 'red' ? 'text-red-500' : s.accent === 'amber' ? 'text-amber-500' : ''}`}>{s.value}</div>
                  <p className="text-xs text-muted-foreground mt-1.5">{s.subtitle}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ─── Insights ─── */}
      <motion.div
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-7"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
      >
        <motion.div variants={fadeUp} className="col-span-full lg:col-span-4">
          <InventoryOverviewWidget />
        </motion.div>
        <motion.div variants={fadeUp} className="col-span-full lg:col-span-3">
          <ExpiringMedicines />
        </motion.div>
      </motion.div>

      {/* ─── Blockchain Verification ─── */}
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={fadeUp}>
        <Card className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03]">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-amber-500">
              <ShieldCheck className="h-5 w-5" /> Blockchain Prescription Integrity Verifier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input 
                placeholder="Scan Dynamic QR Code or enter Blockchain Hash..."
                value={verificationInput}
                onChange={(e) => setVerificationInput(e.target.value)}
                className="flex-1 bg-background rounded-xl"
              />
              <Button 
                onClick={handleVerifyPrescription} 
                disabled={verifying}
                className="rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                {verifying ? "Verifying On-Chain..." : "Verify Smart Contract Hash"}
              </Button>
            </div>

            {verificationResult && (
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                verificationResult.valid ? 'bg-emerald-500/[0.06] border-emerald-500/30 text-emerald-500' : 'bg-red-500/[0.06] border-red-500/30 text-red-500'
              }`}>
                <div className="flex items-center gap-3">
                  <FileCheck className="h-6 w-6" />
                  <div>
                    <div className="font-semibold text-sm">
                      {verificationResult.valid ? "Prescription Authenticated & Valid On Polygon Blockchain" : "Invalid or Tampered Prescription Hash"}
                    </div>
                    {verificationResult.txHash && (
                      <div className="text-xs opacity-80">TxHash: {verificationResult.txHash}</div>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className={`rounded-lg ${verificationResult.valid ? 'border-emerald-500 text-emerald-500' : 'border-red-500 text-red-500'}`}>
                  {verificationResult.valid ? "VERIFIED" : "UNVERIFIED"}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Orders + Inventory ─── */}
      <motion.div
        className="grid gap-6 grid-cols-1 xl:grid-cols-2"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
      >
        {/* Orders Table */}
        <motion.div variants={fadeUp}>
          <Card className="rounded-2xl border border-border/60 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Pill className="h-5 w-5 text-amber-500" /> Prescriptions & Orders Queue
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/30 text-muted-foreground uppercase text-xs border-b border-border">
                    <tr>
                      <th className="px-6 py-3">Order ID</th>
                      <th className="px-6 py-3">Patient Name</th>
                      <th className="px-6 py-3">Medication</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs">{order.id.slice(0, 8)}...</td>
                        <td className="px-6 py-4 font-medium">{order.patient_name}</td>
                        <td className="px-6 py-4">{order.medication}</td>
                        <td className="px-6 py-4">
                          <Badge className={`rounded-lg ${
                            order.status === "DISPENSED" 
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          }`}>
                            {order.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {order.status === "PENDING" ? (
                            <Button 
                              size="sm" 
                              onClick={() => handleDispense(order.prescription_id, order.id)}
                              className="rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-medium h-8"
                            >
                              Dispense
                            </Button>
                          ) : order.status === "DISPENSED" ? (
                            <Button 
                              size="sm" 
                              onClick={() => handleDispatch(order.id)}
                              className="rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium h-8"
                            >
                              Dispatch
                            </Button>
                          ) : order.status === "OUT_FOR_DELIVERY" ? (
                            <span className="text-xs text-blue-500 font-semibold">Out for Delivery</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">{order.status}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Inventory Table */}
        <motion.div variants={fadeUp}>
          <Card className="rounded-2xl border border-border/60 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5 text-amber-500" /> Inventory List
              </CardTitle>
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-9 rounded-lg"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/30 text-muted-foreground uppercase text-xs border-b border-border">
                    <tr>
                      <th className="px-6 py-3">Medication Name</th>
                      <th className="px-6 py-3">Dosage</th>
                      <th className="px-6 py-3">Stock Units</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredInventory.slice(0, 10).map((item) => (
                      <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 font-semibold">{item.medication_name}</td>
                        <td className="px-6 py-4">{item.dosage}</td>
                        <td className="px-6 py-4">
                          <span className={item.stock < 100 ? "text-amber-500 font-bold" : ""}>
                            {item.stock} units
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* ─── Quick Access ─── */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {[
          { icon: Brain, title: "Pharmacy Pulse AI", desc: "Drug interaction checks & guidance", href: "/pharmacy/pulse-ai", color: "text-amber-500", bg: "bg-amber-500/10" },
          { icon: Package, title: "Full Inventory", desc: "Manage all pharmaceutical stock", href: "/pharmacy/inventory", color: "text-blue-500", bg: "bg-blue-500/10" },
          { icon: AlertTriangle, title: "Expiring Medicines", desc: "View items nearing expiration", href: "/pharmacy/expired", color: "text-red-500", bg: "bg-red-500/10" },
        ].map((item, i) => (
          <motion.div key={i} variants={fadeUp}>
            <Link href={item.href}>
              <Card className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:border-border/80 cursor-pointer">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.bg} transition-transform duration-300 group-hover:scale-110`}>
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {dispensingOrderId && (
        <div className="fixed bottom-4 right-4 z-50 w-[450px]">
          {orders.filter(o => o.id === dispensingOrderId).map(order => (
            <DeliveryMap 
              key={order.id}
              orderId={order.id}
              patientName={order.patient_name}
              patientAddress={order.patient_address || "Unknown Address"}
              pharmacyAddress="MedSync Pharmacy Node #882"
              onClose={() => setDispensingOrderId(null)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
