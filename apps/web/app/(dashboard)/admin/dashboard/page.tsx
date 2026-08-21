"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { Users, Server, Activity, ShieldCheck, CheckCircle, XCircle, Trash2, UserPlus, Loader2, Truck, RefreshCw, Building2, Brain, FileText, Package, AlertTriangle, Database } from "lucide-react";
import { Button } from "@medsync/ui";
import { Skeleton } from "@medsync/ui";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { AuditHistory } from "@medsync/ui";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] } },
};

const stagger = { visible: { transition: { staggerChildren: 0.03 } } };

// Mock system health data (Normally fetched from API)
const systemHealth = [
  { name: "Core API", status: "operational", latency: "42ms", icon: Server },
  { name: "Database", status: "operational", latency: "12ms", icon: Database },
  { name: "AI Services (Pulse)", status: "operational", latency: "850ms", icon: Brain },
  { name: "Blockchain Sync", status: "degraded", latency: "4.2s", icon: ShieldCheck },
  { name: "Storage Service", status: "operational", latency: "65ms", icon: Package },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/admin/stats/dashboard');
      setStats(res.data.data);
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
    } finally {
      setLoading(false);
    }
  };

  const accentMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    red:     { bg: "bg-red-500/10",     text: "text-red-500",     border: "hover:border-red-500/40",     glow: "from-red-500/[0.07]" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "hover:border-emerald-500/40", glow: "from-emerald-500/[0.07]" },
    amber:   { bg: "bg-amber-500/10",   text: "text-amber-500",   border: "hover:border-amber-500/40",   glow: "from-amber-500/[0.07]" },
    blue:    { bg: "bg-blue-500/10",    text: "text-blue-500",    border: "hover:border-blue-500/40",    glow: "from-blue-500/[0.07]" },
    violet:  { bg: "bg-violet-500/10",  text: "text-violet-500",  border: "hover:border-violet-500/40",  glow: "from-violet-500/[0.07]" },
  };

  return (
    <div className="relative space-y-8 pb-12">
      <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-red-500/[0.04] rounded-full blur-[100px]" />

      <motion.div initial="hidden" animate="visible" variants={stagger} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <motion.div variants={fadeUp}>
          <p className="text-sm font-medium tracking-widest uppercase text-red-500 mb-2">Admin Operations</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
            System Command Center
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md leading-relaxed">
            Monitor platform health, verify professionals, and manage infrastructure in real-time.
          </p>
        </motion.div>
        <motion.div variants={fadeUp} className="flex items-center gap-2">
          <Button onClick={fetchData} variant="outline" className="rounded-xl border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh Data
          </Button>
        </motion.div>
      </motion.div>

      <AnimatePresence mode="wait">
        {loading || !stats ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 mt-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <Card key={i} className="rounded-2xl border-border/60 bg-card/50 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded-xl" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </motion.div>
        ) : (
          <motion.div key="content" initial="hidden" animate="visible" exit={{ opacity: 0, y: -10 }} variants={stagger} className="space-y-8">
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {[
                { title: "Total Users", value: stats.users.total, subtitle: "Registered accounts", icon: Users, accent: "red" },
                { title: "Patients", value: stats.users.patients, subtitle: "Total patients", icon: Activity, accent: "blue" },
                { title: "Doctors", value: stats.users.doctors, subtitle: "Total doctors", icon: Activity, accent: "emerald" },
                { title: "Pharmacies", value: stats.users.pharmacies, subtitle: "Total pharmacies", icon: Building2, accent: "amber" },
                { title: "Pending Reviews", value: stats.users.pending_verification, subtitle: "Professionals awaiting approval", icon: AlertTriangle, accent: "amber" },
                { title: "Appointments", value: stats.operations.appointments, subtitle: "Total appointments", icon: Activity, accent: "violet" },
                { title: "Prescriptions", value: stats.operations.prescriptions, subtitle: "Total prescriptions", icon: FileText, accent: "emerald" },
                { title: "Orders", value: stats.operations.orders, subtitle: "Total orders", icon: Package, accent: "blue" },
              ].map((s, i) => {
                const a = accentMap[s.accent];
                return (
                  <motion.div key={i} variants={fadeUp}>
                    <Card className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 ${a.border}`}>
                      <div className={`absolute inset-0 bg-gradient-to-br ${a.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                      <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
                        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${a.bg} transition-transform duration-300 group-hover:scale-110`}>
                          <s.icon className={`h-5 w-5 ${a.text}`} />
                        </div>
                      </CardHeader>
                      <CardContent className="relative z-10">
                        <div className="text-2xl font-bold tracking-tight">{s.value}</div>
                        <p className="text-xs text-muted-foreground mt-1.5">{s.subtitle}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-8 flex flex-col gap-6">
                <Card className="rounded-2xl border border-border/60 bg-card/50 overflow-hidden flex-1">
                  <CardHeader className="border-b border-border/40 pb-4 bg-muted/20">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                        <Activity className="h-4 w-4 text-red-500" />
                      </div>
                      <CardTitle>System Health Monitors</CardTitle>
                    </div>
                    <CardDescription>Real-time status of MedSync core services</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/40">
                      {systemHealth.map((service, i) => (
                        <div key={i} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${service.status === 'operational' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                              <service.icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{service.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="relative flex h-2 w-2">
                                  {service.status === 'operational' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                                  <span className={`relative inline-flex rounded-full h-2 w-2 ${service.status === 'operational' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                </span>
                                <span className="text-xs text-muted-foreground capitalize">{service.status}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded-md">{service.latency}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger} className="grid gap-4 sm:grid-cols-3">
                  {[
                    { icon: Brain, title: "AI Management", desc: "Monitor models", href: "/admin/ai", color: "text-red-500", bg: "bg-red-500/10" },
                    { icon: ShieldCheck, title: "Blockchain Monitor", desc: "Audit on-chain logs", href: "/admin/blockchain", color: "text-emerald-500", bg: "bg-emerald-500/10" },
                    { icon: Users, title: "Users & Verification", desc: "Manage accounts", href: "/admin/users", color: "text-blue-500", bg: "bg-blue-500/10" },
                  ].map((item, i) => (
                    <motion.div key={i} variants={fadeUp}>
                      <Link href={item.href}>
                        <Card className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:border-border/80 cursor-pointer h-full">
                          <CardContent className="flex items-start gap-4 p-5">
                            <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.bg} transition-transform duration-300 group-hover:scale-110`}>
                              <item.icon className={`h-4 w-4 ${item.color}`} />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-foreground">{item.title}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.desc}</p>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
              <div className="lg:col-span-4 h-full">
                <AuditHistory />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
