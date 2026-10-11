"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Building2,
  MapPin,
  Search,
  Stethoscope,
  CheckCircle2,
  Map as MapIcon,
  List as ListIcon,
  ChevronRight,
  UserCheck,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button, Input, Badge } from "@medsync/ui";
import api from "@/lib/api";
import { supabase } from "@/lib/supabase";

const HospitalMap = dynamic(() => import("@/components/HospitalMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] w-full rounded-xl bg-card/50 animate-pulse border border-border flex items-center justify-center text-sm text-muted-foreground">
      Loading Hospital Map...
    </div>
  ),
});

export interface DoctorItem {
  id: string;
  user_id: string;
  full_name: string;
  specialization?: string | null;
  hospital_name?: string | null;
  hospital_id?: string | null;
  clinic_name?: string | null;
  profile_picture_url?: string | null;
}

interface DoctorHospitalPickerProps {
  selectedDoctorId: string;
  onSelectDoctor: (doctor: DoctorItem | null) => void;
  currentDoctorUserId?: string;
}

export default function DoctorHospitalPicker({
  selectedDoctorId,
  onSelectDoctor,
  currentDoctorUserId,
}: DoctorHospitalPickerProps) {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Fetch hospitals from API or Supabase
        let hList: any[] = [];
        try {
          const hRes = await api.get("/api/v1/hospitals");
          hList = hRes.data?.data || [];
        } catch {
          const { data } = await supabase.from("hospitals").select("*").eq("is_active", true);
          hList = data || [];
        }

        // Fetch doctor directory from API or Supabase
        let dList: DoctorItem[] = [];
        try {
          const dRes = await api.get("/api/v1/doctor-collaboration/directory");
          dList = dRes.data?.data || [];
        } catch {
          const { data } = await supabase
            .from("doctors")
            .select("id, user_id, full_name, specialization, hospital_name, hospital_id, clinic_name, profile_picture_url");
          dList = (data as any) || [];
        }

        // Filter out current logged in doctor
        if (currentDoctorUserId) {
          dList = dList.filter((d) => d.user_id !== currentDoctorUserId);
        }

        // If hospitals don't have coordinates, synthesize Bangalore coordinates for demo/display
        const defaultCoords = [
          { lat: 12.9716, lng: 77.5946 },
          { lat: 12.9352, lng: 77.6245 },
          { lat: 12.9279, lng: 77.6271 },
          { lat: 13.0068, lng: 77.5813 },
          { lat: 12.9833, lng: 77.7500 },
          { lat: 12.9141, lng: 77.6321 },
        ];

        const enrichedHospitals = hList.map((h, idx) => {
          const coords = defaultCoords[idx % defaultCoords.length];
          return {
            ...h,
            latitude: h.latitude ? Number(h.latitude) : coords.lat,
            longitude: h.longitude ? Number(h.longitude) : coords.lng,
          };
        });

        setHospitals(enrichedHospitals);
        setDoctors(dList);
      } catch (err) {
        console.error("Failed to load hospital picker data", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [currentDoctorUserId]);

  const selectedDoctor = useMemo(() => {
    return doctors.find((d) => d.user_id === selectedDoctorId) || null;
  }, [doctors, selectedDoctorId]);

  // Filter hospitals based on search
  const filteredHospitals = useMemo(() => {
    if (!searchQuery.trim()) return hospitals;
    const q = searchQuery.toLowerCase();
    return hospitals.filter(
      (h) =>
        h.name?.toLowerCase().includes(q) ||
        h.address?.toLowerCase().includes(q) ||
        h.city?.toLowerCase().includes(q)
    );
  }, [hospitals, searchQuery]);

  // Doctors belonging to the currently selected hospital (or all doctors matching search)
  const displayDoctors = useMemo(() => {
    let list = doctors;

    if (selectedHospital) {
      const hospitalNameLower = selectedHospital.name?.toLowerCase();
      const hospitalId = selectedHospital.id;

      const directMatches = list.filter(
        (d) =>
          d.hospital_id === hospitalId ||
          (d.hospital_name && d.hospital_name.toLowerCase().includes(hospitalNameLower))
      );

      // If specific hospital has doctors, display them; otherwise fallback to all available doctors with a note
      if (directMatches.length > 0) {
        list = directMatches;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (d) =>
          d.full_name?.toLowerCase().includes(q) ||
          d.specialization?.toLowerCase().includes(q) ||
          d.hospital_name?.toLowerCase().includes(q) ||
          d.clinic_name?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [doctors, selectedHospital, searchQuery]);

  return (
    <div className="space-y-3">
      {/* Selected Doctor Summary Card */}
      {selectedDoctor ? (
        <div className="p-3.5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-between gap-3 transition-all animate-in fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-emerald-600/20 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/30 font-bold text-sm">
              <UserCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm text-foreground truncate">
                  Dr. {selectedDoctor.full_name}
                </p>
                <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0">
                  Selected Specialist
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {selectedDoctor.specialization || "Specialist Physician"} •{" "}
                {selectedDoctor.hospital_name || selectedDoctor.clinic_name || "General Clinic"}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onSelectDoctor(null)}
            className="text-xs text-muted-foreground hover:text-foreground h-8 px-2 rounded-lg shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Change
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Search & Mode Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search hospitals, clinics, or specialist doctors..."
                className="pl-9 h-10 rounded-xl text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center border border-border/70 rounded-xl p-0.5 bg-muted/30 shrink-0">
              <Button
                type="button"
                variant={viewMode === "map" ? "default" : "ghost"}
                size="sm"
                className={`h-8 px-2.5 rounded-lg text-xs ${
                  viewMode === "map" ? "bg-primary text-primary-foreground shadow-sm" : ""
                }`}
                onClick={() => setViewMode("map")}
              >
                <MapIcon className="w-3.5 h-3.5 mr-1" /> Map
              </Button>
              <Button
                type="button"
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className={`h-8 px-2.5 rounded-lg text-xs ${
                  viewMode === "list" ? "bg-primary text-primary-foreground shadow-sm" : ""
                }`}
                onClick={() => setViewMode("list")}
              >
                <ListIcon className="w-3.5 h-3.5 mr-1" /> Hospitals
              </Button>
            </div>
          </div>

          {/* Active Hospital Filter Tag if selected */}
          {selectedHospital && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400">
              <div className="flex items-center gap-1.5 truncate">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span className="font-semibold truncate">Filtered by: {selectedHospital.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHospital(null)}
                className="underline hover:no-underline font-medium ml-2 shrink-0"
              >
                View All
              </button>
            </div>
          )}

          {/* Interactive Hospital Map */}
          {viewMode === "map" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
                <span className="font-medium flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-primary" /> Hospital Network Map
                </span>
                <span>Click a hospital pin to view specialist doctors</span>
              </div>
              <div className="rounded-xl overflow-hidden border border-border/70">
                <HospitalMap
                  hospitals={filteredHospitals}
                  onSelectHospital={(h) => setSelectedHospital(h)}
                />
              </div>
            </div>
          )}

          {/* Hospital List View */}
          {viewMode === "list" && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium px-0.5">
                Select Hospital or Clinic ({filteredHospitals.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {filteredHospitals.map((h) => {
                  const isSelected = selectedHospital?.id === h.id;
                  return (
                    <div
                      key={h.id}
                      onClick={() => setSelectedHospital(isSelected ? null : h)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border/60 hover:border-primary/40 hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Building2
                          className={`w-4 h-4 shrink-0 ${
                            isSelected ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                        <p className="font-semibold text-xs text-foreground truncate">{h.name}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-1">
                        {[h.city, h.state].filter(Boolean).join(", ") || h.address || "Bangalore, India"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Doctors Selection Grid */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5 text-primary" />
                Available Specialist Doctors ({displayDoctors.length})
              </label>
              {selectedHospital && (
                <span className="text-[11px] text-muted-foreground">
                  at {selectedHospital.name}
                </span>
              )}
            </div>

            {loading ? (
              <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">
                Loading doctors directory...
              </div>
            ) : displayDoctors.length === 0 ? (
              <div className="py-6 px-4 text-center border border-dashed rounded-xl bg-muted/20 text-xs text-muted-foreground">
                <p>No doctors found matching this criteria.</p>
                {selectedHospital && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="text-xs mt-1 text-primary"
                    onClick={() => setSelectedHospital(null)}
                  >
                    Clear hospital filter to browse all specialists
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                {displayDoctors.map((doc) => {
                  const isChosen = selectedDoctorId === doc.user_id;
                  return (
                    <div
                      key={doc.user_id}
                      onClick={() => onSelectDoctor(doc)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isChosen
                          ? "border-emerald-500 bg-emerald-500/10 shadow-sm"
                          : "border-border/60 hover:border-primary/50 hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                          {doc.full_name
                            ?.split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase() || "DR"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-foreground truncate">
                            Dr. {doc.full_name}
                          </p>
                          <p className="text-[11px] text-primary font-medium truncate">
                            {doc.specialization || "Specialist Physician"}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {doc.hospital_name || doc.clinic_name || "General Clinic"}
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant={isChosen ? "default" : "outline"}
                        className={`h-7 px-2.5 rounded-lg text-xs shrink-0 ${
                          isChosen
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "border-border/70"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDoctor(doc);
                        }}
                      >
                        {isChosen ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Selected
                          </>
                        ) : (
                          <>Select</>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
