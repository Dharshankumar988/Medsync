"use client";

import { useEffect, useState } from "react";
import { pharmacyService } from "@/services/pharmacy.service";
import { Card, CardHeader, CardTitle, CardContent } from "@medsync/ui";
import { TrendingUp, Package, Clock, Truck, CheckCircle2, BarChart3, PieChart as PieIcon } from "lucide-react";
import { motion } from "framer-motion";

export default function PharmacyAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pharmacyService.getAnalytics().then(data => {
      setAnalytics(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8 flex items-center justify-center h-[50vh]"><div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" /></div>;
  }

  if (!analytics) {
    return (
      <div className="space-y-8 pb-12">
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <Card className="p-8 text-center text-muted-foreground border-dashed bg-transparent shadow-none border-2">
          Analytics data is currently unavailable.
        </Card>
      </div>
    );
  }

  const orderStats = [
    { name: "Pending", value: Number(analytics.pending_orders) || 0, color: "bg-amber-500", text: "text-amber-500" },
    { name: "Dispensed", value: Number(analytics.dispensed_orders) || 0, color: "bg-blue-500", text: "text-blue-500" },
    { name: "Delivered", value: Number(analytics.delivered_orders) || 0, color: "bg-emerald-500", text: "text-emerald-500" },
  ];

  const totalOrders = Math.max(Number(analytics.total_orders) || 1, 1);

  const summaryCards = [
    { title: "Total Orders", value: analytics.total_orders, icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Active Inventory", value: analytics.inventory_count, icon: Package, color: "text-amber-500", bg: "bg-amber-500/10" },
    { title: "Pending Fulfillments", value: analytics.pending_orders, icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
    { title: "Completed Deliveries", value: analytics.delivered_orders, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  return (
    <div className="space-y-8 pb-12 relative">
      <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/[0.03] rounded-full blur-[100px]" />
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Performance Analytics</h1>
        <p className="text-muted-foreground">Monitor order volume, fulfillment rates, and operational efficiency.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="rounded-2xl border-border/60 bg-card/50 hover:bg-card/80 transition-colors group">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${card.bg} group-hover:scale-110 transition-transform`}>
                    <card.icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                    <h3 className="text-2xl font-bold">{card.value}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="rounded-2xl border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Order Status Distribution</CardTitle>
              <PieIcon className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="space-y-4">
                {orderStats.map(stat => {
                  const pct = Math.round((stat.value / totalOrders) * 100);
                  return (
                    <div key={stat.name} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{stat.name}</span>
                        <span className="text-muted-foreground">{stat.value} ({pct}%)</span>
                      </div>
                      <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full ${stat.color} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-center gap-6 pt-2 border-t border-border/40">
                {orderStats.map(stat => (
                  <div key={stat.name} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${stat.color}`} />
                    <span className="text-xs text-muted-foreground">{stat.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="rounded-2xl border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Fulfillment Volumes</CardTitle>
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-end justify-around h-[220px] pt-8 px-4 border-b border-border/40">
                {orderStats.map(stat => {
                  const maxVal = Math.max(...orderStats.map(s => s.value), 1);
                  const heightPct = Math.max(Math.round((stat.value / maxVal) * 160), 12);
                  return (
                    <div key={stat.name} className="flex flex-col items-center gap-2 w-16">
                      <span className="text-xs font-semibold">{stat.value}</span>
                      <div
                        className={`w-12 ${stat.color} rounded-t-lg transition-all duration-500 hover:opacity-85`}
                        style={{ height: `${heightPct}px` }}
                      />
                      <span className="text-xs text-muted-foreground">{stat.name}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-center text-muted-foreground mt-4">
                Real-time pharmacy fulfillment breakdown across lifecycle stages.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
