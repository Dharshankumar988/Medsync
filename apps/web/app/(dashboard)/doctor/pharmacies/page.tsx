"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Badge, Input, Skeleton } from "@medsync/ui";
import { Search, MapPin, Store, Clock, Phone, ShieldCheck, Star, Building, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.05 } } };

export default function DoctorPharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [doctorClinicNames, setDoctorClinicNames] = useState<string[]>([]);
  const [primaryClinicName, setPrimaryClinicName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadPharmacies() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        // 1. Fetch doctor profile and all associated clinic names / IDs
        const [docRes, hospRes, locsRes] = await Promise.all([
          supabase.from("doctors").select("id, hospital_id, clinic_name").eq("user_id", session.user.id).maybeSingle(),
          api.get("/api/v1/hospitals").catch(() => ({ data: { data: [] } })),
          api.get("/api/v1/doctor-locations").catch(() => ({ data: { data: [] } }))
        ]);

        const doctorProfile = docRes.data;
        const allHospitals = hospRes.data?.data || [];
        const doctorLocations = locsRes.data?.data || [];

        const clinicNamesSet = new Set<string>();
        const clinicIdsSet = new Set<string>();

        if (doctorProfile?.clinic_name) {
          clinicNamesSet.add(doctorProfile.clinic_name.trim().toLowerCase());
          setPrimaryClinicName(doctorProfile.clinic_name.trim());
        }

        if (doctorProfile?.hospital_id) {
          clinicIdsSet.add(String(doctorProfile.hospital_id));
          const matchedHosp = allHospitals.find((h: any) => h.id === doctorProfile.hospital_id);
          if (matchedHosp?.name) {
            clinicNamesSet.add(matchedHosp.name.trim().toLowerCase());
            if (!primaryClinicName && (matchedHosp.type === "clinic" || !doctorProfile.clinic_name)) {
              setPrimaryClinicName(matchedHosp.name.trim());
            }
          }
        }

        // Add any clinic owned by doctor in hospitals
        allHospitals
          .filter((h: any) => h.user_id === session.user.id && (h.type || "").toLowerCase() === "clinic")
          .forEach((h: any) => {
            clinicIdsSet.add(String(h.id));
            if (h.name) clinicNamesSet.add(h.name.trim().toLowerCase());
            if (!primaryClinicName) setPrimaryClinicName(h.name.trim());
          });

        // Add doctor locations
        doctorLocations
          .filter((loc: any) => loc.location_type === "CLINIC" && loc.location_name)
          .forEach((loc: any) => {
            clinicNamesSet.add(loc.location_name.trim().toLowerCase());
            if (!primaryClinicName) setPrimaryClinicName(loc.location_name.trim());
          });

        setDoctorClinicNames(Array.from(clinicNamesSet));

        // 2. Fetch all pharmacies (both via API and Supabase fallback)
        const { data: pharmacyProfiles, error } = await supabase
          .from("pharmacies")
          .select("*");
          
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
               // If clinic partner, show even if pending approval
               const pClinicName = (profile.clinic_name || "").trim().toLowerCase();
               const pHospitalId = profile.hospital_id ? String(profile.hospital_id) : "";

               const isLinkedToClinic = (
                 (pClinicName && clinicNamesSet.has(pClinicName)) ||
                 (pHospitalId && clinicIdsSet.has(pHospitalId))
               );

               // For network pharmacies, require active status; for linked clinic, allow pending approval visibility
               const isActive = user?.status === "ACTIVE";
               if (!isLinkedToClinic && !isActive) return null;

               return {
                 ...profile,
                 full_name: profile.business_name || user?.full_name || "Pharmacy",
                 email: user?.email,
                 status: user?.status || "PENDING",
                 is_verified: user?.is_verified ?? false,
                 isLinked: isLinkedToClinic,
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

    loadPharmacies();
  }, []);

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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
            Network Pharmacies
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md leading-relaxed">
            View approved pharmacies and fulfillment centers linked to your clinic practice.
          </p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name, city, or address..." 
            className="pl-9 bg-muted/50 border-transparent focus-visible:border-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </motion.div>

      {/* ─── SECTION 1: Pharmacies Registered Under Doctor's Clinic ─── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-bold text-foreground">
              Pharmacies Registered Under Your Clinic
            </h2>
            {primaryClinicName && (
              <Badge variant="secondary" className="ml-1 text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                {primaryClinicName}
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {linkedPharmacies.length} {linkedPharmacies.length === 1 ? "pharmacy" : "pharmacies"} linked
          </span>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
          </div>
        ) : filteredLinked.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-500/[0.03] text-center space-y-2">
            <Store className="h-9 w-9 text-emerald-500/50 mx-auto" />
            <h3 className="text-sm font-semibold text-foreground">
              {primaryClinicName 
                ? `No pharmacies currently registered under ${primaryClinicName}`
                : "No clinic-linked pharmacies yet"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              When a pharmacy registers and selects your clinic ({primaryClinicName || "your private clinic"}), it will appear here with exclusive clinic dispensing partnership status.
            </p>
          </div>
        ) : (
          <motion.div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" initial="hidden" animate="visible" variants={stagger}>
            {filteredLinked.map(pharmacy => (
              <motion.div key={pharmacy.id} variants={fadeUp}>
                <Card className="group overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-card hover:border-emerald-500 transition-all hover:-translate-y-1 hover:shadow-lg h-full flex flex-col">
                  <CardHeader className="pb-3 border-b border-border/50 bg-emerald-500/[0.04]">
                    <div className="flex justify-between items-start">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 mb-2">
                        <Store className="h-5 w-5 text-emerald-600" />
                      </div>
                      <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold text-xs">
                        <Star className="mr-1 h-3.5 w-3.5 fill-emerald-500 text-emerald-500" /> Your Clinic Partner
                      </Badge>
                    </div>
                    <CardTitle className="text-base line-clamp-1">{pharmacy.full_name || "Clinic Pharmacy"}</CardTitle>
                    {pharmacy.clinic_name && (
                      <p className="text-xs font-medium text-emerald-600 flex items-center gap-1 mt-0.5">
                        <Building className="w-3.5 h-3.5 shrink-0" />
                        Affiliated with {pharmacy.clinic_name}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-4 flex flex-col flex-1">
                    <div className="space-y-3 flex-1 text-sm">
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">
                          {[pharmacy.address, pharmacy.city, pharmacy.state].filter(Boolean).join(", ") || "Address on file"}
                        </span>
                      </div>
                      {pharmacy.contact_number && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{pharmacy.contact_number}</span>
                        </div>
                      )}
                      {pharmacy.operating_hours && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{pharmacy.operating_hours}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-5 pt-3 border-t border-border/50 flex justify-between items-center text-xs text-muted-foreground">
                      <span>License: {pharmacy.license_number || "Verified"}</span>
                      {pharmacy.status === "ACTIVE" ? (
                        <span className="flex items-center text-emerald-600 font-medium">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center text-amber-600 font-medium">
                          <Clock className="w-3.5 h-3.5 mr-1" /> Pending Approval
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* ─── SECTION 2: MedSync Network Pharmacies ─── */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h2 className="text-xl font-bold text-foreground">
            All MedSync Network Pharmacies
          </h2>
          <span className="text-xs text-muted-foreground">
            {filteredOther.length} pharmacies available
          </span>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
          </div>
        ) : filteredOther.length === 0 ? (
          <Card className="rounded-2xl border border-dashed bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Store className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">No other pharmacies found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {search ? "Try adjusting your search terms." : "No additional network pharmacies found."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <motion.div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" initial="hidden" animate="visible" variants={stagger}>
            {filteredOther.map(pharmacy => (
              <motion.div key={pharmacy.id} variants={fadeUp}>
                <Card className="group overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-all hover:-translate-y-1 hover:shadow-lg h-full flex flex-col">
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
                  <CardContent className="pt-4 flex flex-col flex-1">
                    <div className="space-y-3 flex-1 text-sm">
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                        <span className="line-clamp-2">
                          {[pharmacy.address, pharmacy.city, pharmacy.state].filter(Boolean).join(", ") || "Address on file"}
                        </span>
                      </div>
                      {pharmacy.contact_number && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span>{pharmacy.contact_number}</span>
                        </div>
                      )}
                      {pharmacy.operating_hours && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span>{pharmacy.operating_hours}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-5 pt-3 border-t border-border/50 flex justify-between items-center text-xs text-muted-foreground">
                      <span>License: {pharmacy.license_number || "Verified"}</span>
                      <span className="flex items-center text-emerald-600 font-medium">
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Active
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

