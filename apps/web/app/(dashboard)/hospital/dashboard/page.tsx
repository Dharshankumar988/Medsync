"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { Users, Activity, CheckCircle, RefreshCw, Building2, Stethoscope } from "lucide-react";
import { Button } from "@medsync/ui";
import { Skeleton } from "@medsync/ui";
import { motion, AnimatePresence } from "framer-motion";
import { EmptyState } from "@/components/ui/EmptyState";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard.service";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] } },
};

const stagger = { visible: { transition: { staggerChildren: 0.03 } } };

export default function HospitalDashboard() {
  const queryClient = useQueryClient();

  const { data: stats, isLoading: loading, error } = useQuery({
    queryKey: ["hospitalDashboard"],
    queryFn: () => dashboardService.getHospitalDashboard(),
  });

  const fetchData = () => {
    queryClient.invalidateQueries({ queryKey: ["hospitalDashboard"] });
  };

  const accentMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    blue:    { bg: "bg-blue-500/10",    text: "text-blue-500",    border: "hover:border-blue-500/40",    glow: "from-blue-500/[0.07]" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "hover:border-emerald-500/40", glow: "from-emerald-500/[0.07]" },
    amber:   { bg: "bg-amber-500/10",   text: "text-amber-500",   border: "hover:border-amber-500/40",   glow: "from-amber-500/[0.07]" },
  };

  return (
    <div className="relative space-y-8 pb-12">
      <motion.div initial="hidden" animate="visible" variants={stagger} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <motion.div variants={fadeUp}>
          <p className="text-sm font-medium tracking-widest uppercase text-blue-500 mb-2">Hospital Operations</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
            Overview
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md leading-relaxed">
            Monitor hospital performance and active medical personnel.
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
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 mt-6">
            {[1, 2, 3].map(i => (
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
        ) : error ? (
          <EmptyState
            icon={Activity}
            title="Failed to Load Data"
            description="We encountered an issue fetching your hospital dashboard. Please try again."
            action={<Button onClick={fetchData}>Retry</Button>}
          />
        ) : (
          <motion.div key="content" initial="hidden" animate="visible" exit={{ opacity: 0, y: -10 }} variants={stagger} className="space-y-8">
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Active Doctors", value: stats.active_doctors, subtitle: "Registered at this hospital", icon: Stethoscope, accent: "emerald" },
                { title: "Today&apos;s Appointments", value: stats.today_appointments, subtitle: "Appointments scheduled for today", icon: Activity, accent: "blue" },
                { title: "Total Patients", value: stats.total_patients, subtitle: "Total treated patients", icon: Users, accent: "amber" },
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

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              <Card className="rounded-2xl border border-border/60 bg-card/50 overflow-hidden">
                <CardHeader className="border-b border-border/40 pb-4 bg-muted/20">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Stethoscope className="h-4 w-4 text-blue-500" />
                    </div>
                    <CardTitle>Recent Doctors</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {stats.recent_doctors.length > 0 ? (
                    <div className="divide-y divide-border/40">
                      {stats.recent_doctors.map((doctor: any) => (
                        <div key={doctor.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm">{doctor.full_name}</p>
                            <p className="text-xs text-muted-foreground">{doctor.specialization}</p>
                          </div>
                          <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-md">Active</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Users}
                      title="No doctors found"
                      description="There are currently no doctors registered at this hospital."
                    />
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-border/60 bg-card/50 overflow-hidden">
                <CardHeader className="border-b border-border/40 pb-4 bg-muted/20">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Activity className="h-4 w-4 text-emerald-500" />
                    </div>
                    <CardTitle>Today&apos;s Appointments</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {stats.recent_appointments.length > 0 ? (
                    <div className="divide-y divide-border/40">
                      {stats.recent_appointments.map((apt: any) => (
                        <div key={apt.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm">{apt.appointment_date}</p>
                            <p className="text-xs text-muted-foreground">{apt.start_time} - {apt.end_time}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-md ${
                            apt.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {apt.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={CheckCircle}
                      title="No appointments"
                      description="No appointments scheduled for today."
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
