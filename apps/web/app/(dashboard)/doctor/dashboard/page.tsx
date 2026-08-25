"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { Skeleton } from "@medsync/ui";
import { Users, Calendar, Activity, CheckCircle2, TrendingUp, DollarSign, ArrowUpRight, MessageSquare, Stethoscope, Brain, FileText, Clock } from "lucide-react";
import { Button } from "@medsync/ui";
import { AuditHistory } from "@medsync/ui";
import { ProfileCompletionCard } from "@/components/profile-wizard/ProfileCompletionCard";
import { AppointmentHeatmap } from "@/components/doctor/AppointmentHeatmap";
import { PatientQueue } from "@/components/doctor/PatientQueue";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] } },
};
const stagger = { visible: { transition: { staggerChildren: 0.03 } } };

import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard.service";

export default function DoctorDashboard() {
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const { data: dashboardData = {
    today_appointments: 0,
    pending_prescriptions: 0,
    pending_records: 0
  }, isLoading: loadingStats } = useQuery({
    queryKey: ["doctorDashboard", userId],
    queryFn: () => dashboardService.getDoctorDashboard(),
    enabled: !!userId,
  });

  const { data: appointments = [], isLoading: loadingAppts } = useQuery({
    queryKey: ["doctorAppointments", userId],
    queryFn: () => {
      const today = new Date().toISOString().split('T')[0];
      return dashboardService.getDoctorAppointments(today);
    },
    enabled: !!userId,
  });

  const todayAppointments = appointments.map((appt: any) => ({
    name: appt.patient_name || "Unknown Patient",
    time: appt.start_time.slice(0, 5),
    type: "Consultation",
    status: appt.status,
    urgent: false
  }));

  const isLoading = loadingStats || loadingAppts;

  const stats = [
    {
      title: "Today's Patients",
      value: dashboardData.today_appointments.toString(),
      subtitle: (
        <span className="flex items-center text-emerald-500 font-medium">
          Scheduled today
        </span>
      ),
      icon: Users,
      accent: "emerald",
    },
    {
      title: "Pending Prescriptions",
      value: dashboardData.pending_prescriptions.toString(),
      subtitle: "Requires your sign-off",
      icon: Activity,
      accent: "amber",
    },
    {
      title: "AI Analyses",
      value: "View",
      subtitle: "Recent model results",
      icon: Brain,
      accent: "blue",
    },
    {
      title: "Today's Revenue",
      value: "View Analytics",
      subtitle: "Estimated earnings",
      icon: DollarSign,
      accent: "violet",
    },
  ];

  const accentMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "hover:border-emerald-500/40", glow: "from-emerald-500/[0.07]" },
    amber:   { bg: "bg-amber-500/10",   text: "text-amber-500",   border: "hover:border-amber-500/40",   glow: "from-amber-500/[0.07]" },
    blue:    { bg: "bg-blue-500/10",     text: "text-blue-500",     border: "hover:border-blue-500/40",     glow: "from-blue-500/[0.07]" },
    violet:  { bg: "bg-violet-500/10",   text: "text-violet-500",   border: "hover:border-violet-500/40",   glow: "from-violet-500/[0.07]" },
  };

  return (
    <div className="relative space-y-8 pb-12">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/[0.04] rounded-full blur-[100px]" />

      {userId && <ProfileCompletionCard userId={userId} role="doctor" />}

      {/* ─── Header ─── */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
      >
        <motion.div variants={fadeUp}>
          <p className="text-sm font-medium tracking-widest uppercase text-emerald-500 mb-2">Doctor Dashboard</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
            Clinical Overview
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md leading-relaxed">
            Manage your patients, appointments, and daily schedule.
          </p>
        </motion.div>
        <motion.div variants={fadeUp} className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted" asChild>
            <Link href="/doctor/appointments">Manage Availability</Link>
          </Button>
          <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm" asChild>
            <Link href="/doctor/appointments">View Full Calendar</Link>
          </Button>
        </motion.div>
      </motion.div>

      {/* ─── Stat Cards ─── */}
      {!userId || isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-[140px] w-full rounded-2xl" />)}
        </div>
      ) : (
        <motion.div
          className="grid gap-5 md:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {stats.map((s, i) => {
            const a = accentMap[s.accent];
            return (
              <motion.div key={i} variants={fadeUp}>
                <Card className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 ${a.border}`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${a.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${a.bg} transition-colors duration-300 group-hover:scale-110`}>
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
        </motion.div>
      )}

      {/* ─── Main Grid: Queue + Heatmap ─── */}
      <motion.div
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-7"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
      >
        <motion.div variants={fadeUp} className="col-span-full lg:col-span-4">
          <PatientQueue queue={todayAppointments} />
        </motion.div>
        <motion.div variants={fadeUp} className="col-span-full lg:col-span-3">
          <AppointmentHeatmap />
        </motion.div>
      </motion.div>

      {/* ─── Bottom Grid: Alerts + Audit ─── */}
      <motion.div
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-7"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
      >
        <motion.div variants={fadeUp} className="col-span-full lg:col-span-4 space-y-6">
          <Card className="rounded-2xl border border-border/60 bg-card/50">
            <CardHeader>
              <CardTitle>Recent Patient Alerts</CardTitle>
              <CardDescription>Critical updates from monitored patients.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-10 text-center bg-emerald-500/[0.04] rounded-xl border border-emerald-500/10">
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                  <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                </div>
                <p className="font-semibold text-lg text-emerald-600 dark:text-emerald-400">All patients stable</p>
                <p className="text-sm text-muted-foreground mt-2 max-w-[280px] leading-relaxed">
                  No abnormal vitals reported in the last 24 hours.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} className="col-span-full lg:col-span-3 space-y-6">
          <AuditHistory />
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
          { icon: Brain, title: "Pulse AI Assistant", desc: "Get AI clinical insights", href: "/doctor/pulse-ai", color: "text-violet-500", bg: "bg-violet-500/10" },
          { icon: Stethoscope, title: "Consultations", desc: "Manage your consultations", href: "/doctor/appointments", color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { icon: FileText, title: "Medical Records", desc: "Review patient records", href: "/doctor/records", color: "text-blue-500", bg: "bg-blue-500/10" },
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
