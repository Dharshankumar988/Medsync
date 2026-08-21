"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Skeleton } from "@medsync/ui";
import { ShoppingBag, Truck, CheckCircle2, AlertCircle, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import Link from "next/link";

export default function OrdersPage() {
  const [userId, setUserId] = useState<string>("");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    
    async function loadOrders() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("medicine_orders")
          .select(`*`)
          .eq("patient_id", userId)
          .order("created_at", { ascending: false });
          
        if (data) {
          const pharmacyIds = [...new Set(data.map(o => o.pharmacy_id))];
          const { data: pharmData } = await supabase
            .from("pharmacies")
            .select("*")
            .in("user_id", pharmacyIds);
            
          const pharmMap = (pharmData || []).reduce((acc: any, p: any) => {
            acc[p.user_id] = p;
            return acc;
          }, {});
          
          const mapped = data.map(o => ({
            ...o,
            pharmacy: pharmMap[o.pharmacy_id]
          }));
          
          setOrders(mapped);
        }
      } catch (err) {
        console.error("Error loading orders", err);
      } finally {
        setLoading(false);
      }
    }
    
    loadOrders();
  }, [userId]);

  const getStatusColor = (status: string) => {
    switch(status.toUpperCase()) {
      case 'DELIVERED': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'SHIPPED':
      case 'OUT_FOR_DELIVERY': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'CANCELLED': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'; // PENDING, PROCESSING
    }
  };

  return (
    <div className="relative space-y-8 pb-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-widest uppercase text-blue-500 mb-2">My Health</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
            Medicine Orders
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md leading-relaxed">
            Track your ongoing deliveries and view past orders.
          </p>
        </div>
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
            <p className="text-sm text-muted-foreground">You haven't placed any medicine orders yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <Card key={order.id} className="group overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-all hover:shadow-md">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-4">
                  <div className="flex items-start gap-4">
                    <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
                      <ShoppingBag className="h-6 w-6 text-orange-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{order.pharmacy?.business_name || 'Unknown Pharmacy'}</h3>
                        <Badge variant="outline" className={getStatusColor(order.status)}>
                          {order.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">Order ID: {order.id.slice(0,8).toUpperCase()}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()} • ${order.total_amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3">
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                      <Link href={`/patient/tracking/${order.id}`}>
                        <Truck className="mr-2 h-4 w-4" /> Track Order
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
