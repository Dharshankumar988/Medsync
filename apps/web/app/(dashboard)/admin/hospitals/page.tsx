"use client";

import { useState, useEffect, useMemo } from "react";
import { hospitalService, Hospital } from "@/services/hospital.service";
import { Button } from "@medsync/ui";
import { Input } from "@medsync/ui";
import { Plus, Search, Building2, MapPin, Mail, Phone, MoreVertical, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const LocationPickerMap = dynamic(() => import("@/components/LocationPickerMap"), { ssr: false });
import { Skeleton } from "@medsync/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@medsync/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@medsync/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@medsync/ui";

import api from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent, Badge } from "@medsync/ui";
import { Briefcase, Check, Clock } from "lucide-react";

export default function HospitalsManagementPage() {
  const [activeTab, setActiveTab] = useState<"HOSPITALS" | "DOCTOR_AFFILIATIONS">("HOSPITALS");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctorLocations, setDoctorLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newHospital, setNewHospital] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
    phone_number: "",
    email: "",
    website: "",
    latitude: 0,
    longitude: 0,
    type: "hospital",
    google_maps_url: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadHospitals = async () => {
    try {
      setIsLoading(true);
      const [hospRes, locsRes] = await Promise.all([
        hospitalService.getHospitals(),
        api.get('/api/v1/doctor-locations/pending').catch(() => ({ data: { data: [] } }))
      ]);
      setHospitals(hospRes.data.data);
      setDoctorLocations(locsRes.data?.data || []);
    } catch (error) {
      console.error("Error loading hospitals and locations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHospitals();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHospital.latitude || !newHospital.longitude) {
      alert("Please select a location on the map.");
      return;
    }
    setIsSubmitting(true);
    try {
      await hospitalService.createHospital(newHospital);
      setIsAddOpen(false);
      loadHospitals();
    } catch (error) {
      console.error("Error creating hospital:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuthorize = async (id: string, name: string) => {
    try {
      await hospitalService.verifyHospital(id);
      toast.success(`${name} has been authorized and verified!`);
      loadHospitals();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to authorize hospital");
    }
  };

  const handleAuthorizeLocation = async (id: string, locName: string) => {
    try {
      await api.post(`/api/v1/doctor-locations/${id}/verify`);
      toast.success(`Practice workplace '${locName}' approved and authorized!`);
      loadHospitals();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to authorize location");
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await hospitalService.deactivateHospital(id);
      toast.success("Facility deactivated");
      loadHospitals();
    } catch (error) {
      console.error("Error deactivating hospital:", error);
    }
  };

  const filteredHospitals = useMemo(() => {
    return hospitals.filter(h => 
      h.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      h.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [hospitals, searchTerm]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Hospital Management</h2>
        <div className="flex items-center space-x-2">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Hospital
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Facility</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Facility Name</label>
                    <Input 
                      required 
                      value={newHospital.name} 
                      onChange={e => setNewHospital({...newHospital, name: e.target.value})} 
                      placeholder="e.g. General Hospital" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Facility Type</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={newHospital.type}
                      onChange={e => setNewHospital({...newHospital, type: e.target.value})}
                    >
                      <option value="hospital">Hospital</option>
                      <option value="clinic">Clinic</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location Map</label>
                  <LocationPickerMap 
                    onLocationSelect={(lat, lng) => setNewHospital({...newHospital, latitude: lat, longitude: lng})} 
                  />
                  {!newHospital.latitude && <p className="text-xs text-amber-500">Please click the map to select the exact location.</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Address</label>
                  <Input 
                    required 
                    value={newHospital.address} 
                    onChange={e => setNewHospital({...newHospital, address: e.target.value})} 
                    placeholder="123 Medical Way" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Google Maps URL (Optional)</label>
                  <Input 
                    type="url"
                    value={newHospital.google_maps_url} 
                    onChange={e => setNewHospital({...newHospital, google_maps_url: e.target.value})} 
                    placeholder="https://maps.google.com/..." 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">City</label>
                    <Input 
                      value={newHospital.city} 
                      onChange={e => setNewHospital({...newHospital, city: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">State</label>
                    <Input 
                      value={newHospital.state} 
                      onChange={e => setNewHospital({...newHospital, state: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone</label>
                    <Input 
                      value={newHospital.phone_number} 
                      onChange={e => setNewHospital({...newHospital, phone_number: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input 
                      type="email"
                      value={newHospital.email} 
                      onChange={e => setNewHospital({...newHospital, email: e.target.value})} 
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full mt-6" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Hospital"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center space-x-2 my-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search hospitals..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="mb-4">
          <TabsTrigger value="HOSPITALS" className="gap-2">
            <Building2 className="w-4 h-4" />
            Medical Facilities ({hospitals.length})
          </TabsTrigger>
          <TabsTrigger value="DOCTOR_AFFILIATIONS" className="gap-2">
            <Briefcase className="w-4 h-4" />
            Doctor Practice Affiliations
            {doctorLocations.length > 0 && (
              <Badge variant="secondary" className="ml-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                {doctorLocations.length} Pending
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="HOSPITALS">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hospital</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-full ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredHospitals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Building2 className="h-8 w-8 mb-2 opacity-50" />
                    <p>No hospitals found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredHospitals.map((hospital) => (
                <TableRow key={hospital.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium">{hospital.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{hospital.type || 'Hospital'} • ID: {hospital.id.substring(0,8)}...</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm">
                      <MapPin className="mr-1 h-3 w-3 text-muted-foreground" />
                      {hospital.city ? `${hospital.city}, ${hospital.state}` : 'Location unknown'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-1 text-sm">
                      {hospital.email && (
                        <div className="flex items-center">
                          <Mail className="mr-1 h-3 w-3 text-muted-foreground" />
                          {hospital.email}
                        </div>
                      )}
                      {hospital.phone_number && (
                        <div className="flex items-center">
                          <Phone className="mr-1 h-3 w-3 text-muted-foreground" />
                          {hospital.phone_number}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {hospital.is_verified ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-800/30 dark:text-emerald-400">
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-800/30 dark:text-amber-400">
                        Pending
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!hospital.is_verified && (
                        <Button 
                          size="sm" 
                          onClick={() => handleAuthorize(hospital.id, hospital.name)}
                          className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 shadow-sm"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" /> Authorize
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="right">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          {!hospital.is_verified && (
                            <DropdownMenuItem 
                              className="text-emerald-600 focus:text-emerald-700 font-medium cursor-pointer"
                              onClick={() => handleAuthorize(hospital.id, hospital.name)}
                            >
                              <ShieldCheck className="mr-2 h-4 w-4" /> Authorize Facility
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Edit Hospital</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive cursor-pointer"
                            onClick={() => handleDeactivate(hospital.id)}
                          >
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </TabsContent>

    <TabsContent value="DOCTOR_AFFILIATIONS">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Practice Workplace / Facility</TableHead>
              <TableHead>Address / City</TableHead>
              <TableHead>Consultation Schedule</TableHead>
              <TableHead>Verification Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doctorLocations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Briefcase className="h-8 w-8 mb-2 opacity-50" />
                    <p>No doctor workplace affiliations pending review.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              doctorLocations.map((loc) => (
                <TableRow key={loc.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium">{loc.location_name || "Practice Location"}</div>
                        <div className="text-xs text-muted-foreground capitalize">{loc.location_type?.toLowerCase() || "Hospital"} • ID: {loc.id.substring(0,8)}...</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm">
                      <MapPin className="mr-1 h-3 w-3 text-muted-foreground" />
                      {[loc.address, loc.city, loc.state].filter(Boolean).join(", ") || "Location details on file"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {loc.working_days && <div>Days: <strong>{loc.working_days}</strong></div>}
                      {loc.consultation_hours && <div>Hours: <strong>{loc.consultation_hours}</strong></div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-800/30 dark:text-amber-400">
                      <Clock className="w-3 h-3 mr-1" /> Pending Admin Authorization
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      size="sm" 
                      onClick={() => handleAuthorizeLocation(loc.id, loc.location_name || "Facility")}
                      className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 shadow-sm"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" /> Authorize Workplace
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </TabsContent>
  </Tabs>
</div>
  );
}
