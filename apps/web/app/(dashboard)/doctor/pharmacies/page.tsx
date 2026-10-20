"use client";

import { useEffect, useState } from "react";
import { 
  Card, CardContent, CardHeader, CardTitle, Badge, Input, Skeleton, 
  Button, Select, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@medsync/ui";
import { 
  Search, MapPin, Store, Clock, Phone, ShieldCheck, Star, Building, 
  CheckCircle, Plus, Building2, Link2, Unlink, ShieldAlert, Loader2 
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.05 } } };

interface LinkedFacilityInfo {
  name: string;
  type: string;
  status: string;
  isDirect?: boolean;
}

export default function DoctorPharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [doctorFacilities, setDoctorFacilities] = useState<any[]>([]);
  const [allHospitals, setAllHospitals] = useState<any[]>([]);
  const [directAffiliationIds, setDirectAffiliationIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal: Add Workplace Facility
  const [isAddWorkplaceModalOpen, setIsAddWorkplaceModalOpen] = useState(false);
  const [submittingWorkplace, setSubmittingWorkplace] = useState(false);
  const [workplaceFormData, setWorkplaceFormData] = useState({
    location_type: "HOSPITAL",
    hospital_id: "",
    location_name: "",
    address: "",
    city: "",
    phone: "",
    working_days: "Mon, Wed, Fri",
    consultation_hours: "10:00 AM - 02:00 PM",
  });

  // Modal: Link Partner Pharmacy
  const [isLinkPharmacyModalOpen, setIsLinkPharmacyModalOpen] = useState(false);
  const [submittingLink, setSubmittingLink] = useState(false);
  const [selectedPharmacyToLink, setSelectedPharmacyToLink] = useState("");

  // Action loading state for quick link/unlink buttons
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    loadPharmacies();
  }, []);

  async function loadPharmacies() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Fetch doctor profile, registered hospitals/clinics, doctor locations, and direct affiliations
      const [docRes, hospRes, locsRes, affilsRes] = await Promise.all([
        supabase.from("doctors").select("id, hospital_id, clinic_name").eq("user_id", session.user.id).maybeSingle(),
        api.get("/api/v1/hospitals").catch(() => ({ data: { data: [] } })),
        api.get("/api/v1/doctor-locations").catch(() => ({ data: { data: [] } })),
        api.get("/api/v1/doctor-locations/affiliate-pharmacy").catch(() => ({ data: { data: [] } })),
      ]);

      const doctorProfile = docRes.data;
      const fetchedHospitals = hospRes.data?.data || [];
      const doctorLocations = locsRes.data?.data || [];
      const directAffiliations = affilsRes.data?.data || [];

      setAllHospitals(fetchedHospitals);

      const directIds = new Set<string>(directAffiliations.map((a: any) => String(a.pharmacy_id)));
      setDirectAffiliationIds(directIds);

      // Facility ID -> Facility Info
      const facilityIdMap = new Map<string, LinkedFacilityInfo>();
      // Facility Name (lowercased) -> Facility Info
      const facilityNameMap = new Map<string, LinkedFacilityInfo>();
      const facilitiesList: { id?: string; name: string; type: string; status: string }[] = [];

      // Primary hospital
      if (doctorProfile?.hospital_id) {
        const hospId = String(doctorProfile.hospital_id);
        const matched = fetchedHospitals.find((h: any) => h.id === doctorProfile.hospital_id);
        const name = matched?.name || "Primary Hospital";
        const type = (matched?.type || "hospital").toLowerCase() === "clinic" ? "Clinic" : "Hospital";
        facilityIdMap.set(hospId, { name, type, status: "APPROVED" });
        facilityNameMap.set(name.toLowerCase(), { name, type, status: "APPROVED" });
        facilitiesList.push({ id: hospId, name, type, status: "APPROVED" });
      }

      // Primary clinic
      if (doctorProfile?.clinic_name) {
        const name = doctorProfile.clinic_name.trim();
        facilityNameMap.set(name.toLowerCase(), { name, type: "Clinic", status: "APPROVED" });
        facilitiesList.push({ name, type: "Clinic", status: "APPROVED" });
      }

      // Clinics owned by doctor in hospitals table
      fetchedHospitals
        .filter((h: any) => h.user_id === session.user.id && (h.type || "").toLowerCase() === "clinic")
        .forEach((h: any) => {
          const hospId = String(h.id);
          const name = h.name.trim();
          facilityIdMap.set(hospId, { name, type: "Clinic", status: h.is_verified ? "APPROVED" : "PENDING" });
          facilityNameMap.set(name.toLowerCase(), { name, type: "Clinic", status: h.is_verified ? "APPROVED" : "PENDING" });
          facilitiesList.push({ id: hospId, name, type: "Clinic", status: h.is_verified ? "APPROVED" : "PENDING" });
        });

      // Doctor workplace locations (both HOSPITAL and CLINIC)
      doctorLocations.forEach((loc: any) => {
        const name = loc.location_name || (loc.hospital_id ? fetchedHospitals.find((h: any) => h.id === loc.hospital_id)?.name : "Workplace Facility");
        const type = (loc.location_type || "HOSPITAL").toUpperCase() === "CLINIC" ? "Clinic" : "Hospital";
        const status = loc.verification_status || "PENDING";

        if (loc.hospital_id) {
          facilityIdMap.set(String(loc.hospital_id), { name, type, status });
        }
        if (name) {
          facilityNameMap.set(name.toLowerCase(), { name, type, status });
        }
        facilitiesList.push({ id: loc.hospital_id, name, type, status });
      });

      setDoctorFacilities(facilitiesList);

      // 2. Fetch all registered pharmacies
      const { data: pharmacyProfiles, error } = await supabase.from("pharmacies").select("*");
      if (error) throw error;

      if (pharmacyProfiles && pharmacyProfiles.length > 0) {
        const userIds = pharmacyProfiles.map(p => p.user_id);
        const { data: usersData } = await supabase
          .from("users")
          .select("id, full_name, email, status, is_verified")
          .in("id", userIds);

        const mapped = pharmacyProfiles
          .map(profile => {
            const user = usersData?.find(u => u.id === profile.user_id);
            const pharmacyUserId = String(profile.user_id);
            const pHospitalId = profile.hospital_id ? String(profile.hospital_id) : "";
            const pClinicName = (profile.clinic_name || "").trim().toLowerCase();

            let linkedInfo: LinkedFacilityInfo | null = null;

            // Direct partner affiliation
            if (directIds.has(pharmacyUserId)) {
              linkedInfo = {
                name: "Direct Practice Partner",
                type: "Direct Partner",
                status: "APPROVED",
                isDirect: true,
              };
            } 
            // Hospital or Clinic ID match
            else if (pHospitalId && facilityIdMap.has(pHospitalId)) {
              linkedInfo = facilityIdMap.get(pHospitalId)!;
            } 
            // Clinic name match
            else if (pClinicName && facilityNameMap.has(pClinicName)) {
              linkedInfo = facilityNameMap.get(pClinicName)!;
            }

            const isLinked = linkedInfo !== null;
            const isActive = user?.status === "ACTIVE";

            // If linked to doctor facility, show even if pending approval; otherwise only active
            if (!isLinked && !isActive) return null;

            return {
              ...profile,
              full_name: profile.business_name || user?.full_name || "Pharmacy",
              email: user?.email,
              status: user?.status || "PENDING",
              is_verified: user?.is_verified ?? false,
              isLinked,
              linkedFacility: linkedInfo,
              isDirectAffiliate: linkedInfo?.isDirect || false,
            };
          })
          .filter(Boolean)
          .sort((a: any, b: any) => (b.isLinked ? 1 : 0) - (a.isLinked ? 1 : 0));

        setPharmacies(mapped);
      }
    } catch (err) {
      console.error("Error loading pharmacies", err);
    } finally {
      setLoading(false);
    }
  }

  // Handle adding workplace facility (Hospital or Clinic from existing network)
  const handleAddWorkplaceFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workplaceFormData.hospital_id) {
      toast.error(`Please select a ${workplaceFormData.location_type === "HOSPITAL" ? "hospital" : "clinic"} from the MedSync network`);
      return;
    }

    setSubmittingWorkplace(true);
    try {
      const matched = allHospitals.find(h => h.id === workplaceFormData.hospital_id);
      const payload = {
        location_type: workplaceFormData.location_type,
        hospital_id: workplaceFormData.hospital_id,
        location_name: matched?.name || workplaceFormData.location_name,
        address: matched?.address || workplaceFormData.address,
        city: matched?.city || workplaceFormData.city,
        phone: matched?.phone_number || workplaceFormData.phone,
        working_days: workplaceFormData.working_days,
        consultation_hours: workplaceFormData.consultation_hours,
        is_primary: false,
      };

      await api.post('/api/v1/doctor-locations', payload);
      toast.success("Workplace facility added! Submitted for administrative verification.");
      setIsAddWorkplaceModalOpen(false);

      // Reset modal state
      setWorkplaceFormData({
        location_type: "HOSPITAL",
        hospital_id: "",
        location_name: "",
        address: "",
        city: "",
        phone: "",
        working_days: "Mon, Wed, Fri",
        consultation_hours: "10:00 AM - 02:00 PM",
      });

      // Reload pharmacies and facilities
      await loadPharmacies();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to add workplace facility");
    } finally {
      setSubmittingWorkplace(false);
    }
  };

  // Handle linking a registered pharmacy directly as partner
  const handleLinkDirectPharmacy = async (pharmacyUserId: string) => {
    setActionLoadingId(pharmacyUserId);
    try {
      await api.post('/api/v1/doctor-locations/affiliate-pharmacy', {
        pharmacy_id: pharmacyUserId,
      });
      toast.success("Pharmacy successfully linked to your practice!");
      setIsLinkPharmacyModalOpen(false);
      setSelectedPharmacyToLink("");
      await loadPharmacies();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to link pharmacy");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle unlinking a direct partner pharmacy
  const handleUnlinkDirectPharmacy = async (pharmacyUserId: string) => {
    setActionLoadingId(pharmacyUserId);
    try {
      await api.delete(`/api/v1/doctor-locations/affiliate-pharmacy/${pharmacyUserId}`);
      toast.success("Pharmacy unlinked from your direct practice partners.");
      await loadPharmacies();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to unlink pharmacy");
    } finally {
      setActionLoadingId(null);
    }
  };

  const linkedPharmacies = pharmacies.filter(p => p.isLinked);
  const otherPharmacies = pharmacies.filter(p => !p.isLinked);

  const filterList = (list: any[]) => list.filter(p => 
    (p.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.clinic_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.city || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.address || "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredLinked = filterList(linkedPharmacies);
  const filteredOther = filterList(otherPharmacies);

  return (
    <div className="relative space-y-8 pb-12 max-w-6xl mx-auto">
      {/* ─── Header & Action Buttons ─── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
            Network & Practice Pharmacies
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl leading-relaxed">
            View dispensing pharmacies linked to your affiliated hospitals, clinics, and direct practice partnerships.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <Button 
            onClick={() => setIsAddWorkplaceModalOpen(true)}
            variant="outline"
            className="gap-1.5 shadow-sm border-primary/30 text-primary hover:bg-primary/10"
          >
            <Building2 className="w-4 h-4" />
            + Add Workplace Facility
          </Button>

          <Button 
            onClick={() => setIsLinkPharmacyModalOpen(true)}
            className="gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link2 className="w-4 h-4" />
            + Link Partner Pharmacy
          </Button>
        </div>
      </motion.div>

      {/* ─── Search Bar ─── */}
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search pharmacies by name, facility, city, or address..." 
          className="pl-10 bg-muted/40 border-border/60 focus-visible:border-primary h-11 rounded-xl"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ─── SECTION 1: Pharmacies Registered Under Your Hospitals & Clinics ─── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/60 pb-3 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Building className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-bold text-foreground">
              Pharmacies Registered Under Your Facilities
            </h2>
            {doctorFacilities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 ml-1">
                {doctorFacilities.slice(0, 3).map((f, i) => (
                  <Badge key={i} variant="secondary" className="text-[11px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    {f.type === "Clinic" ? "🩺 " : "🏥 "}
                    {f.name}
                  </Badge>
                ))}
                {doctorFacilities.length > 3 && (
                  <Badge variant="outline" className="text-[11px]">
                    +{doctorFacilities.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {linkedPharmacies.length} {linkedPharmacies.length === 1 ? "pharmacy" : "pharmacies"} linked to your practice
          </span>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-52 w-full rounded-2xl" />)}
          </div>
        ) : filteredLinked.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-500/[0.03] text-center space-y-3">
            <Store className="h-10 w-10 text-emerald-500/60 mx-auto" />
            <h3 className="text-base font-semibold text-foreground">
              No pharmacies linked to your practice facilities yet
            </h3>
            <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed">
              When a pharmacy registers under any hospital or clinic where you work, it automatically appears here. 
              Multiple pharmacies can register to the same facility. You can also link any registered MedSync pharmacy directly.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button size="sm" variant="outline" onClick={() => setIsAddWorkplaceModalOpen(true)} className="gap-1 text-xs">
                <Building2 className="w-3.5 h-3.5" /> Add Workplace Facility
              </Button>
              <Button size="sm" onClick={() => setIsLinkPharmacyModalOpen(true)} className="gap-1 text-xs">
                <Link2 className="w-3.5 h-3.5" /> Link Partner Pharmacy
              </Button>
            </div>
          </div>
        ) : (
          <motion.div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" initial="hidden" animate="visible" variants={stagger}>
            {filteredLinked.map(pharmacy => {
              const fac = pharmacy.linkedFacility;
              const isDirect = pharmacy.isDirectAffiliate;
              const isFacilityPending = fac?.status === "PENDING";

              return (
                <motion.div key={pharmacy.id} variants={fadeUp}>
                  <Card className="group overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-card hover:border-emerald-500 transition-all hover:-translate-y-1 hover:shadow-lg h-full flex flex-col">
                    <CardHeader className="pb-3 border-b border-border/50 bg-emerald-500/[0.04]">
                      <div className="flex justify-between items-start gap-2">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 mb-2">
                          <Store className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold text-xs">
                            <Star className="mr-1 h-3.5 w-3.5 fill-emerald-500 text-emerald-500" /> 
                            {isDirect ? "Direct Partner" : `${fac?.type || "Facility"} Partner`}
                          </Badge>
                          {isFacilityPending && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                              Facility Verification Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardTitle className="text-base line-clamp-1">{pharmacy.full_name || "Practice Pharmacy"}</CardTitle>
                      
                      {/* Facility Link Tag */}
                      <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 mt-1">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="line-clamp-1">
                          {isDirect ? "Direct Physician Partnership" : `Registered at ${fac?.name || "Facility"}`}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 flex flex-col flex-1 justify-between">
                      <div className="space-y-2.5 text-sm">
                        <div className="flex items-start gap-2 text-muted-foreground text-xs">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">
                            {[pharmacy.address, pharmacy.city, pharmacy.state].filter(Boolean).join(", ") || "Address on file"}
                          </span>
                        </div>
                        {pharmacy.contact_number && (
                          <div className="flex items-center gap-2 text-muted-foreground text-xs">
                            <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{pharmacy.contact_number}</span>
                          </div>
                        )}
                        {pharmacy.operating_hours && (
                          <div className="flex items-center gap-2 text-muted-foreground text-xs">
                            <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{pharmacy.operating_hours}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-border/50 flex justify-between items-center text-xs text-muted-foreground">
                        <span>License: {pharmacy.license_number || "Verified"}</span>
                        {isDirect ? (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            disabled={actionLoadingId === pharmacy.user_id}
                            onClick={() => handleUnlinkDirectPharmacy(pharmacy.user_id)}
                            className="h-7 text-[11px] text-destructive hover:bg-destructive/10 px-2"
                          >
                            <Unlink className="w-3 h-3 mr-1" /> Unlink
                          </Button>
                        ) : (
                          <span className="flex items-center text-emerald-600 font-medium">
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Linked
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* ─── SECTION 2: All MedSync Network Pharmacies ─── */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              All MedSync Network Pharmacies
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Licensed pharmacies across the MedSync network. You can link any pharmacy directly to your practice.
            </p>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {filteredOther.length} pharmacies available
          </span>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-52 w-full rounded-2xl" />)}
          </div>
        ) : filteredOther.length === 0 ? (
          <Card className="rounded-2xl border border-dashed bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Store className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">No other pharmacies found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {search ? "Try adjusting your search terms." : "All network pharmacies are already linked to your practice."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <motion.div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" initial="hidden" animate="visible" variants={stagger}>
            {filteredOther.map(pharmacy => (
              <motion.div key={pharmacy.id} variants={fadeUp}>
                <Card className="group overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-all hover:-translate-y-1 hover:shadow-lg h-full flex flex-col justify-between">
                  <div>
                    <CardHeader className="pb-3 border-b border-border/50">
                      <div className="flex justify-between items-start">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 mb-2">
                          <Store className="h-5 w-5 text-blue-500" />
                        </div>
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
                          <ShieldCheck className="mr-1 h-3 w-3" /> Verified Network
                        </Badge>
                      </div>
                      <CardTitle className="text-base line-clamp-1">{pharmacy.full_name || "MedSync Pharmacy"}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-2.5 text-xs text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <span className="line-clamp-2">
                          {[pharmacy.address, pharmacy.city, pharmacy.state].filter(Boolean).join(", ") || "Address on file"}
                        </span>
                      </div>
                      {pharmacy.contact_number && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span>{pharmacy.contact_number}</span>
                        </div>
                      )}
                      {pharmacy.operating_hours && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span>{pharmacy.operating_hours}</span>
                        </div>
                      )}
                    </CardContent>
                  </div>

                  <div className="p-4 pt-0">
                    <div className="pt-3 border-t border-border/50 flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Lic: {pharmacy.license_number || "Active"}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoadingId === pharmacy.user_id}
                        onClick={() => handleLinkDirectPharmacy(pharmacy.user_id)}
                        className="h-8 text-xs border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 gap-1"
                      >
                        {actionLoadingId === pharmacy.user_id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Link2 className="w-3.5 h-3.5" />
                        )}
                        Link as Partner
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* ─── MODAL 1: Add Workplace Facility ─── */}
      <Dialog open={isAddWorkplaceModalOpen} onOpenChange={setIsAddWorkplaceModalOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Building2 className="w-5 h-5 text-primary" />
              Add Workplace Facility
            </DialogTitle>
            <DialogDescription>
              Select an existing registered hospital or clinic where you practice. This will link pharmacies registered under that facility to your practice.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs flex gap-2.5 items-start mt-2">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Requires Administrative Verification</p>
              <p className="opacity-90 mt-0.5">
                Practice affiliations go to the MedSync administration panel for verification. You can only select verified facilities in the network.
              </p>
            </div>
          </div>

          <form onSubmit={handleAddWorkplaceFacility} className="space-y-4 mt-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Facility Type *</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={workplaceFormData.location_type}
                onChange={(e) => {
                  setWorkplaceFormData({
                    ...workplaceFormData,
                    location_type: e.target.value,
                    hospital_id: "",
                    location_name: "",
                    address: "",
                    city: "",
                    phone: ""
                  });
                }}
              >
                <option value="HOSPITAL">Hospital / Medical Center</option>
                <option value="CLINIC">Private Clinic / Consultation Chamber</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Select {workplaceFormData.location_type === "HOSPITAL" ? "Hospital" : "Clinic"} from MedSync Network *
              </label>
              <Select 
                value={workplaceFormData.hospital_id} 
                onChange={(e) => {
                  const sel = allHospitals.find(h => h.id === e.target.value);
                  if (sel) {
                    setWorkplaceFormData(prev => ({
                      ...prev,
                      hospital_id: sel.id,
                      location_name: sel.name,
                      address: sel.address || "",
                      city: sel.city || "",
                      phone: sel.phone_number || sel.clinic_phone || ""
                    }));
                  }
                }}
              >
                <option value="" disabled>Select {workplaceFormData.location_type === "HOSPITAL" ? "hospital" : "clinic"} from MedSync network...</option>
                {allHospitals
                  .filter(h => workplaceFormData.location_type === "HOSPITAL"
                    ? (h.type || "").toLowerCase() !== "clinic"
                    : (h.type || "").toLowerCase() === "clinic"
                  )
                  .map(h => (
                    <option key={h.id} value={h.id}>
                      {workplaceFormData.location_type === "HOSPITAL" ? "🏥 " : "🩺 "}
                      {h.name} - {h.city || "Bengaluru"}
                    </option>
                  ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Facility Address</label>
              <Input 
                required
                readOnly
                className="bg-muted/50 cursor-not-allowed text-xs"
                value={workplaceFormData.address}
                placeholder="Select a registered facility above to view address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Working Days</label>
                <Input 
                  value={workplaceFormData.working_days}
                  onChange={(e) => setWorkplaceFormData({ ...workplaceFormData, working_days: e.target.value })}
                  placeholder="e.g. Mon, Wed, Fri"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Consultation Hours</label>
                <Input 
                  value={workplaceFormData.consultation_hours}
                  onChange={(e) => setWorkplaceFormData({ ...workplaceFormData, consultation_hours: e.target.value })}
                  placeholder="e.g. 10:00 AM - 02:00 PM"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAddWorkplaceModalOpen(false)}
                disabled={submittingWorkplace}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submittingWorkplace || !workplaceFormData.hospital_id}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
              >
                {submittingWorkplace ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Submit to Admin for Approval
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: Link Partner Pharmacy ─── */}
      <Dialog open={isLinkPharmacyModalOpen} onOpenChange={setIsLinkPharmacyModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Link2 className="w-5 h-5 text-primary" />
              Link Partner Pharmacy
            </DialogTitle>
            <DialogDescription>
              Select a registered MedSync pharmacy to link directly with your clinical practice for prescription fulfillment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Select Network Pharmacy *</label>
              <Select
                value={selectedPharmacyToLink}
                onChange={(e) => setSelectedPharmacyToLink(e.target.value)}
              >
                <option value="" disabled>Select a pharmacy to affiliate...</option>
                {otherPharmacies.map(p => (
                  <option key={p.user_id} value={p.user_id}>
                    {p.full_name} ({p.city || "Bengaluru"})
                  </option>
                ))}
              </Select>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsLinkPharmacyModalOpen(false)}
                disabled={submittingLink}
              >
                Cancel
              </Button>
              <Button 
                type="button"
                disabled={submittingLink || !selectedPharmacyToLink}
                onClick={() => handleLinkDirectPharmacy(selectedPharmacyToLink)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
              >
                {submittingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                Link Pharmacy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
