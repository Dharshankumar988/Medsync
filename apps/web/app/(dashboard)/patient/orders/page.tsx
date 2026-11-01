"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Skeleton, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@medsync/ui";
import { ShoppingBag, Truck, CheckCircle2, AlertCircle, ChevronRight, Plus, CreditCard, Banknote, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import { orderService } from "@/services/order.service";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";

export default function OrdersPage() {
  const [userId, setUserId] = useState<string>("" );
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Payment Modal State
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "CASH_ON_DELIVERY">("ONLINE");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      // 1. Fetch from backend API
      const apiOrders = await orderService.getOrders();
      let mergedOrders: any[] = Array.isArray(apiOrders) ? [...apiOrders] : [];

      // 2. Fetch directly from Supabase medicine_orders if available
      try {
        const { data: sbOrders } = await supabase
          .from("medicine_orders")
          .select("*, pharmacies:pharmacy_id(business_name, full_name, address)")
          .eq("patient_id", userId)
          .order("created_at", { ascending: false });

        if (sbOrders && sbOrders.length > 0) {
          const existingIds = new Set(mergedOrders.map(o => o.id));
          for (const s of sbOrders) {
            if (!existingIds.has(s.id)) {
              mergedOrders.push(s);
              existingIds.add(s.id);
            }
          }
        }
      } catch (sbErr) {
        console.warn("Supabase medicine_orders notice:", sbErr);
      }

      // 3. Fetch dispensing logs (prescriptions dispensed & delivered to this patient)
      try {
        const { data: dispLogs } = await supabase
          .from("prescription_dispensing_logs")
          .select("*")
          .eq("patient_id", userId)
          .order("created_at", { ascending: false });

        if (dispLogs && dispLogs.length > 0) {
          const existingPrescriptionIds = new Set(mergedOrders.map(o => o.prescription_id).filter(Boolean));
          for (const log of dispLogs) {
            if (!existingPrescriptionIds.has(log.prescription_id)) {
              mergedOrders.push({
                id: log.id,
                prescription_id: log.prescription_id,
                pharmacy_id: log.pharmacy_id,
                status: log.delivery_status || "DELIVERED",
                created_at: log.dispensed_at || log.created_at || log.delivery_started_at,
                total_amount: 45.00,
                delivery_address: log.delivery_route?.destination || "Registered Patient Address",
                pharmacy: {
                  business_name: log.dispensed_by_name || "Wellness Pharmacy (Network)"
                },
                medication: Array.isArray(log.medicines_dispensed) 
                  ? log.medicines_dispensed.map((m: any) => `${m.medicine_name || m.name} (${m.dosage || '1 dose'})`).join(", ")
                  : "Prescription Medicines"
              });
              existingPrescriptionIds.add(log.prescription_id);
            }
          }
        }
      } catch (logErr) {
        console.warn("Supabase prescription_dispensing_logs notice:", logErr);
      }

      // 4. Also fetch active delivery tracking items
      try {
        const activeRes = await (api as any).get('/api/v1/delivery/tracking/active', { noCache: true });
        const activeList = activeRes.data?.data || activeRes.data;
        if (Array.isArray(activeList)) {
          const existingIds = new Set(mergedOrders.map(o => o.id));
          for (const item of activeList) {
            const itemKey = item.order_id || item.dispensing_log_id || item.prescription_id;
            if (!existingIds.has(itemKey)) {
              mergedOrders.unshift({
                id: itemKey,
                prescription_id: item.prescription_id,
                pharmacy_id: item.pharmacy_id,
                status: item.delivery_status || "DISPATCHED",
                created_at: item.delivery_started_at || new Date().toISOString(),
                total_amount: 45.00,
                delivery_address: "Your Delivery Location",
                pharmacy: { business_name: item.pharmacy_name || "Wellness Pharmacy (Network)" },
                medication: "Prescription Medication Delivery"
              });
              existingIds.add(itemKey);
            }
          }
        }
      } catch (activeErr) {
        console.warn("Active deliveries fetch notice:", activeErr);
      }

      // Sort by created_at desc
      mergedOrders.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setOrders(mergedOrders);
    } catch (err) {
      console.error("Error loading orders", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    loadOrders();
  }, [userId]);

  const getStatusColor = (status: string) => {
    switch((status || "").toUpperCase()) {
      case 'DELIVERED': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'SHIPPED':
      case 'OUT_FOR_DELIVERY': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'ACCEPTED':
      case 'PROCESSING': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'CANCELLED': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-amber-500/10 text-amber-600 border-amber-500/20'; // PENDING
    }
  };

  const handleOpenPayment = (order: any) => {
    setSelectedOrder(order);
    setPaymentMethod("ONLINE");
  };

  const handleConfirmPayment = async () => {
    if (!selectedOrder) return;
    setIsProcessingPayment(true);
    try {
      await orderService.payOrder(selectedOrder.id, paymentMethod);
      if (paymentMethod === "CASH_ON_DELIVERY") {
        toast.success("Order confirmed with Cash on Delivery (COD)!");
      } else {
        toast.success("Payment completed successfully!");
      }
      setSelectedOrder(null);
      // Reload orders list
      await loadOrders();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || err.message || "Payment process could not be completed.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="relative space-y-8 pb-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-widest uppercase text-primary mb-2">My Health</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
            Medicine Orders
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md leading-relaxed">
            Track your ongoing deliveries and view past prescription orders.
          </p>
        </div>
        <Button asChild className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shrink-0">
          <Link href="/patient/prescriptions">
            <Plus className="mr-2 h-4 w-4" /> Order from Prescriptions
          </Link>
        </Button>
      </motion.div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
      ) : orders.length === 0 ? (
        <Card className="rounded-2xl border border-dashed bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No orders found</p>
            <p className="text-sm text-muted-foreground">You haven&apos;t placed any medicine orders yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const isPending = (order.status || "").toUpperCase() === 'PENDING';
            const totalVal = Number(order.total_amount != null ? order.total_amount : 0);
            const dateStr = order.created_at ? new Date(order.created_at).toLocaleDateString() : "Recent";
            const orderIdShort = (order.id || "").slice(0, 8).toUpperCase();
            const pharmacyName = order.pharmacy?.business_name || order.pharmacies?.full_name || "Wellness Pharmacy (Network)";

            return (
              <Card key={order.id} className="group overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-all hover:shadow-md">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-4">
                    <div className="flex items-start gap-4">
                      <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <ShoppingBag className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-foreground">{pharmacyName}</h3>
                          <Badge variant="outline" className={getStatusColor(order.status)}>
                            {(order.status || "PENDING").replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mb-1">Order ID: #{orderIdShort}</p>
                        <p className="text-sm text-muted-foreground">
                          {dateStr} • <span className="font-semibold text-foreground font-mono">₹{totalVal.toFixed(2)}</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      {isPending ? (
                        <Button 
                          onClick={() => handleOpenPayment(order)} 
                          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-sm"
                        >
                          <CreditCard className="w-4 h-4 mr-2" /> Pay / Choose COD
                        </Button>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-semibold self-start sm:self-center">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed & Paid
                        </div>
                      )}
                      
                      {['OUT_FOR_DELIVERY', 'SHIPPED', 'DISPATCHED', 'IN_TRANSIT'].includes((order.status || '').toUpperCase()) && (
                        <Button 
                          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-xs shadow-sm"
                          onClick={async () => {
                            try {
                              try {
                                await api.post(`/api/v1/delivery/tracking/${order.id}/confirm-received`);
                              } catch {
                                await api.post(`/api/v1/orders/${order.id}/complete-delivery`);
                              }
                              toast.success("Package receipt confirmed! Order marked as Delivered.");
                              loadOrders();
                            } catch (e: any) {
                              toast.error("Could not confirm receipt: " + (e.response?.data?.detail || e.message));
                            }
                          }}
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Received Package
                        </Button>
                      )}

                      <Button asChild variant="outline" className="w-full sm:w-auto rounded-xl text-xs">
                        <Link href={`/patient/tracking/${order.id}`}>
                          <Truck className="mr-2 h-3.5 w-3.5" /> Track Order
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Payment & COD Modal */}
      <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}>
        <DialogContent className="sm:max-w-md bg-card border border-border/80 rounded-2xl shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <CreditCard className="w-5 h-5 text-primary" /> Complete Payment & Order
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Choose how you would like to pay for Order #{selectedOrder?.id?.slice(0, 8).toUpperCase()}.
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-5 pt-2">
              <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Pharmacy</span>
                  <span className="font-medium text-foreground">{selectedOrder.pharmacy?.business_name || selectedOrder.pharmacies?.full_name || "Network Pharmacy"}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Delivery Point</span>
                  <span className="font-medium text-foreground max-w-[200px] truncate">{selectedOrder.delivery_address || "Default Address"}</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-border/40">
                  <span>Total Amount</span>
                  <span className="text-primary font-mono">₹{Number(selectedOrder.total_amount || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Payment Method</label>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("ONLINE")}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
                      paymentMethod === "ONLINE"
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30"
                        : "border-border/60 hover:bg-muted/30 text-muted-foreground"
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-bold text-xs text-foreground">Pay Online</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">UPI, Cards, NetBanking</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CASH_ON_DELIVERY")}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
                      paymentMethod === "CASH_ON_DELIVERY"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 ring-2 ring-emerald-500/30"
                        : "border-border/60 hover:bg-muted/30 text-muted-foreground"
                    }`}
                  >
                    <Banknote className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-bold text-xs text-foreground">Cash on Delivery</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Pay cash to delivery driver</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl h-11"
                  onClick={() => setSelectedOrder(null)}
                  disabled={isProcessingPayment}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmPayment}
                  className="flex-1 rounded-xl h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  disabled={isProcessingPayment}
                >
                  {isProcessingPayment ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : paymentMethod === "CASH_ON_DELIVERY" ? (
                    <Banknote className="w-4 h-4 mr-2" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 mr-2" />
                  )}
                  {paymentMethod === "CASH_ON_DELIVERY" ? "Confirm COD Order" : "Pay & Confirm"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
