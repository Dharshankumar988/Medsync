"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input } from "@medsync/ui";
import { ShieldCheck, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { orderService } from "@/services/order.service";

export default function DeliveryConfirmationPage() {
  const router = useRouter();
  const [orderId, setOrderId] = useState("");
  const [deliveryCode, setDeliveryCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleVerify = async () => {
    if (!orderId || !deliveryCode) return;
    setLoading(true);
    setStatus("idle");

    try {
      const res = await orderService.verifyDelivery(orderId, deliveryCode);
      
      setStatus("success");
      setOrderId("");
      setDeliveryCode("");

      setTimeout(() => {
        setStatus("idle");
      }, 5000);

    } catch (e: any) {
      console.error(e);
      setStatus("error");
      setErrorMsg(e.message || "Failed to verify delivery code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pt-10 pb-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Driver Validation</h1>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Enter the order ID and the 4-digit code provided by the patient to confirm delivery.
        </p>
      </div>

      <Card className="rounded-2xl border-blue-500/30 shadow-lg border-2 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] to-transparent pointer-events-none" />
        <CardHeader className="text-center pb-4 bg-blue-500/5">
          <ShieldCheck className="h-10 w-10 text-blue-500 mx-auto mb-2" />
          <CardTitle>Verify Delivery Code</CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-6 relative z-10">
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Order ID</label>
              <Input 
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000" 
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="h-12 rounded-xl bg-background"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">4-Digit Patient Code</label>
              <Input 
                placeholder="----" 
                value={deliveryCode}
                onChange={(e) => setDeliveryCode(e.target.value)}
                maxLength={4}
                className="h-16 rounded-xl bg-muted/50 text-center text-3xl font-mono tracking-[0.5em] font-bold"
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {status === "error" && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20"
              >
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{errorMsg}</p>
              </motion.div>
            )}
            
            {status === "success" && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 text-sm text-emerald-500 bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20"
              >
                <CheckCircle2 className="h-6 w-6 shrink-0" />
                <div>
                  <p className="font-semibold text-base">Validation Successful</p>
                  <p className="opacity-90">The order has been marked as DELIVERED securely.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <Button 
            className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-base rounded-xl font-semibold"
            onClick={handleVerify}
            disabled={!orderId || deliveryCode.length < 4 || loading}
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
            {loading ? "Verifying..." : "Confirm Delivery"}
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}
