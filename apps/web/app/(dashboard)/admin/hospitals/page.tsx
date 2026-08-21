"use client";

import { useState, useEffect, useMemo } from "react";
import { hospitalService, Hospital } from "@/services/hospital.service";
import { Button } from "@medsync/ui";
import { Input } from "@medsync/ui";
import { Plus, Search, Building2, MapPin, Mail, Phone, MoreVertical, Loader2 } from "lucide-react";
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

export default function HospitalsManagementPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
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
    longitude: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadHospitals = async () => {
    try {
      setIsLoading(true);
      const res = await hospitalService.getHospitals();
      setHospitals(res.data.data);
    } catch (error) {
      console.error("Error loading hospitals:", error);
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

  const handleDeactivate = async (id: string) => {
    try {
      await hospitalService.deactivateHospital(id);
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
                <DialogTitle>Add New Hospital</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hospital Name</label>
                  <Input 
                    required 
                    value={newHospital.name} 
                    onChange={e => setNewHospital({...newHospital, name: e.target.value})} 
                    placeholder="General Hospital" 
                  />
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
                        <div className="text-xs text-muted-foreground">ID: {hospital.id.substring(0,8)}...</div>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="right">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Edit Hospital</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeactivate(hospital.id)}
                        >
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
