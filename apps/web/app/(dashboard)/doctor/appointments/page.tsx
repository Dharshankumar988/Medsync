"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Badge, Skeleton
} from "@medsync/ui";
import {
  Calendar, Clock, Loader2, User, Search, CheckCircle, XCircle,
  Stethoscope, ChevronRight, Filter, RefreshCw, ArrowRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Avatar } from "@medsync/ui/components/avatar";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion } from "framer-motion";

const API_PREFIX = "/api/v1";

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-600",
  CONFIRMED: "bg-blue-500/10 text-blue-600",
  COMPLETED: "bg-emerald-500/10 text-emerald-600 border-transparent",
  CANCELLED: "bg-red-500/10 text-red-600",
  REJECTED: "bg-red-500/10 text-red-600",
  RESCHEDULED: "bg-violet-500/10 text-violet-600",
};

export default function DoctorAppointmentsPage() {
  const [userId, setUserId] = useState<string>("");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [updatingId, setUpdatingId] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const fetchAppointments = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);

      // Try API first
      try {
        const params: any = {};
        if (statusFilter) params.status = statusFilter;
        const res = await api.get(`${API_PREFIX}/appointments`, { params });
        const data = res.data?.data;
        setAppointments(data?.appointments || []);
        return;
      } catch {
        // Fallback to Supabase
      }

      const { data: apptData, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("doctor_id", userId)
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;

      if (apptData && apptData.length > 0) {
        const patientIds = apptData.map((a: any) => a.patient_id);
        const { data: patientsData } = await supabase
          .from("patients")
          .select("user_id, full_name, profile_picture_url")
          .in("user_id", patientIds);

        const merged = apptData.map((appt: any) => {
          const patient = patientsData?.find((p: any) => p.user_id === appt.patient_id);
          return {
            ...appt,
            patient_name: patient?.full_name,
            patient_picture: patient?.profile_picture_url,
            patient,
          };
        });
        setAppointments(merged);
      } else {
        setAppointments([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId, statusFilter]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleUpdateStatus = async (id: string, status: string, reason?: string) => {
    setUpdatingId(id);
    try {
      await api.patch(`${API_PREFIX}/appointments/${id}/status`, { status, reason });
      toast.success(`Appointment ${status.toLowerCase()}`);
      fetchAppointments();
    } catch {
      // Fallback
      const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
      if (!error) {
        toast.success(`Appointment ${status.toLowerCase()}`);
        fetchAppointments();
      } else {
        toast.error("Failed to update status");
      }
    } finally {
      setUpdatingId("");
    }
  };

  const getStatusBadge = (status: string) => {
    const cls = statusColors[status] || "bg-gray-500/10 text-gray-600";
    return <Badge variant="outline" className={`${cls} capitalize border-transparent`}>{status.toLowerCase()}</Badge>;
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const todayAppts = appointments.filter((a: any) => a.appointment_date === todayStr);
  const upcomingAppts = appointments.filter(
    (a: any) =>
      a.appointment_date > todayStr &&
      !["CANCELLED", "REJECTED", "COMPLETED"].includes(a.status)
  );
  const pastAppts = appointments.filter(
    (a: any) =>
      a.appointment_date < todayStr || ["COMPLETED", "CANCELLED", "REJECTED"].includes(a.status)
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const renderAppointmentRow = (appt: any) => (
    <div
      key={appt.id}
      className="p-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-start md:items-center gap-4">
        <Avatar
          fallback={appt.patient_name || appt.patient?.full_name || "?"}
          src={appt.patient_picture || appt.patient?.profile_picture_url}
          className="w-12 h-12 border"
        />
        <div>
          <h4 className="font-medium text-base">
            {appt.patient_name || appt.patient?.full_name || "Unknown Patient"}
          </h4>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {appt.appointment_date}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />{" "}
              {String(appt.start_time).slice(0, 5)} – {String(appt.end_time).slice(0, 5)}
            </span>
            {appt.notes && (
              <>
                <span>•</span>
                <span className="truncate max-w-[200px]">{appt.notes}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
        {getStatusBadge(appt.status)}

        <div className="flex gap-2 ml-auto sm:ml-0">
          {appt.status === "PENDING" && (
            <>
              <Button
                size="sm"
                onClick={() => handleUpdateStatus(appt.id, "CONFIRMED")}
                disabled={updatingId === appt.id}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-lg"
              >
                {updatingId === appt.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle className="w-3.5 h-3.5 mr-1" />}
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10 rounded-lg"
                onClick={() => handleUpdateStatus(appt.id, "REJECTED", "Rejected by doctor")}
                disabled={updatingId === appt.id}
              >
                <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
              </Button>
            </>
          )}

          {appt.status === "CONFIRMED" && (
            <>
              <Button size="sm" variant="default" asChild className="rounded-lg">
                <Link href={`/doctor/appointments/${appt.id}/consultation`}>
                  <Stethoscope className="w-3.5 h-3.5 mr-1" /> Start Consultation
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10 rounded-lg"
                onClick={() => handleUpdateStatus(appt.id, "CANCELLED", "Cancelled by doctor")}
                disabled={updatingId === appt.id}
              >
                Cancel
              </Button>
            </>
          )}

          {appt.status === "COMPLETED" && (
            <Button size="sm" variant="secondary" asChild className="rounded-lg">
              <Link href={`/doctor/appointments/${appt.id}/consultation`}>
                View Notes <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4"
      >
        <div>
          <p className="text-sm font-medium tracking-widest uppercase text-emerald-500 mb-2">Doctor</p>
          <h1 className="text-3xl font-bold tracking-tight">Appointments & Consultations</h1>
          <p className="text-muted-foreground mt-1">
            Manage your schedule, accept or reject appointments, and document consultations.
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => fetchAppointments()} className="rounded-xl">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </motion.div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {["", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              statusFilter === s
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card/50 text-muted-foreground border-border/60 hover:border-border"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Today's Appointments */}
      {todayAppts.length > 0 && !statusFilter && (
        <Card className="rounded-2xl border-emerald-500/20 bg-emerald-500/[0.02]">
          <CardHeader className="border-b border-emerald-500/10">
            <CardTitle className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Today's Appointments
              <Badge variant="secondary" className="ml-2">{todayAppts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {todayAppts.map(renderAppointmentRow)}
          </CardContent>
        </Card>
      )}

      {/* All/Filtered Appointments */}
      <Card className="rounded-2xl border border-border/60 bg-card/50">
        <CardHeader className="border-b border-border/40">
          <CardTitle>{statusFilter ? `${statusFilter} Appointments` : "All Appointments"}</CardTitle>
          <CardDescription>
            {statusFilter
              ? `Showing ${appointments.length} ${statusFilter.toLowerCase()} appointments`
              : `${appointments.length} total appointments`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Calendar className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-medium">No appointments found</h3>
              <p className="text-muted-foreground mt-1">
                {statusFilter ? `No ${statusFilter.toLowerCase()} appointments.` : "No appointments yet."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {appointments.map(renderAppointmentRow)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
