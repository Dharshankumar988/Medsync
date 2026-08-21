"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@medsync/ui";
import { Input } from "@medsync/ui";
import { Plus, Search, Building2, MapPin, Mail, Phone, MoreVertical, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import api from "@/lib/api";

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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@medsync/ui";

export default function PharmaciesManagementPage() {
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newPharmacy, setNewPharmacy] = useState({
    business_name: "",
    license_number: "",
    address: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
    contact_number: "",
    email: "",
    latitude: 0,
    longitude: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadPharmacies = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/api/v1/pharmacies/all'); // Need to implement this in backend
      if(res.data?.data) {
          setPharmacies(res.data.data);
      }
    } catch (error) {
      console.error("Error loading pharmacies:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPharmacies();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPharmacy.latitude || !newPharmacy.longitude) {
      alert("Please select a location on the map.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/api/v1/pharmacies/admin', newPharmacy); // Need to implement in backend
      setIsAddOpen(false);
      loadPharmacies();
    } catch (error) {
      console.error("Error creating pharmacy:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPharmacies = useMemo(() => {
    return pharmacies.filter(h => 
      h.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      h.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [pharmacies, searchTerm]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Pharmacy Management</h2>
        <div className="flex items-center space-x-2">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Pharmacy
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Pharmacy</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pharmacy Name</label>
                  <Input 
                    required 
                    value={newPharmacy.business_name} 
                    onChange={e => setNewPharmacy({...newPharmacy, business_name: e.target.value})} 
                    placeholder="City Care Pharmacy" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">License Number</label>
                  <Input 
                    required 
                    value={newPharmacy.license_number} 
                    onChange={e => setNewPharmacy({...newPharmacy, license_number: e.target.value})} 
                    placeholder="DL-123456" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location Map</label>
                  <LocationPickerMap 
                    onLocationSelect={(lat, lng) => setNewPharmacy({...newPharmacy, latitude: lat, longitude: lng})} 
                  />
                  {!newPharmacy.latitude && <p className="text-xs text-amber-500">Please click the map to select the exact location.</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Address</label>
                  <Input 
                    required 
                    value={newPharmacy.address} 
                    onChange={e => setNewPharmacy({...newPharmacy, address: e.target.value})} 
                    placeholder="123 Medical Way" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">City</label>
                    <Input 
                      value={newPharmacy.city} 
                      onChange={e => setNewPharmacy({...newPharmacy, city: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">State</label>
                    <Input 
                      value={newPharmacy.state} 
                      onChange={e => setNewPharmacy({...newPharmacy, state: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone</label>
                    <Input 
                      value={newPharmacy.contact_number} 
                      onChange={e => setNewPharmacy({...newPharmacy, contact_number: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input 
                      type="email"
                      value={newPharmacy.email} 
                      onChange={e => setNewPharmacy({...newPharmacy, email: e.target.value})} 
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full mt-6" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Pharmacy"}
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
            placeholder="Search pharmacies..."
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
              <TableHead>Pharmacy</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>License</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                </TableRow>
              ))
            ) : filteredPharmacies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No pharmacies found.
                </TableCell>
              </TableRow>
            ) : (
              filteredPharmacies.map((pharmacy) => (
                <TableRow key={pharmacy.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-emerald-500" />
                      </div>
                      <span>{pharmacy.business_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-muted-foreground text-sm">
                      <MapPin className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate max-w-[200px]">{pharmacy.address}, {pharmacy.city}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {pharmacy.contact_number && (
                        <div className="flex items-center text-muted-foreground text-sm">
                          <Phone className="mr-2 h-3 w-3" />
                          {pharmacy.contact_number}
                        </div>
                      )}
                      {pharmacy.email && (
                        <div className="flex items-center text-muted-foreground text-sm">
                          <Mail className="mr-2 h-3 w-3" />
                          {pharmacy.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{pharmacy.license_number || "N/A"}</span>
                  </TableCell>
                  <TableCell>
                    <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-emerald-500/10 text-emerald-600">
                      Active
                    </div>
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
