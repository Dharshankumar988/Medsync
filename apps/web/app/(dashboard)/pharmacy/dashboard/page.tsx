"use client";

import { useEffect, useState } from "react";
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
  TrendingUp
} from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Input } from "@medsync/ui";
import { pharmacyService, PharmacyInventoryItem, PharmacyOrder } from "@/services/pharmacy.service";
import { DeliveryMap } from "@/components/pharmacy/DeliveryMap";

export default function PharmacyDashboardPage() {
  const [inventory, setInventory] = useState<PharmacyInventoryItem[]>([]);
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [verificationInput, setVerificationInput] = useState("");
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean; txHash?: string } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [dispensingOrderId, setDispensingOrderId] = useState<string | null>(null);
  const [verifiedRxHash, setVerifiedRxHash] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [invData, orderData] = await Promise.all([
      pharmacyService.getInventory(),
      pharmacyService.getOrders()
    ]);
    setInventory(invData);
    setOrders(orderData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDispense = async (prescriptionId: string, orderId: string) => {
    // Pharmacy Dispensing Blocker Rule: Must be verified first!
    if (verificationResult?.valid && verificationInput.trim().includes(prescriptionId)) {
      await pharmacyService.dispensePrescription(prescriptionId);
      setOrders(prev => prev.map(o => o.prescription_id === prescriptionId ? { ...o, status: "DISPENSED" } : o));
      setDispensingOrderId(orderId);
    } else {
      alert("SECURITY BLOCK: You must scan and verify the QR code for this prescription before dispensing medication.");
    }
  };

  const handleVerifyPrescription = async () => {
    if (!verificationInput.trim()) return;
    setVerifying(true);
    const res = await pharmacyService.verifyBlockchainPrescription(verificationInput.trim());
    setVerificationResult(res);
    if (res.valid) {
      setVerifiedRxHash(verificationInput.trim());
    }
    setVerifying(false);
  };

  const filteredInventory = inventory.filter(item => 
    item.medication_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.dosage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingOrders = orders.filter(o => o.status === "PENDING").length;
  const dispensedOrders = orders.filter(o => o.status === "DISPENSED").length;

  return (
    <div className="space-y-6">
      {/* Header Banner with Role Theme Accent: Yellow (Amber) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="border-amber-500 text-amber-500 bg-amber-500/10 font-semibold px-3 py-1">
              Pharmacy Portal
            </Badge>
            <span className="text-xs text-muted-foreground">Authorized Node ID: PHARM-882</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-amber-500 dark:text-amber-400">
            Pharmacy Dispensing & Inventory Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Verify blockchain prescriptions, fulfill patient orders, and manage real-time drug stock.
          </p>
        </div>
        <Button onClick={loadData} variant="outline" className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh Data
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/60 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Fulfillments</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{pendingOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting verification & release</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dispensed Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dispensedOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully logged on-chain</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inventory Items</CardTitle>
            <Package className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Monitored pharmaceutical SKUs</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Alert</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">
              {inventory.filter(i => i.stock < 100).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Reorder threshold under 100 units</p>
          </CardContent>
        </Card>
      </div>

      {/* Blockchain Verification Tool */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-amber-500">
            <ShieldCheck className="h-5 w-5" /> Blockchain Prescription Integrity Verifier
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input 
              placeholder="Enter prescription hash, QR code string, or record ID (e.g. 0x89f2a71c...)"
              value={verificationInput}
              onChange={(e) => setVerificationInput(e.target.value)}
              className="flex-1 bg-background"
            />
            <Button 
              onClick={handleVerifyPrescription} 
              disabled={verifying}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              {verifying ? "Verifying On-Chain..." : "Verify Smart Contract Hash"}
            </Button>
          </div>

          {verificationResult && (
            <div className={`p-4 rounded-lg border flex items-center justify-between ${
              verificationResult.valid ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-red-500/10 border-red-500/30 text-red-500'
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
              <Badge variant="outline" className={verificationResult.valid ? 'border-emerald-500 text-emerald-500' : 'border-red-500 text-red-500'}>
                {verificationResult.valid ? "VERIFIED" : "UNVERIFIED"}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Pill className="h-5 w-5 text-amber-500" /> Prescriptions & Orders Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-xs border-b border-border">
                <tr>
                  <th className="px-6 py-3">Order ID</th>
                  <th className="px-6 py-3">Patient Name</th>
                  <th className="px-6 py-3">Medication</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">{order.id}</td>
                    <td className="px-6 py-4 font-medium">{order.patient_name}</td>
                    <td className="px-6 py-4">{order.medication}</td>
                    <td className="px-6 py-4">
                      <Badge className={
                        order.status === "DISPENSED" 
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      }>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {order.status === "PENDING" ? (
                        <Button 
                          size="sm" 
                          onClick={() => handleDispense(order.prescription_id, order.id)}
                          className="bg-amber-500 hover:bg-amber-600 text-black font-medium h-8"
                        >
                          Dispense
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Dispensed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-500" /> Pharmaceutical Inventory
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search inventory..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-xs border-b border-border">
                <tr>
                  <th className="px-6 py-3">Medication Name</th>
                  <th className="px-6 py-3">Dosage</th>
                  <th className="px-6 py-3">Stock Units</th>
                  <th className="px-6 py-3">Unit Price</th>
                  <th className="px-6 py-3">Expiry Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-semibold">{item.medication_name}</td>
                    <td className="px-6 py-4">{item.dosage}</td>
                    <td className="px-6 py-4">
                      <span className={item.stock < 100 ? "text-amber-500 font-bold" : ""}>
                        {item.stock} units
                      </span>
                    </td>
                    <td className="px-6 py-4">${item.unit_price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{item.expiry_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
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
