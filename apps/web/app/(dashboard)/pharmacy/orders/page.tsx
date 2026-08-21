"use client";

import { useEffect, useState, useMemo } from "react";
import { pharmacyService, PharmacyOrder } from "@/services/pharmacy.service";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input } from "@medsync/ui";
import { Search, ShoppingBag, Truck, CheckCircle, PackageSearch, AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";

const DeliveryMap = dynamic(() => import("@/components/pharmacy/DeliveryMap").then(m => m.DeliveryMap), { ssr: false });

export default function PharmacyOrdersPage() {
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "DISPENSED" | "OUT_FOR_DELIVERY" | "DELIVERED">("ALL");
  const [dispensingOrderId, setDispensingOrderId] = useState<string | null>(null);

  useEffect(() => {
    pharmacyService.getOrders().then(data => {
      setOrders(data);
      setLoading(false);
    });
  }, []);

  const handleDispatch = async (orderId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/orders/${orderId}/dispatch`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Order dispatched! Simulation started. OTP: ${data.data.otp}`);
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "OUT_FOR_DELIVERY" } : o));
      } else {
        alert("Failed to dispatch order.");
      }
    } catch (e) {
      alert("Error dispatching order.");
    }
  };

  const filteredOrders = useMemo(() => {
    let filtered = orders;
    if (activeTab !== "ALL") {
      filtered = filtered.filter(o => o.status === activeTab);
    }
    if (searchQuery) {
      filtered = filtered.filter(o => 
        o.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.medication.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  }, [orders, activeTab, searchQuery]);

  if (loading) {
    return <div className="p-8 flex items-center justify-center h-[50vh]"><div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-8 pb-12 relative">
      <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/[0.04] rounded-full blur-[100px]" />
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Orders & Delivery</h1>
        <p className="text-muted-foreground">Manage fulfillments, track dispatches, and review order history.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex bg-muted/50 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          {["ALL", "PENDING", "DISPENSED", "OUT_FOR_DELIVERY", "DELIVERED"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <Card className="border-dashed bg-transparent border-2 shadow-none">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
              <ShoppingBag className="h-6 w-6 text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No active orders</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              We couldn&apos;t find any orders matching your current filters. Check back later or adjust your search.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredOrders.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="overflow-hidden rounded-2xl border-border/60 hover:border-amber-500/30 transition-colors group">
                <CardHeader className="bg-muted/20 pb-4 border-b border-border/40">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="font-mono text-[10px] uppercase">{order.id.slice(0, 8)}</Badge>
                    <Badge className={`
                      ${order.status === "PENDING" ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20" : ""}
                      ${order.status === "DISPENSED" ? "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" : ""}
                      ${order.status === "OUT_FOR_DELIVERY" ? "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20" : ""}
                      ${order.status === "DELIVERED" ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : ""}
                    `}>
                      {order.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{order.patient_name}</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Items</span>
                    <p className="text-sm line-clamp-2">{order.medication}</p>
                  </div>
                  
                  {order.patient_address && (
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Destination</span>
                      <p className="text-sm line-clamp-2 text-muted-foreground">{order.patient_address}</p>
                    </div>
                  )}

                  <div className="pt-2">
                    {order.status === "PENDING" && (
                      <Button variant="outline" className="w-full text-amber-600 border-amber-500/30 hover:bg-amber-500/10" onClick={() => window.location.href='/pharmacy/dashboard'}>
                        Go to Dashboard to Verify & Dispense
                      </Button>
                    )}
                    {order.status === "DISPENSED" && (
                      <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white" onClick={() => handleDispatch(order.id)}>
                        <Truck className="h-4 w-4 mr-2" /> Dispatch Order
                      </Button>
                    )}
                    {order.status === "OUT_FOR_DELIVERY" && (
                      <Button variant="outline" className="w-full border-purple-500/30 text-purple-600 hover:bg-purple-500/10" onClick={() => setDispensingOrderId(order.id)}>
                        <Truck className="h-4 w-4 mr-2" /> Track Delivery Map
                      </Button>
                    )}
                    {order.status === "DELIVERED" && (
                      <Button variant="outline" className="w-full border-emerald-500/30 text-emerald-600 bg-emerald-500/5 cursor-default pointer-events-none">
                        <CheckCircle className="h-4 w-4 mr-2" /> Delivery Completed
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

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
