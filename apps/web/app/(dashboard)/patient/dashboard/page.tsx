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

import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard.service";
import { appointmentService } from "@/services/appointment.service";

export default function PatientDashboard() {
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const { data: dashboardData = {
    upcoming_appointments: 0,
    total_records: 0,
    active_prescriptions: 0,
    ongoing_orders: 0
  }, isLoading } = useQuery({
    queryKey: ["patientDashboard", userId],
    queryFn: () => dashboardService.getPatientDashboard(),
    enabled: !!userId,
  });

  const { data: appointmentsData } = useQuery({
    queryKey: ["patientAppointments", userId],
    queryFn: () => appointmentService.getAppointments({ limit: 5 }),
    enabled: !!userId,
  });

  const recentAppointments = appointmentsData?.items || [];

  const stats = [
    {
      title: "Upcoming Appointments",
      value: (dashboardData?.upcoming_appointments || 0).toString(),
      subtitle: "Scheduled consultations",
      icon: Clock,
      accent: "blue",
    },
    {
      title: "Medical Records",
      value: (dashboardData?.total_records || 0).toString(),
      subtitle: <span className="text-blue-500 font-medium">Uploaded documents</span>,
      icon: FileText,
      accent: "violet",
    },
    {
      title: "Active Prescriptions",
      value: (dashboardData?.active_prescriptions || 0).toString(),
      valueColor: "text-emerald-500",
      subtitle: "Pending dispense",
      icon: Pill,
      accent: "emerald",
    },
    {
      title: "Ongoing Orders",
      value: (dashboardData?.ongoing_orders || 0).toString(),
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
      {(!userId || isLoading) ? (
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
                {recentAppointments.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">No recent events.</div>
                ) : (
                  recentAppointments.map((appt: any) => (
                    <div key={appt.id} className="flex items-start gap-3 border-b border-border/40 pb-3 last:border-0 last:pb-0">
                      <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Appointment with Dr. {appt.doctor?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(appt.appointment_date).toLocaleDateString()} at {appt.start_time}</p>
                        <span className={`text-[10px] font-semibold mt-1 px-2 py-0.5 rounded-full inline-block ${appt.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {appt.status}
                        </span>
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
