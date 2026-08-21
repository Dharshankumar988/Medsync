"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Badge, Skeleton, Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger, Input
} from "@medsync/ui";
import {
  Calendar, Clock, User, Plus, MapPin, Building2, Search,
  Stethoscope, Star, ChevronRight, X, Filter, RefreshCw
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";
import dynamic from "next/dynamic";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";

const HospitalMap = dynamic(() => import("@/components/HospitalMap"), { ssr: false, loading: () => <div className="h-[300px] w-full rounded-xl bg-card/50 animate-pulse border border-border flex items-center justify-center text-sm text-muted-foreground">Loading Map...</div> });

const API_PREFIX = "/api/v1";

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  CONFIRMED: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  CANCELLED: "bg-red-500/10 text-red-600 border-red-500/20",
  REJECTED: "bg-red-500/10 text-red-600 border-red-500/20",
  RESCHEDULED: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  NO_SHOW: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } },
};

export default function AppointmentsPage() {
  const [userId, setUserId] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [hospitalDoctors, setHospitalDoctors] = useState<any[]>([]);
  const [allDoctors, setAllDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { user } = useAuth();
  const router = useRouter();

  // Booking dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState<"browse" | "select-doctor" | "book">("browse");
  const [selectedHospital, setSelectedHospital] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [bookingData, setBookingData] = useState({
    doctor_id: "",
    appointment_date: "",
    start_time: "",
    end_time: "",
    notes: "",
    location_id: "",
  });
  const [isBooking, setIsBooking] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setUserId(data.session.user.id);
        setToken(data.session.access_token);
      }
    });
  }, []);

  const loadAppointments = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get(`${API_PREFIX}/appointments`, { params });
      const data = res.data?.data;
      setAppointments(data?.appointments || []);
    } catch (err) {
      console.error("Error loading appointments", err);
      // Fallback: load from supabase directly
      try {
        const { data: apptData } = await supabase
          .from("appointments")
          .select("*")
          .eq("patient_id", userId)
          .order("appointment_date", { ascending: false });

        if (apptData) {
          const doctorIds = [...new Set(apptData.map((a: any) => a.doctor_id))];
          const { data: docData } = await supabase
            .from("doctors")
            .select("*")
            .in("user_id", doctorIds);

          const docsMap = (docData || []).reduce((acc: any, doc: any) => {
            acc[doc.user_id] = doc;
            return acc;
          }, {});

          setAppointments(
            apptData.map((a: any) => ({
              ...a,
              doctor_name: docsMap[a.doctor_id]?.full_name,
              doctor_specialization: docsMap[a.doctor_id]?.specialization,
              doctor_picture: docsMap[a.doctor_id]?.profile_picture_url,
              hospital_name: docsMap[a.doctor_id]?.hospital_name,
            }))
          );
        }
      } catch {
        toast.error("Failed to load appointments");
      }
    } finally {
      setLoading(false);
    }
  }, [userId, statusFilter]);

  const loadHospitals = useCallback(async () => {
    try {
      const res = await api.get(`${API_PREFIX}/hospitals`);
      setHospitals(res.data?.data || []);
    } catch {
      const { data } = await supabase.from("hospitals").select("*").eq("is_active", true);
      setHospitals(data || []);
    }
  }, []);

  const loadAllDoctors = useCallback(async () => {
    try {
      const { data } = await supabase.from("doctors").select("*");
      setAllDoctors(data || []);
    } catch {
      setAllDoctors([]);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    loadHospitals();
    loadAllDoctors();
  }, [loadHospitals, loadAllDoctors]);

  const handleSelectHospital = async (hospital: any) => {
    setSelectedHospital(hospital);
    setBookingStep("select-doctor");
    try {
      const res = await api.get(`${API_PREFIX}/hospitals/${hospital.id}/doctors`);
      setHospitalDoctors(res.data?.data || []);
    } catch {
      // Fallback: load doctors by hospital_id from supabase
      const { data } = await supabase
        .from("doctors")
        .select("*")
        .eq("hospital_id", hospital.id);
      setHospitalDoctors(
        (data || []).map((d: any) => ({
          user_id: d.user_id,
          full_name: d.full_name,
          specialization: d.specialization,
          consultation_fee: d.consultation_fee,
          experience_years: d.experience_years,
          profile_picture_url: d.profile_picture_url,
          bio: d.bio,
        }))
      );
    }
  };

  const handleSelectDoctor = (doctor: any) => {
    setSelectedDoctor(doctor);
    setBookingData((prev) => ({
      ...prev,
      doctor_id: doctor.user_id || doctor.id,
      location_id: doctor.locations?.[0]?.id || "",
    }));
    setBookingStep("book");
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setIsBooking(true);
    try {
      const endTime = bookingData.end_time || (() => {
        const [h, m] = bookingData.start_time.split(":").map(Number);
        const end = new Date(2000, 0, 1, h, m + 30);
        return `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
      })();

      await api.post(`${API_PREFIX}/appointments/book`, {
        doctor_id: bookingData.doctor_id,
        appointment_date: bookingData.appointment_date,
        start_time: bookingData.start_time,
        end_time: endTime,
        notes: bookingData.notes || undefined,
        location_id: bookingData.location_id || undefined,
      });

      toast.success("Appointment booked successfully!");
      setIsDialogOpen(false);
      resetBooking();
      loadAppointments();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to book appointment";
      toast.error(msg);
    } finally {
      setIsBooking(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      await api.patch(`${API_PREFIX}/appointments/${appointmentId}/status`, {
        status: "CANCELLED",
        reason: "Cancelled by patient",
      });
      toast.success("Appointment cancelled");
      loadAppointments();
    } catch {
      // Fallback
      await supabase.from("appointments").update({ status: "CANCELLED" }).eq("id", appointmentId);
      toast.success("Appointment cancelled");
      loadAppointments();
    }
  };

  const resetBooking = () => {
    setBookingStep("browse");
    setSelectedHospital(null);
    setSelectedDoctor(null);
    setHospitalDoctors([]);
    setBookingData({
      doctor_id: "",
      appointment_date: "",
      start_time: "",
      end_time: "",
      notes: "",
      location_id: "",
    });
  };

  const filteredHospitals = hospitals.filter(
    (h: any) =>
      !searchQuery ||
      h.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDoctors = allDoctors.filter(
    (d: any) =>
      !searchQuery ||
      d.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.specialization?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative space-y-8 pb-12">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-500/[0.04] rounded-full blur-[100px]" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <p className="text-sm font-medium tracking-widest uppercase text-blue-500 mb-2">My Health</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
            Appointments
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md leading-relaxed">
            Browse hospitals, find doctors, and manage your appointments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => loadAppointments()} className="rounded-xl">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              if (open && user?.role === "PATIENT" && (user.profile_completion_percentage || 0) < 100) {
                toast.error("Please complete your profile first.");
                router.push("/patient/profile");
                return;
              }
              setIsDialogOpen(open);
              if (!open) resetBooking();
            }}
          >
            <DialogTrigger asChild>
              <Button className="shrink-0 rounded-xl">
                <Plus className="mr-2 h-4 w-4" /> Book Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {bookingStep === "browse" && "Find a Hospital or Doctor"}
                  {bookingStep === "select-doctor" && `Doctors at ${selectedHospital?.name}`}
                  {bookingStep === "book" && `Book with Dr. ${selectedDoctor?.full_name}`}
                </DialogTitle>
              </DialogHeader>

              {/* Step: Browse Hospitals */}
              {bookingStep === "browse" && (
                <div className="space-y-4 pt-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search hospitals or doctors..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Hospitals */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-500" /> Hospitals
                    </h3>
                    
                    <div className="mb-4">
                      <HospitalMap 
                        hospitals={filteredHospitals} 
                        onSelectHospital={handleSelectHospital} 
                      />
                    </div>

                    <div className="grid gap-3 max-h-[200px] overflow-y-auto">
                      {filteredHospitals.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No hospitals found</p>
                      ) : (
                        filteredHospitals.map((h: any) => (
                          <div
                            key={h.id}
                            onClick={() => handleSelectHospital(h)}
                            className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-blue-500/40 hover:bg-blue-500/[0.04] cursor-pointer transition-all group"
                          >
                            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 shrink-0">
                              <Building2 className="h-5 w-5 text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{h.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {[h.city, h.state].filter(Boolean).join(", ") || h.address}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Direct doctor search */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-emerald-500" /> All Doctors
                    </h3>
                    <div className="grid gap-3 max-h-[200px] overflow-y-auto">
                      {filteredDoctors.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No doctors found</p>
                      ) : (
                        filteredDoctors.slice(0, 10).map((d: any) => (
                          <div
                            key={d.user_id}
                            onClick={() => handleSelectDoctor({ ...d, user_id: d.user_id })}
                            className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-emerald-500/40 hover:bg-emerald-500/[0.04] cursor-pointer transition-all group"
                          >
                            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 shrink-0">
                              <User className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">Dr. {d.full_name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {d.specialization} • {d.experience_years || 0}yr exp
                                {d.consultation_fee ? ` • ₹${d.consultation_fee}` : ""}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step: Select Doctor at Hospital */}
              {bookingStep === "select-doctor" && (
                <div className="space-y-4 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setBookingStep("browse")}>
                    ← Back to search
                  </Button>
                  <div className="grid gap-3">
                    {hospitalDoctors.length === 0 ? (
                      <div className="flex flex-col items-center py-8 text-center">
                        <Stethoscope className="h-10 w-10 text-muted-foreground/50 mb-3" />
                        <p className="text-sm text-muted-foreground">No doctors listed at this hospital yet</p>
                      </div>
                    ) : (
                      hospitalDoctors.map((d: any) => (
                        <div
                          key={d.user_id || d.id}
                          onClick={() => handleSelectDoctor(d)}
                          className="flex items-center gap-4 p-4 rounded-xl border border-border/60 hover:border-emerald-500/40 hover:bg-emerald-500/[0.04] cursor-pointer transition-all group"
                        >
                          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 shrink-0">
                            <Stethoscope className="h-6 w-6 text-emerald-500" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">Dr. {d.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {d.specialization}
                              {d.experience_years ? ` • ${d.experience_years}yr exp` : ""}
                            </p>
                            {d.consultation_fee > 0 && (
                              <p className="text-sm font-medium text-emerald-600 mt-1">
                                ₹{d.consultation_fee} consultation fee
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-emerald-500" />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Step: Book Appointment */}
              {bookingStep === "book" && (
                <div className="space-y-4 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => {
                    if (selectedHospital) setBookingStep("select-doctor");
                    else setBookingStep("browse");
                  }}>
                    ← Back
                  </Button>

                  <div className="p-4 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <Stethoscope className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-semibold">Dr. {selectedDoctor?.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedDoctor?.specialization}
                          {selectedHospital ? ` • ${selectedHospital.name}` : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleBook} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Date *</label>
                        <Input
                          type="date"
                          value={bookingData.appointment_date}
                          onChange={(e) => setBookingData({ ...bookingData, appointment_date: e.target.value })}
                          min={new Date().toISOString().split("T")[0]}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Time *</label>
                        <Input
                          type="time"
                          value={bookingData.start_time}
                          onChange={(e) => setBookingData({ ...bookingData, start_time: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Reason for Visit</label>
                      <Input
                        value={bookingData.notes}
                        onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                        placeholder="e.g. Follow-up checkup, fever, headache..."
                      />
                    </div>
                    <Button type="submit" className="w-full rounded-xl" disabled={isBooking}>
                      {isBooking ? "Booking..." : "Confirm Booking"}
                    </Button>
                  </form>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
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

      {/* Appointments List */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <Card className="rounded-2xl border border-dashed bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 mb-4">
              <Calendar className="h-8 w-8 text-blue-500/50" />
            </div>
            <p className="text-lg font-medium">No appointments</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm text-center">
              {statusFilter
                ? `No ${statusFilter.toLowerCase()} appointments found.`
                : "You don't have any appointments yet. Book one to get started!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {appointments.map((appt: any) => (
            <motion.div key={appt.id} variants={fadeUp}>
              <Card className="group overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 mb-3">
                      <Stethoscope className="h-5 w-5 text-blue-500" />
                    </div>
                    <Badge
                      variant="outline"
                      className={`capitalize ${statusColors[appt.status] || "bg-gray-500/10 text-gray-600"}`}
                    >
                      {(appt.status || "").toLowerCase()}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">
                    Dr. {appt.doctor_name || appt.doctor?.full_name || "Unknown"}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {appt.doctor_specialization || appt.doctor?.specialization || ""}
                    {(appt.hospital_name || appt.doctor?.hospital_name) &&
                      ` • ${appt.hospital_name || appt.doctor?.hospital_name}`}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {(() => {
                        const [year, month, day] = appt.appointment_date.split('-').map(Number);
                        return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        });
                      })()}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {String(appt.start_time).slice(0, 5)}
                    </div>
                  </div>
                  {appt.location_name && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {appt.location_name}
                    </div>
                  )}
                  {appt.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-2">Notes: {appt.notes}</p>
                  )}
                  {appt.cancellation_reason && (
                    <p className="text-xs text-red-500">Reason: {appt.cancellation_reason}</p>
                  )}

                  {/* Action buttons */}
                  {(appt.status === "PENDING" || appt.status === "CONFIRMED") && (
                    <div className="pt-2 border-t border-border/40">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full"
                        onClick={() => handleCancelAppointment(appt.id)}
                      >
                        <X className="h-3.5 w-3.5 mr-1.5" /> Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
