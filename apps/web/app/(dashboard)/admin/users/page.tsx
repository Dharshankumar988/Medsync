"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Users, Trash2, CheckCircle, XCircle, Building2, Building, 
  Stethoscope, Pill, MapPin, Phone, Mail, Clock, ShieldCheck, ExternalLink, 
  Loader2, Award, CheckCircle2, Plus, Search, Filter, Hospital as HospitalIcon,
  Sparkles, AlertCircle, Info, User, Heart, AlertTriangle, Shield, UserCheck,
  Briefcase, Calendar
} from "lucide-react";
import { 
  Tabs, TabsContent, TabsList, TabsTrigger, Button, Badge, Skeleton, 
  Card, CardHeader, CardTitle, CardDescription, CardContent, Input,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@medsync/ui";
import api from "@/lib/api";
import { toast } from "sonner";
import { formatDoctorName } from "@/lib/formatDoctorName";

function calculateAge(dobString?: string | null): string | null {
  if (!dobString) return null;
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) {
    const yr = parseInt(dobString, 10);
    if (!isNaN(yr) && yr > 1900 && yr <= new Date().getFullYear()) {
      return `${new Date().getFullYear() - yr} yrs`;
    }
    return dobString;
  }
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? `${age} yrs` : null;
}

function formatAccountDate(dateStr?: string | null): string {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return dateStr;
  }
}

export default function AdminUsers() {
  const [activeTab, setActiveTab] = useState<string>("verifications");
  const [verifications, setVerifications] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerification, setSelectedVerification] = useState<any | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Active facility sub-classification filter
  const [facilityFilter, setFacilityFilter] = useState<"all" | "hospitals" | "clinics" | "pharmacies">("all");
  const [facilitySearch, setFacilitySearch] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");

  // Modals / Form toggles
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [isAddingDoctor, setIsAddingDoctor] = useState(false);
  const [isAddingFacility, setIsAddingFacility] = useState<"hospital" | "clinic" | null>(null);
  const [isAddingPharmacy, setIsAddingPharmacy] = useState(false);

  // Form states
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");

  const [newDoctor, setNewDoctor] = useState({
    email: "",
    password: "",
    full_name: "",
    specialization: "",
    license_number: "",
    clinic_phone: "",
    experience_years: 0,
    consultation_fee: 0,
    facility_mode: "existing" as "existing" | "new" | "none",
    facility_type: "hospital" as "hospital" | "clinic",
    hospital_id: "",
    new_facility_name: "",
    new_facility_address: "",
    new_facility_city: "",
    new_facility_state: "",
    new_facility_phone: ""
  });

  const [newFacilityForm, setNewFacilityForm] = useState({
    name: "",
    type: "hospital" as "hospital" | "clinic",
    address: "",
    city: "",
    state: "",
    phone_number: "",
    email: "",
    latitude: 0,
    longitude: 0
  });

  const [newPharmacyForm, setNewPharmacyForm] = useState({
    business_name: "",
    license_number: "",
    address: "",
    city: "",
    state: "",
    contact_number: "",
    email: "",
    password: "",
    hospital_id: "",
    clinic_name: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vRes, pRes, aRes, dRes, phRes, hRes] = await Promise.allSettled([
        api.get('/api/v1/admin/verifications/pending'),
        api.get('/api/v1/admin/patients'),
        api.get('/api/v1/admin/admins'),
        api.get('/api/v1/admin/doctors'),
        api.get('/api/v1/admin/pharmacies'),
        api.get('/api/v1/hospitals')
      ]);

      if (vRes.status === "fulfilled") setVerifications(vRes.value.data?.data || []);
      if (pRes.status === "fulfilled") setPatients(pRes.value.data?.data || []);
      if (aRes.status === "fulfilled") setAdmins(aRes.value.data?.data || []);
      if (dRes.status === "fulfilled") setDoctors(dRes.value.data?.data || []);
      if (phRes.status === "fulfilled") setPharmacies(phRes.value.data?.data || []);
      if (hRes.status === "fulfilled") setFacilities(hRes.value.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch admin data", err);
      toast.error("Some records could not be loaded");
    } finally {
      setLoading(false);
    }
  };

  // Facility Classifications
  const hospitalsList = useMemo(() => 
    facilities.filter(f => (f.type || 'hospital').toLowerCase() === 'hospital'),
    [facilities]
  );

  const clinicsList = useMemo(() => 
    facilities.filter(f => (f.type || '').toLowerCase() === 'clinic'),
    [facilities]
  );

  // Filtered facilities list based on classification sub-tab & search
  const filteredFacilities = useMemo(() => {
    let list: any[] = [];
    if (facilityFilter === "all") {
      list = [
        ...hospitalsList.map(h => ({ ...h, category: "HOSPITAL" })),
        ...clinicsList.map(c => ({ ...c, category: "CLINIC" })),
        ...pharmacies.map(p => ({ ...p, category: "PHARMACY", name: p.business_name, phone_number: p.contact_number }))
      ];
    } else if (facilityFilter === "hospitals") {
      list = hospitalsList.map(h => ({ ...h, category: "HOSPITAL" }));
    } else if (facilityFilter === "clinics") {
      list = clinicsList.map(c => ({ ...c, category: "CLINIC" }));
    } else if (facilityFilter === "pharmacies") {
      list = pharmacies.map(p => ({ ...p, category: "PHARMACY", name: p.business_name, phone_number: p.contact_number }));
    }

    if (facilitySearch.trim()) {
      const q = facilitySearch.toLowerCase();
      list = list.filter(item => 
        (item.name || "").toLowerCase().includes(q) ||
        (item.city || "").toLowerCase().includes(q) ||
        (item.address || "").toLowerCase().includes(q) ||
        (item.phone_number || item.contact_number || "").toLowerCase().includes(q) ||
        (item.license_number || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [facilityFilter, facilitySearch, hospitalsList, clinicsList, pharmacies]);

  // Filtered Doctors
  const filteredDoctors = useMemo(() => {
    if (!doctorSearch.trim()) return doctors;
    const q = doctorSearch.toLowerCase();
    return doctors.filter(d => 
      (d.full_name || "").toLowerCase().includes(q) ||
      (d.email || "").toLowerCase().includes(q) ||
      (d.specialization || "").toLowerCase().includes(q) ||
      (d.hospital_name || "").toLowerCase().includes(q) ||
      (d.clinic_name || "").toLowerCase().includes(q) ||
      (d.license_number || "").toLowerCase().includes(q)
    );
  }, [doctors, doctorSearch]);

  // Actions
  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await api.post(`/api/v1/admin/verifications/${id}/approve`);
      toast.success("Application approved and verified successfully!");
      fetchData();
      setSelectedVerification(null);
    } catch (err: any) {
      console.error("Failed to approve", err);
      toast.error(err.response?.data?.detail || "Failed to approve verification");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this verification request?")) return;
    setActionLoading(id);
    try {
      await api.post(`/api/v1/admin/verifications/${id}/reject`);
      toast.success("Verification request rejected");
      fetchData();
      setSelectedVerification(null);
    } catch (err: any) {
      console.error("Failed to reject", err);
      toast.error(err.response?.data?.detail || "Failed to reject verification");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (id: string, type: string) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
    try {
      await api.delete(`/api/v1/admin/users/${id}`);
      fetchData();
      toast.success(`${type} deleted successfully`);
    } catch (err) {
      console.error(`Failed to delete ${type}`, err);
      toast.error(`Failed to delete ${type}`);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string, entityName: string) => {
    const isSuspended = (currentStatus || "").toUpperCase() === "SUSPENDED";
    const nextStatus = isSuspended ? "ACTIVE" : "SUSPENDED";
    const actionLabel = isSuspended ? "activate" : "suspend";

    if (!confirm(`Are you sure you want to ${actionLabel} ${entityName}?`)) return;

    try {
      await api.patch(`/api/v1/admin/users/${userId}/status`, { status: nextStatus });
      toast.success(`${entityName} is now ${nextStatus.toLowerCase()}`);
      fetchData();
    } catch (err: any) {
      console.error(`Failed to update status for ${entityName}`, err);
      toast.error(err.response?.data?.detail || `Failed to ${actionLabel} ${entityName}`);
    }
  };

  const handleAuthorizeFacility = async (id: string, name: string) => {
    try {
      await api.post(`/api/v1/hospitals/${id}/verify`);
      toast.success(`${name} verified successfully!`);
      fetchData();
    } catch (err) {
      console.error("Failed to authorize facility", err);
      toast.error("Failed to authorize facility");
    }
  };

  const handleDeleteFacility = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name}?`)) return;
    try {
      await api.delete(`/api/v1/hospitals/${id}`);
      toast.success(`${name} removed successfully`);
      fetchData();
    } catch (err) {
      console.error("Failed to delete facility", err);
      toast.error("Failed to delete facility");
    }
  };


  // Add Doctor Submission
  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoctor.email || !newDoctor.password || !newDoctor.full_name) {
      toast.error("Please fill in name, email, and password.");
      return;
    }

    try {
      const payload: any = {
        email: newDoctor.email,
        password: newDoctor.password,
        full_name: newDoctor.full_name,
        specialization: newDoctor.specialization || undefined,
        license_number: newDoctor.license_number || undefined,
        clinic_phone: newDoctor.clinic_phone || undefined,
        experience_years: Number(newDoctor.experience_years) || 0,
        consultation_fee: Number(newDoctor.consultation_fee) || 0
      };

      if (newDoctor.facility_mode === "existing" && newDoctor.hospital_id) {
        payload.hospital_id = newDoctor.hospital_id;
      } else if (newDoctor.facility_mode === "new" && newDoctor.new_facility_name) {
        payload.new_facility = {
          name: newDoctor.new_facility_name,
          type: newDoctor.facility_type,
          address: newDoctor.new_facility_address || "Address pending",
          city: newDoctor.new_facility_city || undefined,
          state: newDoctor.new_facility_state || undefined,
          phone_number: newDoctor.new_facility_phone || undefined
        };
      }

      await api.post('/api/v1/admin/doctors', payload);
      toast.success("Doctor created and credentialed successfully!");
      setNewDoctor({
        email: "",
        password: "",
        full_name: "",
        specialization: "",
        license_number: "",
        clinic_phone: "",
        experience_years: 0,
        consultation_fee: 0,
        facility_mode: "existing",
        facility_type: "hospital",
        hospital_id: "",
        new_facility_name: "",
        new_facility_address: "",
        new_facility_city: "",
        new_facility_state: "",
        new_facility_phone: ""
      });
      setIsAddingDoctor(false);
      fetchData();
    } catch (err: any) {
      console.error("Failed to create doctor", err);
      toast.error(err.response?.data?.detail || "Failed to create doctor");
    }
  };

  // Add Admin Submission
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail || !newAdminPassword) return;
    try {
      await api.post('/api/v1/admin/admins', { email: newAdminEmail, password: newAdminPassword });
      toast.success("Administrator account created successfully!");
      setNewAdminEmail("");
      setNewAdminPassword("");
      setIsAddingAdmin(false);
      fetchData();
    } catch (err: any) {
      console.error("Failed to create admin", err);
      toast.error(err.response?.data?.detail || "Failed to create administrator");
    }
  };

  // Add Facility (Hospital or Clinic)
  const handleAddFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFacilityForm.name || !newFacilityForm.address) {
      toast.error("Name and Address are required.");
      return;
    }
    try {
      await api.post('/api/v1/hospitals', {
        name: newFacilityForm.name,
        type: newFacilityForm.type,
        address: newFacilityForm.address,
        city: newFacilityForm.city || undefined,
        state: newFacilityForm.state || undefined,
        phone_number: newFacilityForm.phone_number || undefined,
        email: newFacilityForm.email || undefined,
        latitude: newFacilityForm.latitude || undefined,
        longitude: newFacilityForm.longitude || undefined
      });
      toast.success(`${newFacilityForm.type === 'clinic' ? 'Clinic' : 'Hospital'} registered and verified successfully!`);
      setIsAddingFacility(null);
      setNewFacilityForm({
        name: "",
        type: "hospital",
        address: "",
        city: "",
        state: "",
        phone_number: "",
        email: "",
        latitude: 0,
        longitude: 0
      });
      fetchData();
    } catch (err: any) {
      console.error("Failed to add facility", err);
      toast.error(err.response?.data?.detail || "Failed to add facility");
    }
  };

  // Add Pharmacy
  const handleAddPharmacy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPharmacyForm.business_name || !newPharmacyForm.email || !newPharmacyForm.address) {
      toast.error("Please provide store name, email, and address.");
      return;
    }
    try {
      await api.post('/api/v1/admin/pharmacies', {
        business_name: newPharmacyForm.business_name,
        license_number: newPharmacyForm.license_number || "PHARM-" + Math.floor(100000 + Math.random() * 900000),
        email: newPharmacyForm.email,
        password: newPharmacyForm.password || "Pharmacy@123",
        address: newPharmacyForm.address,
        city: newPharmacyForm.city || undefined,
        state: newPharmacyForm.state || undefined,
        contact_number: newPharmacyForm.contact_number || undefined,
        hospital_id: newPharmacyForm.hospital_id || undefined,
        clinic_name: newPharmacyForm.clinic_name || undefined
      });
      toast.success("Pharmacy authorized and registered successfully!");
      setIsAddingPharmacy(false);
      setNewPharmacyForm({
        business_name: "",
        license_number: "",
        address: "",
        city: "",
        state: "",
        contact_number: "",
        email: "",
        password: "",
        hospital_id: "",
        clinic_name: ""
      });
      fetchData();
    } catch (err: any) {
      console.error("Failed to add pharmacy", err);
      toast.error(err.response?.data?.detail || "Failed to register pharmacy");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Users className="w-8 h-8 text-primary" /> Users & Verification
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage system access, healthcare facilities (hospitals, clinics, pharmacies), clinical staff, and approvals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-1.5 text-xs">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* ─── EXECUTIVE NETWORK & FACILITIES OVERVIEW CARDS ─── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-primary" /> Integrated Healthcare Network & Facilities
          </p>
          <span className="text-xs text-muted-foreground">Click any card to view list or add</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {/* Classification 1: Hospitals */}
          <div 
            onClick={() => { setActiveTab("facilities"); setFacilityFilter("hospitals"); }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
              activeTab === "facilities" && facilityFilter === "hospitals"
                ? "border-blue-500 bg-blue-500/10 shadow-md ring-1 ring-blue-500/30"
                : "border-border/70 bg-card hover:border-blue-500/50 hover:bg-blue-500/[0.03]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20 font-medium">
                Hospitals
              </Badge>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">{hospitalsList.length}</span>
                <span className="text-xs text-muted-foreground">{hospitalsList.length === 1 ? "hospital" : "hospitals"}</span>
              </div>
              <p className="text-xs font-semibold text-foreground/90 mt-0.5">Network Hospitals</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {hospitalsList.filter(h => h.is_verified).length} verified & active
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between gap-1.5">
              <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 group-hover:underline whitespace-nowrap inline-flex items-center gap-0.5">
                View Hospitals <span>&rarr;</span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab("facilities");
                  setFacilityFilter("hospitals");
                  setIsAddingFacility("hospital");
                  setIsAddingPharmacy(false);
                  setNewFacilityForm(f => ({ ...f, type: "hospital" }));
                }}
                className="h-6 px-2 text-[10px] font-semibold text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 rounded-md shrink-0"
              >
                + Add Hospital
              </Button>
            </div>
          </div>

          {/* Classification 2: Private Clinics */}
          <div 
            onClick={() => { setActiveTab("facilities"); setFacilityFilter("clinics"); }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
              activeTab === "facilities" && facilityFilter === "clinics"
                ? "border-emerald-500 bg-emerald-500/10 shadow-md ring-1 ring-emerald-500/30"
                : "border-border/70 bg-card hover:border-emerald-500/50 hover:bg-emerald-500/[0.03]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <Stethoscope className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
                Clinics
              </Badge>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">{clinicsList.length}</span>
                <span className="text-xs text-muted-foreground">{clinicsList.length === 1 ? "clinic" : "clinics"}</span>
              </div>
              <p className="text-xs font-semibold text-foreground/90 mt-0.5">Private Clinics</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {clinicsList.filter(c => c.is_verified).length} verified & active
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between gap-1.5">
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 group-hover:underline whitespace-nowrap inline-flex items-center gap-0.5">
                View Clinics <span>&rarr;</span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab("facilities");
                  setFacilityFilter("clinics");
                  setIsAddingFacility("clinic");
                  setIsAddingPharmacy(false);
                  setNewFacilityForm(f => ({ ...f, type: "clinic" }));
                }}
                className="h-6 px-2 text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-md shrink-0"
              >
                + Add Clinic
              </Button>
            </div>
          </div>

          {/* Classification 3: Pharmacies */}
          <div 
            onClick={() => { setActiveTab("facilities"); setFacilityFilter("pharmacies"); }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
              activeTab === "facilities" && facilityFilter === "pharmacies"
                ? "border-amber-500 bg-amber-500/10 shadow-md ring-1 ring-amber-500/30"
                : "border-border/70 bg-card hover:border-amber-500/50 hover:bg-amber-500/[0.03]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <Pill className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 font-medium">
                Pharmacies
              </Badge>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">{pharmacies.length}</span>
                <span className="text-xs text-muted-foreground">{pharmacies.length === 1 ? "store" : "stores"}</span>
              </div>
              <p className="text-xs font-semibold text-foreground/90 mt-0.5">Dispensing Pharmacies</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {pharmacies.filter(p => p.is_verified).length} verified & licensed
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between gap-1.5">
              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 group-hover:underline whitespace-nowrap inline-flex items-center gap-0.5">
                View Stores <span>&rarr;</span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab("facilities");
                  setFacilityFilter("pharmacies");
                  setIsAddingPharmacy(true);
                  setIsAddingFacility(null);
                }}
                className="h-6 px-2 text-[10px] font-semibold text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 rounded-md shrink-0"
              >
                + Add Pharmacy
              </Button>
            </div>
          </div>

          {/* Role: Doctors */}
          <div 
            onClick={() => setActiveTab("doctors")}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
              activeTab === "doctors"
                ? "border-violet-500 bg-violet-500/10 shadow-md ring-1 ring-violet-500/30"
                : "border-border/70 bg-card hover:border-violet-500/50 hover:bg-violet-500/[0.03]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-600 border-violet-500/20 font-medium">
                Role: Doctor
              </Badge>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">{doctors.length}</span>
                <span className="text-xs text-muted-foreground">{doctors.length === 1 ? "doctor" : "doctors"}</span>
              </div>
              <p className="text-xs font-semibold text-foreground/90 mt-0.5">Medical Doctors</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {doctors.filter(d => (d.status || '').toUpperCase() !== 'SUSPENDED').length} active credentials
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between gap-1.5">
              <span className="text-[11px] font-medium text-violet-600 dark:text-violet-400 group-hover:underline whitespace-nowrap inline-flex items-center gap-0.5">
                View Doctors <span>&rarr;</span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab("doctors");
                  setIsAddingDoctor(true);
                }}
                className="h-6 px-2 text-[10px] font-semibold text-violet-600 bg-violet-500/10 hover:bg-violet-500/20 rounded-md shrink-0"
              >
                + Add Doctor
              </Button>
            </div>
          </div>

          {/* Role: Platform Admins */}
          <div 
            onClick={() => setActiveTab("admins")}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
              activeTab === "admins"
                ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/30"
                : "border-border/70 bg-card hover:border-primary/50 hover:bg-primary/[0.03]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-medium">
                Role: Admin
              </Badge>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">{admins.length}</span>
                <span className="text-xs text-muted-foreground">{admins.length === 1 ? "admin" : "admins"}</span>
              </div>
              <p className="text-xs font-semibold text-foreground/90 mt-0.5">Platform Admins</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Full governance access
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between gap-1.5">
              <span className="text-[11px] font-medium text-primary group-hover:underline whitespace-nowrap inline-flex items-center gap-0.5">
                Manage Admins <span>&rarr;</span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab("admins");
                  setIsAddingAdmin(true);
                }}
                className="h-6 px-2 text-[10px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-md shrink-0"
              >
                + Add Admin
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card border border-border/70 flex flex-wrap h-auto p-1.5 gap-1.5 rounded-xl shadow-sm">
          <TabsTrigger value="facilities" className="gap-2 text-xs py-2 px-3.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
            <Building2 className="w-3.5 h-3.5" />
            <span>Facilities (Hospitals, Clinics, Pharmacies)</span>
            <span className="bg-primary/20 text-primary font-bold px-1.5 py-0.2 rounded text-[10px]">
              {facilities.length + pharmacies.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="verifications" className="gap-2 text-xs py-2 px-3.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Pending Verifications</span>
            {verifications.length > 0 && (
              <span className="bg-amber-500 text-black font-bold px-1.5 py-0.2 rounded-full text-[10px]">
                {verifications.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="doctors" className="gap-2 text-xs py-2 px-3.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Doctors</span>
            <span className="opacity-70 text-[11px]">({doctors.length})</span>
          </TabsTrigger>
          <TabsTrigger value="patients" className="gap-2 text-xs py-2 px-3.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="w-3.5 h-3.5" />
            <span>Patients</span>
            <span className="opacity-70 text-[11px]">({patients.length})</span>
          </TabsTrigger>
          <TabsTrigger value="admins" className="gap-2 text-xs py-2 px-3.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Shield className="w-3.5 h-3.5" />
            <span>Admins</span>
            <span className="opacity-70 text-[11px]">({admins.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: PENDING VERIFICATIONS ─── */}
        <TabsContent value="verifications">
          <Card className="border border-border/70 shadow-sm">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Pending Professional Verifications</CardTitle>
                  <CardDescription>Carefully review clinical credentials, practice affiliations, and facility registrations before granting network access.</CardDescription>
                </div>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 px-3 py-1 text-xs">
                  {verifications.length} Pending Approval
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
                </div>
              ) : verifications.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground border border-dashed rounded-xl p-8 bg-muted/10">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500/60 mb-3" />
                  <p className="text-base font-semibold text-foreground">All Clear!</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    There are no pending doctor licenses, clinic registrations, or pharmacy verification requests at this time.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {verifications.map((req: any) => {
                    const isWorkplaceAffiliation = req.verification_type === "WORKPLACE_AFFILIATION";
                    const isDoctor = req.role === "DOCTOR";
                    const prof = req.profile || {};
                    const facility = req.facility || {};
                    const isClinic = prof.practice_type === "CLINIC" || prof.clinic_name || facility.type === "CLINIC" || facility.type === "clinic";
                    const appliedHospName = facility.name || prof.applied_hospital_info?.name || prof.hospital_name;
                    const clinicName = facility.name || prof.clinic_info?.name || prof.clinic_name;
                    const gstNo = prof.gst_number;

                    return (
                      <div 
                        key={req.request_id} 
                        className={`p-5 border rounded-xl hover:border-primary/50 transition-all bg-card shadow-sm space-y-3.5 ${
                          isWorkplaceAffiliation ? "border-blue-500/40 bg-blue-500/[0.02]" : "border-border/70"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={isDoctor ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-amber-600 hover:bg-amber-700 text-white"}>
                                {req.role}
                              </Badge>
                              {isWorkplaceAffiliation && (
                                <Badge className="bg-blue-600 hover:bg-blue-700 text-white gap-1 text-[11px]">
                                  <Briefcase className="w-3 h-3" /> Workplace Practice Affiliation
                                </Badge>
                              )}
                              <span className="font-bold text-base text-foreground">
                                {isDoctor ? formatDoctorName(prof.full_name || req.email) : (prof.business_name || req.email)}
                              </span>
                              {prof.specialization && (
                                <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                                  {prof.specialization}
                                </Badge>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                              <span><Mail className="w-3 h-3 inline mr-1" />{req.email}</span>
                              {prof.clinic_phone && (
                                <>
                                  <span>•</span>
                                  <span><Phone className="w-3 h-3 inline mr-1" />{prof.clinic_phone}</span>
                                </>
                              )}
                              <span>•</span>
                              <span>License: <strong>{prof.license_number || "Pending"}</strong></span>
                              {prof.medical_council_reg_number && (
                                <>
                                  <span>•</span>
                                  <span>Council Reg: <strong>{prof.medical_council_reg_number}</strong></span>
                                </>
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setSelectedVerification(req)}
                              className="text-xs h-9 gap-1 shadow-sm"
                            >
                              Review Details
                            </Button>
                            <Button 
                              variant="outline"
                              size="sm"
                              disabled={actionLoading === req.request_id}
                              onClick={() => handleReject(req.request_id)}
                              className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs h-9 gap-1 shadow-sm"
                            >
                              Reject
                            </Button>
                            <Button 
                              size="sm" 
                              disabled={actionLoading === req.request_id}
                              onClick={() => handleApprove(req.request_id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 gap-1 shadow-sm"
                            >
                              {actionLoading === req.request_id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle className="w-3.5 h-3.5" />
                              )}
                              Approve
                            </Button>
                          </div>
                        </div>

                        {/* Facility banner */}
                        {isWorkplaceAffiliation ? (
                          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                                <span className="font-semibold text-foreground text-sm">
                                  {facility.name || "Medical Workplace Facility"}
                                </span>
                                <Badge variant="outline" className="text-[10px] bg-background border-blue-500/30 text-blue-700 dark:text-blue-300 uppercase">
                                  {facility.type || "Hospital"}
                                </Badge>
                              </div>
                              <p className="text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                                {[facility.address, facility.city, facility.state].filter(Boolean).join(", ") || "Address on file"}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-muted-foreground border-t sm:border-t-0 sm:border-l border-blue-500/20 pt-2 sm:pt-0 sm:pl-3">
                              {facility.working_days && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span>{facility.working_days}</span>
                                </div>
                              )}
                              {facility.consultation_hours && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span>{facility.consultation_hours}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 rounded-lg bg-muted/40 border border-border/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                              {isDoctor ? (
                                isClinic ? (
                                  <span className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                                    <Stethoscope className="w-4 h-4 text-emerald-600" />
                                    <span><strong>Private Clinic:</strong> {clinicName || "Clinic details submitted"}</span>
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1.5 font-medium text-blue-700 dark:text-blue-400">
                                    <Building2 className="w-4 h-4 text-blue-600" />
                                    <span><strong>Applied to Hospital:</strong> {appliedHospName || "Hospital facility"}</span>
                                  </span>
                                )
                              ) : (
                                <span className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
                                  <Pill className="w-4 h-4 text-amber-600" />
                                  <span><strong>Pharmacy Store:</strong> {prof.business_name}</span>
                                </span>
                              )}
                              {(prof.city || prof.clinic_info?.city || prof.applied_hospital_info?.city) && (
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {prof.city || prof.clinic_info?.city || prof.applied_hospital_info?.city}
                                </span>
                              )}
                            </div>
                            {gstNo && (
                              <Badge variant="outline" className="text-[11px] bg-background border-border">
                                GST: {gstNo}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 2: PATIENTS ─── */}
        <TabsContent value="patients">
          <Card className="border border-border/70 shadow-sm">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Registered Patients</CardTitle>
                  <CardDescription>View patient records, monitor account statuses, and reset security credentials.</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">{patients.length} Registered</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                </div>
              ) : patients.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
                  No patients found.
                </div>
              ) : (
                <div className="divide-y border border-border/60 rounded-xl overflow-hidden bg-card">
                  {patients.map((p: any) => {
                    const isSuspended = (p.status || "").toUpperCase() === "SUSPENDED";
                    return (
                      <div key={p.id || p.user_id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/10 gap-3">
                        <div>
                          <p className="font-semibold text-foreground text-sm">{p.full_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {p.email} • Blood: {p.blood_group || "N/A"} • Gender: {p.gender || "N/A"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSuspended ? (
                            <Badge variant="outline" className="text-xs border-red-500/30 text-red-500 bg-red-500/10">Suspended</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600 bg-emerald-500/10">Active</Badge>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title={isSuspended ? "Activate Patient" : "Suspend Patient"} 
                            className={`h-8 px-2 text-xs font-medium ${isSuspended ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10" : "text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"}`}
                            onClick={() => handleToggleUserStatus(p.user_id, p.status, p.full_name || 'Patient')}
                          >
                            {isSuspended ? "Activate" : "Suspend"}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="View Patient Info" 
                            onClick={() => setSelectedPatient(p)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Delete Patient" 
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10" 
                            onClick={() => handleDeleteUser(p.user_id, 'patient')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: DOCTORS ─── */}
        <TabsContent value="doctors">
          <Card className="border border-border/70 shadow-sm">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">Verified Medical Doctors</CardTitle>
                  <CardDescription>Manage physicians, specializations, credentials, and clinic/hospital workplace affiliations.</CardDescription>
                </div>
                <Button 
                  onClick={() => setIsAddingDoctor(!isAddingDoctor)} 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-sm text-xs h-9"
                >
                  {isAddingDoctor ? "Cancel" : <><Plus className="w-4 h-4" /> Add Doctor</>}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Add Doctor Collapsible Form */}
              {isAddingDoctor && (
                <div className="p-6 border border-primary/30 rounded-2xl bg-card shadow-md space-y-5 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-primary" /> Register & Credential New Doctor
                    </h3>
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                      Auto-Verified by Admin
                    </Badge>
                  </div>

                  <form onSubmit={handleAddDoctor} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Doctor Full Name *</label>
                        <Input 
                          required 
                          placeholder="e.g. Dr. Sarah Jenkins"
                          value={newDoctor.full_name} 
                          onChange={e => setNewDoctor({...newDoctor, full_name: e.target.value})} 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Doctor Email Address *</label>
                        <Input 
                          type="email" 
                          required 
                          placeholder="e.g. s.jenkins@medsync.io"
                          value={newDoctor.email} 
                          onChange={e => setNewDoctor({...newDoctor, email: e.target.value})} 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Account Password *</label>
                        <Input 
                          type="password" 
                          required 
                          minLength={6} 
                          placeholder="Minimum 6 characters"
                          value={newDoctor.password} 
                          onChange={e => setNewDoctor({...newDoctor, password: e.target.value})} 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Specialization</label>
                        <Input 
                          placeholder="e.g. Cardiology, Neurology, General Medicine"
                          value={newDoctor.specialization} 
                          onChange={e => setNewDoctor({...newDoctor, specialization: e.target.value})} 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Medical License Number</label>
                        <Input 
                          placeholder="e.g. MED-884920"
                          value={newDoctor.license_number} 
                          onChange={e => setNewDoctor({...newDoctor, license_number: e.target.value})} 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Clinic Contact Phone</label>
                        <Input 
                          placeholder="e.g. +1 555-0199"
                          value={newDoctor.clinic_phone} 
                          onChange={e => setNewDoctor({...newDoctor, clinic_phone: e.target.value})} 
                        />
                      </div>
                    </div>

                    {/* Facility Placement Section */}
                    <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-primary" /> Practice Workplace Assignment
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Attach this doctor to an existing network hospital/clinic, or register a brand-new facility right now during this process.
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        <Button 
                          type="button" 
                          size="sm"
                          variant={newDoctor.facility_mode === "existing" && newDoctor.facility_type === "hospital" ? "default" : "outline"}
                          onClick={() => setNewDoctor({ ...newDoctor, facility_mode: "existing", facility_type: "hospital" })}
                          className="text-xs h-9 justify-start gap-1.5"
                        >
                          <Building2 className="w-3.5 h-3.5" /> Existing Hospital
                        </Button>
                        <Button 
                          type="button" 
                          size="sm"
                          variant={newDoctor.facility_mode === "existing" && newDoctor.facility_type === "clinic" ? "default" : "outline"}
                          onClick={() => setNewDoctor({ ...newDoctor, facility_mode: "existing", facility_type: "clinic" })}
                          className="text-xs h-9 justify-start gap-1.5"
                        >
                          <Stethoscope className="w-3.5 h-3.5" /> Existing Clinic
                        </Button>
                        <Button 
                          type="button" 
                          size="sm"
                          variant={newDoctor.facility_mode === "new" ? "default" : "outline"}
                          onClick={() => setNewDoctor({ ...newDoctor, facility_mode: "new" })}
                          className="text-xs h-9 justify-start gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" /> + New Facility
                        </Button>
                        <Button 
                          type="button" 
                          size="sm"
                          variant={newDoctor.facility_mode === "none" ? "default" : "outline"}
                          onClick={() => setNewDoctor({ ...newDoctor, facility_mode: "none", hospital_id: "" })}
                          className="text-xs h-9 justify-start gap-1.5"
                        >
                          Independent Practice
                        </Button>
                      </div>

                      {/* Dropdown for Existing Facilities */}
                      {newDoctor.facility_mode === "existing" && (
                        <div className="pt-2">
                          <label className="text-xs font-medium text-foreground block mb-1">
                            Select {newDoctor.facility_type === "clinic" ? "Registered Clinic" : "Network Hospital"}
                          </label>
                          <select 
                            value={newDoctor.hospital_id} 
                            onChange={e => setNewDoctor({ ...newDoctor, hospital_id: e.target.value })}
                            className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <option value="">-- Choose from registered {newDoctor.facility_type === "clinic" ? "clinics" : "hospitals"} --</option>
                            {(newDoctor.facility_type === "clinic" ? clinicsList : hospitalsList).map((h: any) => (
                              <option key={h.id} value={h.id}>
                                {h.name} {h.city ? `(${h.city})` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Inline Sub-form for Adding a New Facility on the fly */}
                      {newDoctor.facility_mode === "new" && (
                        <div className="pt-2 space-y-3 p-3.5 rounded-lg border border-border bg-background">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground">Add New Facility On-The-Fly</span>
                            <div className="flex gap-2">
                              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                <input 
                                  type="radio" 
                                  name="new_fac_type" 
                                  checked={newDoctor.facility_type === "hospital"} 
                                  onChange={() => setNewDoctor({ ...newDoctor, facility_type: "hospital" })} 
                                />
                                <span>Hospital</span>
                              </label>
                              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                <input 
                                  type="radio" 
                                  name="new_fac_type" 
                                  checked={newDoctor.facility_type === "clinic"} 
                                  onChange={() => setNewDoctor({ ...newDoctor, facility_type: "clinic" })} 
                                />
                                <span>Clinic</span>
                              </label>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input 
                              placeholder={`${newDoctor.facility_type === 'clinic' ? 'Clinic' : 'Hospital'} Name *`}
                              value={newDoctor.new_facility_name}
                              onChange={e => setNewDoctor({ ...newDoctor, new_facility_name: e.target.value })}
                            />
                            <Input 
                              placeholder="City / Region"
                              value={newDoctor.new_facility_city}
                              onChange={e => setNewDoctor({ ...newDoctor, new_facility_city: e.target.value })}
                            />
                            <Input 
                              placeholder="Facility Street Address *"
                              className="sm:col-span-2"
                              value={newDoctor.new_facility_address}
                              onChange={e => setNewDoctor({ ...newDoctor, new_facility_address: e.target.value })}
                            />
                            <Input 
                              placeholder="Facility Contact Phone"
                              value={newDoctor.new_facility_phone}
                              onChange={e => setNewDoctor({ ...newDoctor, new_facility_phone: e.target.value })}
                            />
                            <Input 
                              placeholder="State / Province"
                              value={newDoctor.new_facility_state}
                              onChange={e => setNewDoctor({ ...newDoctor, new_facility_state: e.target.value })}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => setIsAddingDoctor(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground px-6">
                        Create Doctor Account
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Search input */}
              <div className="flex items-center gap-2 max-w-sm">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search doctors by name, license, specialization..." 
                  value={doctorSearch}
                  onChange={e => setDoctorSearch(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Doctors List */}
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
                </div>
              ) : filteredDoctors.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
                  No doctors found matching search.
                </div>
              ) : (
                <div className="divide-y border border-border/60 rounded-xl overflow-hidden bg-card">
                  {filteredDoctors.map((d: any) => {
                    const isClinic = d.facility_type === "clinic" || !!d.clinic_name;
                    const facilityName = d.clinic_name || d.hospital_name;

                    return (
                      <div key={d.id || d.user_id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/10 gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground text-sm">{formatDoctorName(d.full_name)}</p>
                            {d.specialization && (
                              <Badge variant="outline" className="text-[11px] text-primary border-primary/30">
                                {d.specialization}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {d.email} • License: {d.license_number || "On file"}
                          </p>
                          <div className="flex items-center gap-2 pt-0.5">
                            {facilityName ? (
                              <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${isClinic ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"}`}>
                                {isClinic ? <Stethoscope className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                                {facilityName} ({isClinic ? "Clinic" : "Hospital"})
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">Independent Practice</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {(d.status || "").toUpperCase() === "SUSPENDED" ? (
                            <Badge className="bg-red-500/10 text-red-600 border-red-200 text-xs">
                              Suspended
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-xs">
                              Verified
                            </Badge>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title={(d.status || "").toUpperCase() === "SUSPENDED" ? "Activate Doctor" : "Suspend Doctor"} 
                            className={`h-8 px-2 text-xs font-medium ${(d.status || "").toUpperCase() === "SUSPENDED" ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10" : "text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"}`}
                            onClick={() => handleToggleUserStatus(d.user_id, d.status, d.full_name || 'Doctor')}
                          >
                            {(d.status || "").toUpperCase() === "SUSPENDED" ? "Activate" : "Suspend"}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Delete Doctor" 
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10" 
                            onClick={() => handleDeleteUser(d.user_id, 'doctor')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 4: FACILITIES (HOSPITALS, CLINICS, PHARMACIES) ─── */}
        <TabsContent value="facilities">
          <Card className="border border-border/70 shadow-sm">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" /> Medical Facilities Network
                  </CardTitle>
                  <CardDescription>
                    Manage hospitals, private clinics, and dispensing pharmacies with full verification and onboarding controls.
                  </CardDescription>
                </div>

                {/* Quick Add Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => { setIsAddingFacility("hospital"); setNewFacilityForm(f => ({ ...f, type: "hospital" })); }}
                    className="text-xs h-9 gap-1.5"
                  >
                    <Building2 className="w-3.5 h-3.5 text-blue-500" /> + Add Hospital
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => { setIsAddingFacility("clinic"); setNewFacilityForm(f => ({ ...f, type: "clinic" })); }}
                    className="text-xs h-9 gap-1.5"
                  >
                    <Stethoscope className="w-3.5 h-3.5 text-emerald-500" /> + Add Clinic
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setIsAddingPharmacy(true)}
                    className="text-xs h-9 gap-1.5"
                  >
                    <Pill className="w-3.5 h-3.5 text-amber-500" /> + Add Pharmacy
                  </Button>
                </div>
              </div>

              {/* Classification Sub-Tabs */}
              <div className="flex flex-wrap items-center gap-2 pt-4">
                <Button 
                  size="sm" 
                  variant={facilityFilter === "all" ? "default" : "secondary"}
                  onClick={() => setFacilityFilter("all")}
                  className="text-xs h-8 rounded-lg"
                >
                  All Facilities ({facilities.length + pharmacies.length})
                </Button>
                <Button 
                  size="sm" 
                  variant={facilityFilter === "hospitals" ? "default" : "secondary"}
                  onClick={() => setFacilityFilter("hospitals")}
                  className="text-xs h-8 rounded-lg gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5 text-blue-500" /> Hospitals ({hospitalsList.length})
                </Button>
                <Button 
                  size="sm" 
                  variant={facilityFilter === "clinics" ? "default" : "secondary"}
                  onClick={() => setFacilityFilter("clinics")}
                  className="text-xs h-8 rounded-lg gap-1.5"
                >
                  <Stethoscope className="w-3.5 h-3.5 text-emerald-500" /> Clinics ({clinicsList.length})
                </Button>
                <Button 
                  size="sm" 
                  variant={facilityFilter === "pharmacies" ? "default" : "secondary"}
                  onClick={() => setFacilityFilter("pharmacies")}
                  className="text-xs h-8 rounded-lg gap-1.5"
                >
                  <Pill className="w-3.5 h-3.5 text-amber-500" /> Pharmacies ({pharmacies.length})
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Form: Add Hospital / Clinic */}
              {isAddingFacility && (
                <div className="p-5 border border-primary/30 rounded-2xl bg-card shadow-md space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                      {isAddingFacility === "clinic" ? <Stethoscope className="w-5 h-5 text-emerald-500" /> : <Building2 className="w-5 h-5 text-blue-500" />}
                      Register New {isAddingFacility === "clinic" ? "Private Clinic" : "Network Hospital"}
                    </h3>
                    <Badge variant="outline" className="text-xs">Direct Verification</Badge>
                  </div>

                  <form onSubmit={handleAddFacility} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Facility Name *</label>
                        <Input 
                          required 
                          placeholder={isAddingFacility === "clinic" ? "e.g. Apex Specialist Clinic" : "e.g. Metro General Hospital"}
                          value={newFacilityForm.name} 
                          onChange={e => setNewFacilityForm({ ...newFacilityForm, name: e.target.value })} 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">City</label>
                        <Input 
                          placeholder="e.g. Boston, New York"
                          value={newFacilityForm.city} 
                          onChange={e => setNewFacilityForm({ ...newFacilityForm, city: e.target.value })} 
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-semibold text-foreground">Full Street Address *</label>
                        <Input 
                          required 
                          placeholder="123 Health Ave, Suite 100"
                          value={newFacilityForm.address} 
                          onChange={e => setNewFacilityForm({ ...newFacilityForm, address: e.target.value })} 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Phone Number</label>
                        <Input 
                          placeholder="+1 555-0100"
                          value={newFacilityForm.phone_number} 
                          onChange={e => setNewFacilityForm({ ...newFacilityForm, phone_number: e.target.value })} 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Email</label>
                        <Input 
                          type="email"
                          placeholder="contact@facility.org"
                          value={newFacilityForm.email} 
                          onChange={e => setNewFacilityForm({ ...newFacilityForm, email: e.target.value })} 
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => setIsAddingFacility(null)}>Cancel</Button>
                      <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">Save Facility</Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Form: Add Pharmacy */}
              {isAddingPharmacy && (
                <div className="p-5 border border-amber-500/30 rounded-2xl bg-card shadow-md space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                      <Pill className="w-5 h-5 text-amber-500" /> Register New Pharmacy Store
                    </h3>
                    <Badge variant="outline" className="text-xs">Direct Verification</Badge>
                  </div>

                  <form onSubmit={handleAddPharmacy} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Store Business Name *</label>
                        <Input 
                          required 
                          placeholder="e.g. Downtown Care Pharmacy"
                          value={newPharmacyForm.business_name} 
                          onChange={e => setNewPharmacyForm({ ...newPharmacyForm, business_name: e.target.value })} 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Store Login Email *</label>
                        <Input 
                          type="email" 
                          required 
                          placeholder="pharmacy@medsync.io"
                          value={newPharmacyForm.email} 
                          onChange={e => setNewPharmacyForm({ ...newPharmacyForm, email: e.target.value })} 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Password (or default generated)</label>
                        <Input 
                          type="password" 
                          placeholder="Default: Pharmacy@123"
                          value={newPharmacyForm.password} 
                          onChange={e => setNewPharmacyForm({ ...newPharmacyForm, password: e.target.value })} 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Pharmacy License / Reg No.</label>
                        <Input 
                          placeholder="e.g. PHARM-99482"
                          value={newPharmacyForm.license_number} 
                          onChange={e => setNewPharmacyForm({ ...newPharmacyForm, license_number: e.target.value })} 
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-semibold text-foreground">
                          Hospital or Clinic Affiliation (Optional)
                        </label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={newPharmacyForm.hospital_id}
                          onChange={e => {
                            const val = e.target.value;
                            const matched = facilities.find(f => f.id === val);
                            setNewPharmacyForm({
                              ...newPharmacyForm,
                              hospital_id: val,
                              clinic_name: matched ? matched.name : "",
                              address: newPharmacyForm.address || (matched?.address || ""),
                              city: newPharmacyForm.city || (matched?.city || ""),
                              state: newPharmacyForm.state || (matched?.state || "")
                            });
                          }}
                        >
                          <option value="">Independent Pharmacy (Not inside hospital/clinic)</option>
                          <optgroup label="Network Hospitals">
                            {hospitalsList.map(h => (
                              <option key={h.id} value={h.id}>{h.name} ({h.city || "Hospital"})</option>
                            ))}
                          </optgroup>
                          <optgroup label="Registered Clinics">
                            {clinicsList.map(c => (
                              <option key={c.id} value={c.id}>{c.name} ({c.city || "Clinic"})</option>
                            ))}
                          </optgroup>
                        </select>
                        <p className="text-[11px] text-muted-foreground">
                          Selecting a hospital or clinic automatically links this pharmacy to all doctors practicing at that facility. Multiple pharmacies can register to the same hospital or clinic.
                        </p>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-semibold text-foreground">Store Physical Address *</label>
                        <Input 
                          required 
                          placeholder="Store address..."
                          value={newPharmacyForm.address} 
                          onChange={e => setNewPharmacyForm({ ...newPharmacyForm, address: e.target.value })} 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">City</label>
                        <Input 
                          placeholder="City"
                          value={newPharmacyForm.city} 
                          onChange={e => setNewPharmacyForm({ ...newPharmacyForm, city: e.target.value })} 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Contact Phone</label>
                        <Input 
                          placeholder="+1 555-0300"
                          value={newPharmacyForm.contact_number} 
                          onChange={e => setNewPharmacyForm({ ...newPharmacyForm, contact_number: e.target.value })} 
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => setIsAddingPharmacy(false)}>Cancel</Button>
                      <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">Save Pharmacy</Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Search Filter */}
              <div className="flex items-center gap-2 max-w-sm">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search facilities by name, city, phone..." 
                  value={facilitySearch}
                  onChange={e => setFacilitySearch(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Facilities Table */}
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                </div>
              ) : filteredFacilities.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
                  No facilities found in this classification.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm">
                  <table className="min-w-full text-left text-xs">
                    <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Facility Name</th>
                        <th className="px-4 py-3">Classification</th>
                        <th className="px-4 py-3">Address & City</th>
                        <th className="px-4 py-3">Contact</th>
                        <th className="px-4 py-3">Verification</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredFacilities.map((f: any) => {
                        const isHosp = f.category === "HOSPITAL";
                        const isClin = f.category === "CLINIC";
                        const isPharm = f.category === "PHARMACY";

                        return (
                          <tr key={f.id || f.user_id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-2">
                              {isHosp && <Building2 className="w-4 h-4 text-blue-500 shrink-0" />}
                              {isClin && <Stethoscope className="w-4 h-4 text-emerald-500 shrink-0" />}
                              {isPharm && <Pill className="w-4 h-4 text-amber-500 shrink-0" />}
                              <span>{f.name}</span>
                            </td>
                            <td className="px-4 py-3">
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] font-bold ${
                                  isHosp ? "bg-blue-500/10 text-blue-600 border-blue-500/30" : 
                                  isClin ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : 
                                  "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                }`}
                              >
                                {f.category}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground max-w-[220px] truncate" title={f.address}>
                              {[f.address, f.city].filter(Boolean).join(", ") || "On record"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {f.phone_number || f.contact_number || f.email || "N/A"}
                            </td>
                            <td className="px-4 py-3">
                              {f.is_verified ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                  <CheckCircle className="w-3 h-3" /> Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                  <Clock className="w-3 h-3" /> Pending
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => setSelectedFacility(f)}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                  title="View Facility Details"
                                >
                                  <Info className="w-3.5 h-3.5" />
                                </Button>
                                {!f.is_verified && !isPharm && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => handleAuthorizeFacility(f.id, f.name)}
                                    className="h-7 text-[11px] text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                                  >
                                    Authorize
                                  </Button>
                                )}
                                {!isPharm && (
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => handleDeleteFacility(f.id, f.name)}
                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                    title="Delete Facility"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                {isPharm && f.user_id && (
                                  <>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      onClick={() => handleToggleUserStatus(f.user_id, f.status, f.name || 'Pharmacy')}
                                      className={`h-7 px-2 text-[11px] font-medium ${(f.status || "").toUpperCase() === "SUSPENDED" ? "text-emerald-600 hover:bg-emerald-500/10" : "text-amber-600 hover:bg-amber-500/10"}`}
                                      title={(f.status || "").toUpperCase() === "SUSPENDED" ? "Activate Pharmacy" : "Suspend Pharmacy"}
                                    >
                                      {(f.status || "").toUpperCase() === "SUSPENDED" ? "Activate" : "Suspend"}
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      onClick={() => handleDeleteUser(f.user_id, 'pharmacy')}
                                      className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                      title="Delete Pharmacy"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 5: ADMINS ─── */}
        <TabsContent value="admins">
          <Card className="border border-border/70 shadow-sm">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">System Administrators</CardTitle>
                  <CardDescription>Manage authorized administrators with full platform management permissions.</CardDescription>
                </div>
                <Button 
                  onClick={() => setIsAddingAdmin(!isAddingAdmin)} 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9 gap-1.5 shadow-sm"
                >
                  {isAddingAdmin ? "Cancel" : <><Plus className="w-4 h-4" /> Add Admin</>}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {isAddingAdmin && (
                <div className="p-5 border border-primary/30 rounded-2xl bg-card shadow-md space-y-4 animate-in fade-in slide-in-from-top-2">
                  <h3 className="font-bold text-sm text-foreground">Create New System Administrator</h3>
                  <form onSubmit={handleAddAdmin} className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="space-y-1 flex-1 w-full">
                      <label className="text-xs font-semibold text-foreground">Admin Email Address *</label>
                      <Input 
                        type="email" 
                        required 
                        placeholder="admin@medsync.io"
                        value={newAdminEmail} 
                        onChange={e => setNewAdminEmail(e.target.value)} 
                      />
                    </div>
                    <div className="space-y-1 flex-1 w-full">
                      <label className="text-xs font-semibold text-foreground">Password *</label>
                      <Input 
                        type="password" 
                        required 
                        minLength={6} 
                        placeholder="Minimum 6 characters"
                        value={newAdminPassword} 
                        onChange={e => setNewAdminPassword(e.target.value)} 
                      />
                    </div>
                    <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 h-10 w-full sm:w-auto">
                      Create Admin
                    </Button>
                  </form>
                </div>
              )}

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                </div>
              ) : admins.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
                  No administrators found.
                </div>
              ) : (
                <div className="divide-y border border-border/60 rounded-xl overflow-hidden bg-card">
                  {admins.map((a: any) => {
                    const isAdminSuspended = (a.status || "").toUpperCase() === "SUSPENDED";
                    return (
                      <div key={a.user_id} className="flex justify-between items-center p-4 hover:bg-muted/10 gap-3">
                        <div>
                          <p className="font-semibold text-foreground text-sm">{a.email}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Added: {a.created_at ? new Date(a.created_at).toLocaleDateString() : "Active"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAdminSuspended ? (
                            <Badge variant="outline" className="text-xs border-red-500/30 text-red-500 bg-red-500/10">
                              Suspended
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                              Super Admin
                            </Badge>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title={isAdminSuspended ? "Activate Admin" : "Suspend Admin"} 
                            className={`h-8 px-2 text-xs font-medium ${isAdminSuspended ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10" : "text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"}`}
                            onClick={() => handleToggleUserStatus(a.user_id, a.status, a.email || 'Admin')}
                          >
                            {isAdminSuspended ? "Activate" : "Suspend"}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Delete Admin" 
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10" 
                            onClick={() => handleDeleteUser(a.user_id, 'admin')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── REVIEW VERIFICATION MODAL ─── */}
      {selectedVerification && (() => {
        const req = selectedVerification;
        const isWorkplace = req.verification_type === "WORKPLACE_AFFILIATION";
        const isDoctor = req.role === "DOCTOR";
        const prof = req.profile || {};
        const facility = req.facility || {};
        const isClinic = prof.practice_type === "CLINIC" || prof.clinic_name || facility.type === "CLINIC" || facility.type === "clinic";
        const appliedHosp = prof.applied_hospital_info;
        const clinicInfo = prof.clinic_info;
        const gstNo = prof.gst_number;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-background border border-border/80 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto">
              <div className="p-6 border-b border-border/60 flex items-start justify-between bg-muted/20">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={isDoctor ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"}>
                      {req.role}
                    </Badge>
                    {isWorkplace ? (
                      <Badge className="bg-blue-600 text-white text-xs gap-1">
                        <Briefcase className="w-3 h-3" /> Workplace Practice Affiliation
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-xs">
                        <Clock className="w-3 h-3 mr-1" /> Pending Approval
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    {isDoctor ? formatDoctorName(prof.full_name || req.email) : (prof.business_name || req.email)}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isWorkplace 
                      ? "Doctor practice workplace affiliation request awaiting administrative authorization." 
                      : "Submitted application for MedSync credentialing and network authorization."}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedVerification(null)} className="h-8 w-8 p-0 rounded-full">
                  ✕
                </Button>
              </div>

              <div className="p-6 space-y-6">
                {/* Facility Affiliation Details */}
                <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/[0.03] space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-blue-600" /> Practice Facility Details
                  </h3>
                  {isWorkplace ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-foreground font-bold text-base">{facility.name || "Medical Facility"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-blue-600" />
                            {[facility.address, facility.city, facility.state].filter(Boolean).join(", ") || "Address on file"}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 uppercase text-xs">
                          {facility.type || "Hospital"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-blue-500/20 text-xs">
                        {facility.working_days && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5 text-blue-600" />
                            <span>Working Days: <strong className="text-foreground">{facility.working_days}</strong></span>
                          </div>
                        )}
                        {facility.consultation_hours && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            <span>Hours: <strong className="text-foreground">{facility.consultation_hours}</strong></span>
                          </div>
                        )}
                        {facility.phone && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="w-3.5 h-3.5 text-blue-600" />
                            <span>Facility Contact: <strong className="text-foreground">{facility.phone}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : isDoctor ? (
                    isClinic ? (
                      <div className="space-y-1 text-sm bg-emerald-500/[0.04] p-3 rounded-lg border border-emerald-500/20">
                        <p className="font-semibold text-emerald-700 dark:text-emerald-400">Private Clinic Registration</p>
                        <p className="text-foreground font-medium">{clinicInfo?.name || prof.clinic_name || "Clinic"}</p>
                        <p className="text-xs text-muted-foreground">{clinicInfo?.address || prof.clinic_address}</p>
                      </div>
                    ) : (
                      <div className="space-y-1 text-sm bg-blue-500/[0.04] p-3 rounded-lg border border-blue-500/20">
                        <p className="font-semibold text-blue-700 dark:text-blue-400">Hospital Affiliation</p>
                        <p className="text-foreground font-medium">{appliedHosp?.name || prof.hospital_name || "Hospital"}</p>
                        <p className="text-xs text-muted-foreground">{appliedHosp?.address || prof.hospital_address}</p>
                      </div>
                    )
                  ) : (
                    <div className="space-y-1 text-sm bg-amber-500/[0.04] p-3 rounded-lg border border-amber-500/20">
                      <p className="font-semibold text-amber-700 dark:text-amber-400">Pharmacy Store</p>
                      <p className="text-foreground font-medium">{prof.business_name}</p>
                      <p className="text-xs text-muted-foreground">{prof.address}, {prof.city}</p>
                    </div>
                  )}
                </div>

                {/* Doctor / Professional Credentials */}
                <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-primary" /> Physician Identity & Credentials
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">Email Address</span>
                      <p className="font-medium text-foreground">{req.email}</p>
                    </div>
                    {prof.clinic_phone && (
                      <div>
                        <span className="text-xs text-muted-foreground">Contact Phone</span>
                        <p className="font-medium text-foreground">{prof.clinic_phone}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-muted-foreground">License No.</span>
                      <p className="font-semibold text-foreground">{prof.license_number || "N/A"}</p>
                    </div>
                    {prof.medical_council_reg_number && (
                      <div>
                        <span className="text-xs text-muted-foreground">Council Registration</span>
                        <p className="font-semibold text-foreground">{prof.medical_council_reg_number}</p>
                      </div>
                    )}
                    {prof.specialization && (
                      <div>
                        <span className="text-xs text-muted-foreground">Specialization</span>
                        <p className="font-medium text-foreground">{prof.specialization}</p>
                      </div>
                    )}
                    {prof.experience_years !== undefined && prof.experience_years !== null && (
                      <div>
                        <span className="text-xs text-muted-foreground">Clinical Experience</span>
                        <p className="font-medium text-foreground">{prof.experience_years} years</p>
                      </div>
                    )}
                    {gstNo && (
                      <div>
                        <span className="text-xs text-muted-foreground">GST No.</span>
                        <p className="font-semibold text-foreground">{gstNo}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-border/60 flex flex-col sm:flex-row justify-end items-center gap-3 bg-muted/20">
                <Button variant="outline" onClick={() => setSelectedVerification(null)} disabled={actionLoading === req.request_id}>
                  Cancel
                </Button>
                <Button 
                  variant="outline" 
                  disabled={actionLoading === req.request_id}
                  className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
                  onClick={() => handleReject(req.request_id)}
                >
                  Reject
                </Button>
                <Button 
                  disabled={actionLoading === req.request_id}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-md"
                  onClick={() => handleApprove(req.request_id)}
                >
                  {actionLoading === req.request_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  {isWorkplace ? "Authorize Affiliation" : "Verify & Authorize"}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── PATIENT DETAILS MODAL ─── */}
      <Dialog open={!!selectedPatient} onOpenChange={(open) => !open && setSelectedPatient(null)}>
        <DialogContent className="max-w-xl p-0 overflow-hidden rounded-2xl border border-border/80 shadow-2xl bg-card">
          {selectedPatient && (
            <div>
              {/* Header Banner */}
              <div className="p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/60">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-bold text-lg border border-primary/25 shadow-sm">
                      {selectedPatient.full_name?.charAt(0)?.toUpperCase() || "P"}
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-bold text-foreground">
                        {selectedPatient.full_name}
                      </DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                        {selectedPatient.email}
                      </DialogDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs font-medium">
                    {selectedPatient.status ? String(selectedPatient.status).toUpperCase() : "ACTIVE"}
                  </Badge>
                </div>
              </div>

              {/* Body Content */}
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                {/* Core Attributes Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60">
                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                      <Heart className="w-3.5 h-3.5 text-rose-500" /> Blood Group
                    </span>
                    <p className="text-sm font-bold text-foreground">
                      {selectedPatient.blood_group || "Not recorded"}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60">
                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                      <User className="w-3.5 h-3.5 text-blue-500" /> Age & Gender
                    </span>
                    <p className="text-sm font-semibold text-foreground">
                      {calculateAge(selectedPatient.date_of_birth) 
                        ? `${calculateAge(selectedPatient.date_of_birth)} • ${selectedPatient.gender || "N/A"}`
                        : (selectedPatient.gender || "Not recorded")}
                    </p>
                    {selectedPatient.date_of_birth && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        DOB: {selectedPatient.date_of_birth}
                      </p>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 col-span-2 sm:col-span-1">
                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" /> Account Created
                    </span>
                    <p className="text-xs font-semibold text-foreground">
                      {formatAccountDate(selectedPatient.created_at)}
                    </p>
                  </div>
                </div>

                {/* Contact & Address Section */}
                <div className="p-4 rounded-xl border border-border/60 bg-muted/15 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> Contact & Location
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Phone Number:</span>
                      <p className="font-medium text-foreground mt-0.5">
                        {selectedPatient.phone_number || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">City & State:</span>
                      <p className="font-medium text-foreground mt-0.5">
                        {[selectedPatient.city, selectedPatient.state, selectedPatient.country, selectedPatient.pincode].filter(Boolean).join(", ") || "Not provided"}
                      </p>
                    </div>
                    {selectedPatient.address && (
                      <div className="col-span-full">
                        <span className="text-muted-foreground">Street Address:</span>
                        <p className="font-medium text-foreground mt-0.5">{selectedPatient.address}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Emergency Contact */}
                {(selectedPatient.emergency_contact_name || selectedPatient.emergency_contact_number) && (
                  <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/[0.04] space-y-1.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> Emergency Contact
                    </h4>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1 pt-1">
                      <span className="font-medium text-foreground">{selectedPatient.emergency_contact_name || "Contact Person"}</span>
                      <span className="text-muted-foreground font-mono">{selectedPatient.emergency_contact_number || "No number"}</span>
                    </div>
                  </div>
                )}

                {/* Medical Profile & Alerts */}
                {(selectedPatient.allergies || selectedPatient.chronic_diseases || selectedPatient.medical_alerts) ? (
                  <div className="p-4 rounded-xl border border-border/60 bg-muted/15 space-y-2.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Medical Profile & Alerts
                    </h4>
                    {selectedPatient.allergies && (
                      <div className="text-xs">
                        <span className="text-muted-foreground font-medium">Allergies: </span>
                        <span className="text-foreground">{selectedPatient.allergies}</span>
                      </div>
                    )}
                    {selectedPatient.chronic_diseases && (
                      <div className="text-xs">
                        <span className="text-muted-foreground font-medium">Chronic Diseases: </span>
                        <span className="text-foreground">{selectedPatient.chronic_diseases}</span>
                      </div>
                    )}
                    {selectedPatient.medical_alerts && (
                      <div className="text-xs">
                        <span className="text-muted-foreground font-medium">Alerts: </span>
                        <span className="text-foreground">{selectedPatient.medical_alerts}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-dashed border-border/60 text-center">
                    <p className="text-xs text-muted-foreground">No critical medical alerts or allergies recorded.</p>
                  </div>
                )}

                {/* System Identifiers */}
                <div className="pt-2 text-[11px] text-muted-foreground flex flex-col gap-1 font-mono border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <span>User Account ID:</span>
                    <span className="text-foreground/80">{selectedPatient.user_id}</span>
                  </div>
                  {selectedPatient.id && (
                    <div className="flex items-center justify-between">
                      <span>Patient Profile ID:</span>
                      <span className="text-foreground/80">{selectedPatient.id}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border/60 flex justify-end bg-muted/20">
                <Button variant="outline" size="sm" onClick={() => setSelectedPatient(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── FACILITY DETAILS MODAL ─── */}
      <Dialog open={!!selectedFacility} onOpenChange={(open) => !open && setSelectedFacility(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl border border-border/80 shadow-2xl bg-card">
          {selectedFacility && (
            <div>
              {/* Header Banner */}
              <div className="p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/60">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-bold text-lg border border-primary/25 shadow-sm">
                      {selectedFacility.category === "HOSPITAL" && <Building2 className="w-6 h-6 text-blue-500" />}
                      {selectedFacility.category === "CLINIC" && <Stethoscope className="w-6 h-6 text-emerald-500" />}
                      {selectedFacility.category === "PHARMACY" && <Pill className="w-6 h-6 text-amber-500" />}
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-bold text-foreground">
                        {selectedFacility.name}
                      </DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                        {selectedFacility.category} • {selectedFacility.city || "Location on record"}
                      </DialogDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-xs font-medium ${
                    selectedFacility.is_verified 
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" 
                      : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                  }`}>
                    {selectedFacility.is_verified ? "VERIFIED" : "PENDING"}
                  </Badge>
                </div>
              </div>

              {/* Body Content */}
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60">
                    <span className="text-[11px] font-medium text-muted-foreground block mb-1">Classification</span>
                    <span className="text-sm font-bold text-foreground">{selectedFacility.category}</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                      {selectedFacility.category === "HOSPITAL" ? "type == 'hospital'" : selectedFacility.category === "CLINIC" ? "type == 'clinic'" : "dispensing store"}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60">
                    <span className="text-[11px] font-medium text-muted-foreground block mb-1">Status</span>
                    <span className="text-sm font-bold text-foreground">
                      {selectedFacility.status || (selectedFacility.is_active !== false ? "Active" : "Inactive")}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Network status</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border/60 bg-muted/15 space-y-2.5 text-xs">
                  <h4 className="font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> Location & Contact Information
                  </h4>
                  <div>
                    <span className="text-muted-foreground">Physical Address:</span>
                    <p className="font-medium text-foreground mt-0.5">{selectedFacility.address || "Not specified"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-muted-foreground">City & State:</span>
                      <p className="font-medium text-foreground mt-0.5">{[selectedFacility.city, selectedFacility.state, selectedFacility.pincode].filter(Boolean).join(", ") || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Contact Phone:</span>
                      <p className="font-medium text-foreground mt-0.5">{selectedFacility.phone_number || selectedFacility.contact_number || "N/A"}</p>
                    </div>
                  </div>
                  {selectedFacility.email && (
                    <div className="pt-1">
                      <span className="text-muted-foreground">Contact Email:</span>
                      <p className="font-medium text-foreground mt-0.5">{selectedFacility.email}</p>
                    </div>
                  )}
                </div>

                {selectedFacility.license_number && (
                  <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 text-xs">
                    <span className="text-muted-foreground block mb-0.5">License / Registration Number</span>
                    <p className="font-mono font-semibold text-foreground">{selectedFacility.license_number}</p>
                  </div>
                )}

                {/* System Identifiers */}
                <div className="pt-2 text-[11px] text-muted-foreground flex flex-col gap-1 font-mono border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <span>Facility ID:</span>
                    <span className="text-foreground/80">{selectedFacility.id || selectedFacility.user_id}</span>
                  </div>
                  {selectedFacility.user_id && (
                    <div className="flex items-center justify-between">
                      <span>Linked User Account:</span>
                      <span className="text-foreground/80">{selectedFacility.user_id}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border/60 flex justify-end bg-muted/20">
                <Button variant="outline" size="sm" onClick={() => setSelectedFacility(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
