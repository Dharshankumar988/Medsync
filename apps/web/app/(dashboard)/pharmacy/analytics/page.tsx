"use client";

import { useEffect, useState } from "react";
import { pharmacyService } from "@/services/pharmacy.service";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@medsync/ui";
import { 
  TrendingUp, Package, Clock, Truck, CheckCircle2, BarChart3, 
  PieChart as PieIcon, Download, Loader2, DollarSign, Store,
  FileSpreadsheet, ShieldCheck, ArrowUpRight
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";

export default function PharmacyAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    pharmacyService.getAnalytics().then(data => {
      setAnalytics(data);
      setLoading(false);
    });
  }, []);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    toast.info("Generating Weekly Sales Report PDF...");
    try {
      const success = await pharmacyService.downloadWeeklySalesReport();
      if (success) {
        toast.success("Weekly Sales Report PDF downloaded successfully!");
      } else {
        toast.error("Failed to generate PDF report. Please try again.");
      }
    } catch {
      toast.error("An error occurred while downloading the sales report.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-[50vh]">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
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

  const totalSales = Number(analytics.total_sales || 0);
  const totalProfit = Number(analytics.total_profit || 0);
  const weeklySales = Number(analytics.weekly_sales || 0);
  const weeklyProfit = Number(analytics.weekly_profit || 0);
  const receivedByPatient = Number(analytics.received_by_patient_orders || 0);
  const dispensedDelivered = Number(analytics.dispensed_delivered_orders || 0);
  const profitMargin = analytics.profit_margin_pct ?? 30.0;

  const orderStats = [
    { name: "Received by Patient", value: receivedByPatient, color: "bg-emerald-500", text: "text-emerald-500" },
    { name: "Dispensed & Delivered", value: dispensedDelivered, color: "bg-blue-500", text: "text-blue-500" },
    { name: "Pending", value: Number(analytics.pending_orders) || 0, color: "bg-amber-500", text: "text-amber-500" },
  ];

  const totalOrders = Math.max(Number(analytics.total_orders) || 1, 1);

  const financialCards = [
    { 
      title: "Total Sales Revenue", 
      value: `$${totalSales.toFixed(2)}`, 
      subtext: `+$${weeklySales.toFixed(2)} in past 7 days`,
      icon: DollarSign, 
      color: "text-blue-500", 
      bg: "bg-blue-500/10" 
    },
    { 
      title: "Gross Profit Recorded", 
      value: `$${totalProfit.toFixed(2)}`, 
      subtext: `${profitMargin}% average profit margin`,
      icon: TrendingUp, 
      color: "text-emerald-500", 
      bg: "bg-emerald-500/10" 
    },
    { 
      title: "Received by Patient", 
      value: receivedByPatient, 
      subtext: "In-store counter pick-ups",
      icon: Store, 
      color: "text-emerald-500", 
      bg: "bg-emerald-500/10" 
    },
    { 
      title: "Dispensed & Delivered", 
      value: dispensedDelivered, 
      subtext: "Dispatched home courier deliveries",
      icon: Truck, 
      color: "text-amber-500", 
      bg: "bg-amber-500/10" 
    },
  ];

  const dailyStats = analytics.daily_stats || [];

  return (
    <div className="space-y-8 pb-12 relative">
      <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/[0.03] rounded-full blur-[100px]" />
      
      {/* Page Header with Download Weekly PDF Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Performance & Sales Analytics</h1>
          <p className="text-muted-foreground text-sm">
            Monitor real-time pharmacy revenue, medicine inventory movements, and fulfillment performance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="rounded-xl h-11 px-4 bg-amber-600 hover:bg-amber-500 text-white shadow-md font-semibold gap-2"
          >
            {downloadingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Download Weekly Sales Report (PDF)</span>
          </Button>
        </div>
      </div>

      {/* Financial & Operational KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {financialCards.map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="rounded-2xl border-border/60 bg-card/60 hover:bg-card/90 transition-all shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{card.title}</span>
                  <div className={`p-2.5 rounded-xl ${card.bg}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">{card.value}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{card.subtext}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Detailed Analytics Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Channel Breakdown */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="rounded-2xl border-border/60 h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold">Fulfillment Channel Breakdown</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Dispensing distribution across lifecycle channels</p>
              </div>
              <PieIcon className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="space-y-4">
                {orderStats.map(stat => {
                  const pct = Math.round((stat.value / totalOrders) * 100);
                  return (
                    <div key={stat.name} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-foreground">{stat.name}</span>
                        <span className="text-muted-foreground">{stat.value} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full ${stat.color} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Active Catalog Inventory</span>
                  <span className="font-bold text-foreground">{analytics.inventory_count || 0} Batches</span>
                </div>
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Total Prescriptions Fulfilled</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{analytics.total_orders || 0} Orders</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 7-Day Performance Volumes */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="rounded-2xl border-border/60 h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold">7-Day Daily Revenue Trend</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Daily sales volume logged in the weekly cycle</p>
              </div>
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-end justify-between h-[180px] pt-4 px-2 border-b border-border/40">
                {dailyStats.map((day: any) => {
                  const maxSale = Math.max(...dailyStats.map((s: any) => s.sales), 50);
                  const heightPct = Math.max(Math.round((day.sales / maxSale) * 130), 10);
                  return (
                    <div key={day.date} className="flex flex-col items-center gap-1.5 flex-1">
                      <span className="text-[10px] font-semibold text-muted-foreground">${day.sales}</span>
                      <div
                        className="w-7 bg-amber-500/80 hover:bg-amber-500 rounded-t-md transition-all duration-300"
                        style={{ height: `${heightPct}px` }}
                        title={`${day.day}: $${day.sales} sales (${day.orders} orders)`}
                      />
                      <span className="text-[11px] text-muted-foreground font-medium">{day.day}</span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Polygon Amoy blockchain synchronized</span>
                </div>
                <Link
                  href="/pharmacy/qr-scanner"
                  className="text-xs font-semibold text-amber-600 hover:text-amber-500 flex items-center gap-1"
                >
                  <span>Scan Prescription</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
