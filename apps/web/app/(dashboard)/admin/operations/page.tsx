"use client";
import { useEffect, useState } from "react";
import { Building, MapPin, Plus, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { Button, Input } from "@medsync/ui";
import { toast } from "sonner";
import api from "@/lib/api";
import dynamic from "next/dynamic";
const LocationPickerMap = dynamic(() => import("@/components/LocationPickerMap"), { ssr: false });

export default function MedicalFacilitiesManagement() {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/hospitals');
      setFacilities(res.data.data);
    } catch (err) {
      console.error("Failed to fetch facilities", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = async (id: string, name: string) => {
    try {
      await api.post(`/api/v1/hospitals/${id}/verify`);
      toast.success(`${name} authorized and verified successfully!`);
      fetchFacilities();
    } catch (err) {
      console.error("Failed to authorize facility", err);
      toast.error("Failed to authorize facility");
    }
  };

  const handleAddFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address || !latitude || !longitude) return;

    setSubmitting(true);
    try {
      await api.post('/api/v1/hospitals', {
        name,
        address,
        city,
        latitude,
        longitude
      });
      setIsAdding(false);
      setName("");
      setAddress("");
      setCity("");
      setLatitude(0);
      setLongitude(0);
      fetchFacilities();
    } catch (err) {
      console.error("Failed to add facility", err);
      alert("Failed to add facility. Check console for details.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Medical Facilities</h1>
          <p className="text-muted-foreground mt-2">Manage hospitals and clinics available in the MedSync network.</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} className="bg-blue-600 hover:bg-blue-700 text-white flex gap-2">
          {isAdding ? "Cancel" : <><Plus className="h-4 w-4" /> Add Facility</>}
        </Button>
      </div>

      {isAdding && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
          <h2 className="text-xl font-semibold mb-4">Register New Facility</h2>
          <form onSubmit={handleAddFacility} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Facility Name</label>
                <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. MedSync General Hospital" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">City</label>
                <Input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. New York" />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Location Map</label>
              <LocationPickerMap 
                onLocationSelect={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
                onAddressFound={(addr) => { setAddress(addr); }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Complete Address</label>
              <Input required value={address} onChange={e => setAddress(e.target.value)} placeholder="Full street address..." />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={submitting || !name || !address || !latitude} className="bg-blue-600 hover:bg-blue-700 text-white">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Facility"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-5 py-3 font-medium text-muted-foreground">Facility Name</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Location</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Coordinates</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Verification</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-5 py-3 font-medium text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {facilities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">No facilities registered yet.</td>
                </tr>
              ) : (
                facilities.map(f => (
                  <tr key={f.id} className="hover:bg-muted/30">
                    <td className="px-5 py-4 font-medium flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" /> {f.name}
                    </td>
                    <td className="px-5 py-4 max-w-[260px] truncate" title={f.address}>{f.address}</td>
                    <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                      {f.latitude ? `${parseFloat(f.latitude).toFixed(4)}, ${parseFloat(f.longitude).toFixed(4)}` : 'N/A'}
                    </td>
                    <td className="px-5 py-4">
                      {f.is_verified ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-800/30 dark:text-emerald-400">
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-800/30 dark:text-amber-400">
                          Pending Approval
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${f.is_active ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' : 'bg-red-500/10 text-red-600 border border-red-500/30'}`}>
                        {f.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {!f.is_verified && (
                        <Button 
                          size="sm" 
                          onClick={() => handleAuthorize(f.id, f.name)}
                          className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 shadow-sm"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" /> Authorize
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
