"use client";

import { useEffect, useState, Component, ErrorInfo, ReactNode } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button } from "@medsync/ui";
import { MapPin, Truck, Package, CheckCircle2, Navigation, Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { toast } from "sonner";

const DeliveryMap = dynamic(() => import("@/components/pharmacy/DeliveryMap").then(m => m.DeliveryMap), { 
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full flex items-center justify-center bg-muted/20 rounded-xl">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  )
});

// Error boundary to catch any map/Leaflet rendering errors gracefully
class TrackingErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Tracking map error caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[400px] w-full flex flex-col items-center justify-center bg-muted/20 rounded-xl p-6 text-center">
          <Truck className="h-10 w-10 text-primary mb-2 animate-bounce" />
          <p className="font-semibold text-foreground">Live Route Updating</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Your rider is en route to your location. Progress will refresh automatically.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function DeliveryTrackingPage() {
  const router = useRouter();
  const routeParams = useParams();
  const orderId = (routeParams?.orderId as string) || "";

  const [order, setOrder] = useState<any>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<"processing" | "out_for_delivery" | "arrived" | "delivered">("processing");
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // 1. Try fetching directly via backend API
      try {
        const res = await api.get(`/api/v1/orders/${orderId}`);
        if (res.data?.data) {
          const data = res.data.data;
          setOrder(data);
          syncStatus(data);
          setLoading(false);
          return;
        }
      } catch (apiErr) {
        // Fallback to orders list
      }

      // 2. Try fetching from user's order list
      try {
        const resList = await api.get('/api/v1/orders/');
        const list = resList.data?.data || [];
        const found = list.find((o: any) => o.id === orderId);
        if (found) {
          found.pharmacies = { full_name: found.pharmacy?.business_name || "Partner Pharmacy" };
          setOrder(found);
          syncStatus(found);
          setLoading(false);
          return;
        }
      } catch (listErr) {
        // Fallback to Supabase
      }

      // 3. Fallback to Supabase direct query
      const { data, error } = await supabase.from('medicine_orders').select('*').eq('id', orderId).maybeSingle();
      if (data) {
        if (data.pharmacy_id) {
          const { data: pharm } = await supabase.from('pharmacies').select('business_name').eq('user_id', data.pharmacy_id).maybeSingle();
          data.pharmacies = { full_name: pharm?.business_name || 'Partner Pharmacy' };
        } else {
          data.pharmacies = { full_name: 'Partner Pharmacy' };
        }
        setOrder(data);
        syncStatus(data);
      } else {
        setErrorMessage("Order details could not be found or you may not have permission to view it.");
      }
    } catch (e: any) {
      console.error("Failed to load order for tracking:", e);
      setErrorMessage("Could not load tracking details at this time.");
    } finally {
      setLoading(false);
    }
  };

  const syncStatus = (data: any) => {
    const st = (data.status || "").toUpperCase();
    if (st === "SHIPPED" || st === "OUT_FOR_DELIVERY" || st === "DISPENSED" || st === "PROCESSING" || st === "ACCEPTED") {
      setDeliveryStatus("out_for_delivery");
      startTrackingAnimation(data.updated_at || data.created_at);
    } else if (st === "DELIVERED") {
      setDeliveryStatus("delivered");
      setProgress(100);
    } else {
      setDeliveryStatus("processing");
      setProgress(15);
    }
  };

  const startTrackingAnimation = (updatedAtStr: string) => {
    const updatedAt = new Date(updatedAtStr || Date.now()).getTime();
    const durationMs = 10 * 60 * 1000;
    const intervalMs = 1000;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.max(0, now - updatedAt);
      const newProgress = Math.min((elapsed / durationMs) * 100, 100);
      setProgress(newProgress);
      if (newProgress >= 100) {
        setDeliveryStatus("arrived");
        clearInterval(interval);
      }
    }, intervalMs);
    
    return () => clearInterval(interval);
  };

  // Poll for delivery completion
  useEffect(() => {
    if (deliveryStatus === "arrived" || deliveryStatus === "out_for_delivery") {
      const interval = setInterval(async () => {
        try {
          const res = await api.get(`/api/v1/orders/${orderId}`);
          if (res.data?.data?.status === "DELIVERED") {
            setDeliveryStatus("delivered");
            setProgress(100);
            clearInterval(interval);
          }
        } catch {
          // Ignore polling errors
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [deliveryStatus, orderId]);

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Connecting to live delivery feed...</p>
      </div>
    );
  }

  if (errorMessage || !order) {
    return (
      <div className="max-w-md mx-auto p-8 text-center space-y-4 pt-12">
        <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto text-amber-500">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold">Tracking Unavailable</h2>
        <p className="text-sm text-muted-foreground">
          {errorMessage || "We could not find the tracking details for this order."}
        </p>
        <Button asChild className="rounded-xl">
          <Link href="/patient/orders">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Orders
          </Link>
        </Button>
      </div>
    );
  }

  const deliveryLat = typeof order.delivery_latitude === "number" ? order.delivery_latitude : 12.9229;
  const deliveryLng = typeof order.delivery_longitude === "number" ? order.delivery_longitude : 77.6175;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-2 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button asChild variant="ghost" size="sm" className="h-8 px-2 -ml-2 text-muted-foreground hover:text-foreground">
              <Link href="/patient/orders">
                <ArrowLeft className="h-4 w-4 mr-1" /> Orders
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground font-mono">
              #{order.id?.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Live Order Tracking
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Dispensed from {order.pharmacies?.full_name || "Partner Pharmacy"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 rounded-2xl border border-border/60 overflow-hidden shadow-sm flex flex-col h-[560px]">
          <div className="bg-muted/20 p-4 border-b border-border/40 flex justify-between items-center">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Navigation className="h-4 w-4 text-primary" />
              Delivery Route
            </div>
            <div className="text-xs text-muted-foreground font-medium">Estimated arrival: ~10 mins</div>
          </div>
          
          <div className="flex-1 relative">
            <TrackingErrorBoundary>
              <DeliveryMap 
                orderId={orderId}
                patientAddress={order?.delivery_address || "Delivery Address"}
                patientName={order?.patient_name || "Patient"}
                pharmacyAddress={order?.pharmacies?.full_name || "Pharmacy"}
                pharmacyId={order?.pharmacy_id}
                deliveryLat={deliveryLat}
                deliveryLng={deliveryLng}
                updatedAt={order?.updated_at || order?.created_at}
                onClose={() => router.push("/patient/orders")}
                hideCardContainer={true}
              />
            </TrackingErrorBoundary>

            {/* Overlay progress bar */}
            <div className="absolute top-4 left-4 right-4 bg-background/95 backdrop-blur border border-border/60 rounded-xl p-3.5 shadow-lg z-[1000]">
              <div className="flex justify-between text-xs font-semibold mb-2">
                <span className={deliveryStatus === "processing" ? "text-primary" : "text-emerald-500"}>Processing</span>
                <span className={deliveryStatus === "out_for_delivery" ? "text-primary" : (progress === 100 ? "text-emerald-500" : "text-muted-foreground")}>Out for Delivery</span>
                <span className={deliveryStatus === "delivered" ? "text-emerald-500" : "text-muted-foreground"}>Delivered</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "linear", duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-2xl border border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Delivery Status</CardTitle>
              <CardDescription className="text-xs">Driver tracking & arrival</CardDescription>
            </CardHeader>
            <CardContent>
              {deliveryStatus !== "delivered" ? (
                <div className="space-y-4">
                  <div className="p-3.5 bg-primary/10 text-primary rounded-xl border border-primary/20 text-xs leading-relaxed">
                    Your order is active! Our delivery courier is currently dispatching your medications.
                  </div>
                  <p className="text-xs text-amber-500 font-medium flex items-center justify-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> In transit to delivery address
                  </p>

                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm"
                    onClick={async () => {
                      try {
                        try {
                          await api.post(`/api/v1/delivery/tracking/${orderId}/confirm-received`);
                        } catch {
                          await api.post(`/api/v1/orders/${orderId}/complete-delivery`);
                        }
                        setDeliveryStatus("delivered");
                        setProgress(100);
                        toast.success("Package receipt confirmed! Order marked as Delivered.");
                      } catch (err: any) {
                        toast.error("Could not confirm receipt: " + (err.response?.data?.detail || err.message));
                      }
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    I Have Received the Package
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 text-center py-2">
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10 mb-1">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  </div>
                  <h3 className="font-bold text-base text-emerald-600">Delivery Completed</h3>
                  <p className="text-xs text-muted-foreground">Medicines handed over at destination.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Pharmacy</span>
                <span className="font-medium text-right">{order.pharmacies?.full_name || "Partner Pharmacy"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Medications</span>
                <span className="font-medium text-right max-w-[180px] truncate">{order.medication || "Prescription Medicines"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Delivery To</span>
                <span className="font-medium text-right max-w-[180px] truncate">{order.delivery_address || "Bangalore Central"}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground font-semibold">Total Amount</span>
                <span className="font-bold text-sm text-foreground font-mono">
                  ₹{Number(order.total_amount || 0).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
