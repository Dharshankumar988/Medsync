"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button } from "@medsync/ui";
import { MapPin, Truck, Package, CheckCircle2, Navigation, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const DeliveryMap = dynamic(() => import("@/components/pharmacy/DeliveryMap").then(m => m.DeliveryMap), { ssr: false });
import { orderService } from "@/services/order.service";

export default function DeliveryTrackingPage({ params }: { params: Promise<{ orderId: string }> }) {
  const router = useRouter();
  const { orderId } = use(params);
  const [order, setOrder] = useState<any>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<"processing" | "out_for_delivery" | "arrived" | "delivered">("processing");
  const [progress, setProgress] = useState(0);
  const [deliveryCode, setDeliveryCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const { data } = await supabase.from('medicine_orders').select('*, pharmacies:pharmacy_id(full_name)').eq('id', orderId).single();
      if (data) {
        setOrder(data);
        if (data.status === "SHIPPED" || data.status === "OUT_FOR_DELIVERY") {
          setDeliveryStatus("out_for_delivery");
          startTrackingAnimation();
        } else if (data.status === "DELIVERED") {
          setDeliveryStatus("delivered");
          setProgress(100);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startTrackingAnimation = () => {
    // 10-minute slow-moving delivery animation (simulated here faster for demo, say 2 minutes)
    const durationMs = 120000;
    const intervalMs = 1000;
    const steps = durationMs / intervalMs;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const newProgress = Math.min((currentStep / steps) * 100, 100);
      setProgress(newProgress);
      if (newProgress >= 100) {
        setDeliveryStatus("arrived");
        clearInterval(interval);
      }
    }, intervalMs);
    
    return () => clearInterval(interval);
  };

  const handleOrderDelivered = async () => {
    setGeneratingCode(true);
    try {
      const res = await orderService.generateDeliveryCode(orderId as string);
      
      setDeliveryCode(res.data.otp);
      setDeliveryStatus("arrived");
      
    } catch (e) {
      console.error(e);
      alert("Failed to generate code.");
    } finally {
      setGeneratingCode(false);
    }
  };

  // Poll for delivery completion by driver
  useEffect(() => {
    if (deliveryCode && deliveryStatus === "arrived") {
      const interval = setInterval(async () => {
        const { data } = await supabase.from('medicine_orders').select('status').eq('id', orderId).single();
        if (data && data.status === "DELIVERED") {
          setDeliveryStatus("delivered");
          clearInterval(interval);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [deliveryCode, deliveryStatus, orderId]);

  if (!order) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-4 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Live Tracking</h1>
        <p className="text-muted-foreground">
          Order #{order.id.slice(0, 8).toUpperCase()} from {order.pharmacies?.full_name || "Pharmacy"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 rounded-2xl border border-border/60 overflow-hidden shadow-sm flex flex-col h-[600px]">
          <div className="bg-muted/20 p-4 border-b border-border/40 flex justify-between items-center">
            <div className="flex items-center gap-2 font-medium">
              <Navigation className="h-4 w-4 text-blue-500" />
              Delivery Progress
            </div>
            <div className="text-sm text-muted-foreground">Estimated arrival: ~10 mins</div>
          </div>
          
          <div className="flex-1 relative">
            <DeliveryMap 
              orderId={orderId as string}
              patientAddress="Patient Delivery Address"
              patientName={order?.patient_name || "Patient"}
              pharmacyAddress={order?.pharmacies?.full_name || "Pharmacy"}
              onClose={() => router.push("/patient/dashboard")}
            />
            {/* Overlay progress bar */}
            <div className="absolute top-4 left-4 right-4 bg-background/90 backdrop-blur border border-border/60 rounded-xl p-4 shadow-lg z-[1000]">
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span className={deliveryStatus === "processing" ? "text-blue-500" : "text-emerald-500"}>Processing</span>
                <span className={deliveryStatus === "out_for_delivery" ? "text-blue-500" : (progress === 100 ? "text-emerald-500" : "text-muted-foreground")}>Out for Delivery</span>
                <span className={deliveryStatus === "delivered" ? "text-emerald-500" : "text-muted-foreground"}>Delivered</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "linear", duration: 1 }}
                />
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-2xl border border-border/60">
            <CardHeader>
              <CardTitle>Delivery Action</CardTitle>
              <CardDescription>Confirm receipt with driver</CardDescription>
            </CardHeader>
            <CardContent>
              {deliveryStatus !== "delivered" ? (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-500/10 text-blue-600 rounded-xl border border-blue-500/20 text-sm">
                    When the driver arrives, press the button below to generate a secure confirmation code.
                  </div>
                  {!deliveryCode ? (
                    <Button 
                      className="w-full h-12 bg-blue-600 hover:bg-blue-500"
                      onClick={handleOrderDelivered}
                      disabled={generatingCode || deliveryStatus === 'processing'}
                    >
                      {generatingCode ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Package className="h-4 w-4 mr-2" />}
                      Driver has arrived
                    </Button>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-4 text-center"
                    >
                      <h3 className="font-bold text-lg">Provide this code to driver</h3>
                      <p className="text-sm text-muted-foreground">The driver needs this code to validate the delivery in their app.</p>
                      
                      <div className="bg-muted p-6 rounded-2xl mt-4 border border-border/50">
                        <div className="text-4xl font-mono font-bold tracking-[0.25em] text-foreground">
                          {deliveryCode}
                        </div>
                      </div>
                      
                      <p className="text-xs text-amber-500 font-medium flex items-center justify-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Waiting for driver validation
                      </p>
                    </motion.div>
                  )}
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4 text-center"
                >
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/10 mb-2">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h3 className="font-bold text-lg text-emerald-600">Delivery Completed</h3>
                  <p className="text-sm text-muted-foreground">Thank you for using MedSync network pharmacies.</p>
                </motion.div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border/60">
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between py-2 border-b border-border/40">
                <span className="text-muted-foreground">Pharmacy</span>
                <span className="font-medium">{order.pharmacies?.full_name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/40">
                <span className="text-muted-foreground">Items</span>
                <span className="font-medium">{order.medication}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Total Paid</span>
                <span className="font-medium">${order.total_amount}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
