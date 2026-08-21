"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button } from "@medsync/ui";
import { Skeleton } from "@medsync/ui";
import { Clock, FileText, CheckCircle2, ChevronRight, AlertCircle, Syringe, Pill, Heart, Brain, Calendar, ShieldCheck, ShoppingBag, Activity } from "lucide-react";
import { AuditHistory } from "@medsync/ui";
import { ProfileCompletionCard } from "@/components/profile-wizard/ProfileCompletionCard";
import { HealthStatistics } from "@/components/patient/HealthStatistics";
import { QuickActionsMenu } from "@/components/patient/QuickActionsMenu";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] } },
};
const stagger = { visible: { transition: { staggerChildren: 0.03 } } };

export default function PatientDashboard() {
  const [userId, setUserId] = useState<string>("");
  const [dashboardData, setDashboardData] = useState<{
    nextAppointment: any;
    doctorInfo: any;
    recordsCount: number;
    prescriptionsCount: number;
    ordersCount: number;
    notifications: any[];
    loading: boolean;
  }>({
    nextAppointment: null,
    doctorInfo: null,
    recordsCount: 0,
    prescriptionsCount: 0,
    ordersCount: 0,
    notifications: [],
    loading: true,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    async function fetchDashboardData() {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Next Appointment
        const { data: apptData } = await supabase
          .from('appointments')
          .select('*')
          .eq('patient_id', userId)
          .gte('appointment_date', today)
          .order('appointment_date', { ascending: true })
          .limit(1);
          
        let docInfo = null;
        if (apptData && apptData.length > 0) {
          const { data: docData } = await supabase
            .from('doctors')
            .select('*')
            .eq('user_id', apptData[0].doctor_id)
            .single();
          docInfo = docData;
        }

        // Records Count
        const { count: recordsCount } = await supabase
          .from('medical_records')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', userId);

        // Prescriptions Count
        const { count: presCount } = await supabase
          .from('prescriptions')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', userId)
          .eq('is_dispensed', false);

        // Orders Count
        const { count: ordersCount } = await supabase
          .from('medicine_orders')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', userId);

        // Recent Notifications for timeline
        const { data: notifs } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(3);

        setDashboardData({
          nextAppointment: apptData?.[0] || null,
          doctorInfo: docInfo,
          recordsCount: recordsCount || 0,
          prescriptionsCount: presCount || 0,
          ordersCount: ordersCount || 0,
          notifications: notifs || [],
          loading: false
        });
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
        setDashboardData(prev => ({ ...prev, loading: false }));
      }
    }

    fetchDashboardData();
  }, [userId]);

  const stats = [
    {
      title: "Next Appointment",
      value: dashboardData.nextAppointment 
        ? (() => {
            const [year, month, day] = dashboardData.nextAppointment.appointment_date.split('-').map(Number);
            return `${new Date(year, month - 1, day).toLocaleDateString()} at ${dashboardData.nextAppointment.start_time.slice(0,5)}`;
          })()
        : "None scheduled",
      subtitle: dashboardData.doctorInfo 
        ? `Dr. ${dashboardData.doctorInfo.full_name} (${dashboardData.doctorInfo.specialization})` 
        : "Book an appointment",
      icon: Clock,
      accent: "blue",
    },
    {
      title: "Medical Records",
      value: dashboardData.recordsCount.toString(),
      subtitle: <span className="text-blue-500 font-medium">Uploaded documents</span>,
      icon: FileText,
      accent: "violet",
    },
    {
      title: "Active Prescriptions",
      value: dashboardData.prescriptionsCount.toString(),
      valueColor: "text-emerald-500",
      subtitle: "Pending dispense",
      icon: Pill,
      accent: "emerald",
    },
    {
      title: "Recent Orders",
      value: dashboardData.ordersCount.toString(),
      subtitle: "Medicine deliveries",
      icon: ShoppingBag,
      accent: "orange",
    },
  ];

  const accentMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    blue:    { bg: "bg-blue-500/10",    text: "text-blue-500",    border: "hover:border-blue-500/40",    glow: "from-blue-500/[0.07]" },
    violet:  { bg: "bg-violet-500/10",  text: "text-violet-500",  border: "hover:border-violet-500/40",  glow: "from-violet-500/[0.07]" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "hover:border-emerald-500/40", glow: "from-emerald-500/[0.07]" },
    orange:  { bg: "bg-orange-500/10",  text: "text-orange-500",  border: "hover:border-orange-500/40",  glow: "from-orange-500/[0.07]" },
  };

  return (
    <div className="relative space-y-8 pb-12">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-500/[0.04] rounded-full blur-[100px]" />

      {userId && <ProfileCompletionCard userId={userId} role="patient" />}

      {/* ─── Header ─── */}
      <motion.div initial="hidden" animate="visible" variants={stagger} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <motion.div variants={fadeUp}>
          <p className="text-sm font-medium tracking-widest uppercase text-blue-500 mb-2">Patient Dashboard</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
            Welcome back
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md leading-relaxed">
            Here is your health summary for today.
          </p>
        </motion.div>
        <motion.div variants={fadeUp} className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted">
            <AlertCircle className="mr-2 h-4 w-4" /> Issue Tracker
          </Button>
        </motion.div>
      </motion.div>

      {/* ─── Stat Cards ─── */}
      {(!userId || dashboardData.loading) ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-[140px] w-full rounded-2xl" />)}
        </div>
      ) : (
        <motion.div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4" initial="hidden" animate="visible" variants={stagger}>
          {stats.map((s, i) => {
            const a = accentMap[s.accent];
            return (
              <motion.div key={i} variants={fadeUp}>
                <Card className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 ${a.border}`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${a.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
                    <div className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl ${a.bg} transition-transform duration-300 group-hover:scale-110`}>
                      <s.icon className={`h-5 w-5 ${a.text}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className={`text-2xl font-bold tracking-tight ${(s as any).valueColor || ""}`}>{s.value}</div>
                    <p className="text-xs text-muted-foreground mt-1.5">{s.subtitle}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* ─── Health Stats + Quick Actions ─── */}
      <motion.div
        className="grid gap-6 md:grid-cols-2 xl:grid-cols-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
      >
        <motion.div variants={fadeUp} className="col-span-full xl:col-span-2">
          <HealthStatistics />
        </motion.div>
        <motion.div variants={fadeUp} className="col-span-full xl:col-span-2">
          <QuickActionsMenu />
        </motion.div>
      </motion.div>

      {/* ─── Audit + Timeline ─── */}
      <motion.div
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-7"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
      >
        <motion.div variants={fadeUp} className="col-span-full lg:col-span-4 space-y-6">
          <AuditHistory />
        </motion.div>

        <motion.div variants={fadeUp} className="col-span-full lg:col-span-3 space-y-6">
          <Card className="rounded-2xl border border-border/60 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Medical Timeline</CardTitle>
                <CardDescription>Recent events and updates.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="rounded-lg text-muted-foreground hover:text-foreground">
                <Link href="/patient/records">View All <ChevronRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {dashboardData.notifications.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No recent events.</div>
                ) : (
                  dashboardData.notifications.map((item, i) => (
                    <div key={i} className="flex items-start gap-4 group">
                      <div className={`shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 transition-transform duration-300 group-hover:scale-110`}>
                        <Activity className={`h-4 w-4 text-blue-500`} />
                      </div>
                      <div className="flex flex-col gap-1 w-full">
                        <div className="flex justify-between w-full">
                          <span className="text-sm font-semibold">{item.title}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{item.message}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* ─── Quick Access ─── */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {[
          { icon: Brain, title: "Ask Pulse AI", desc: "Get health questions answered", href: "/patient/pulse-ai", color: "text-blue-500", bg: "bg-blue-500/10" },
          { icon: Heart, title: "Health Education", desc: "Learn about your conditions", href: "/patient/pulse-ai", color: "text-rose-500", bg: "bg-rose-500/10" },
          { icon: ShieldCheck, title: "Prescription QR Code", desc: "View & verify prescriptions", href: "/patient/qr", color: "text-emerald-500", bg: "bg-emerald-500/10" },
        ].map((item, i) => (
          <motion.div key={i} variants={fadeUp}>
            <Link href={item.href}>
              <Card className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:border-border/80 cursor-pointer">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.bg} transition-transform duration-300 group-hover:scale-110`}>
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
