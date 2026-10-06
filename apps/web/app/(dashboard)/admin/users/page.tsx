"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { Users, Trash2, CheckCircle, XCircle, ShieldOff } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@medsync/ui";
import { Button } from "@medsync/ui";
import { Badge, Skeleton } from "@medsync/ui";
import api from "@/lib/api";
import { toast } from "sonner";

export default function AdminUsers() {
  const [verifications, setVerifications] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerification, setSelectedVerification] = useState<any | null>(null);



  // Add Admin State
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  
  // Add Doctor State
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [isAddingDoctor, setIsAddingDoctor] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    email: "", password: "", full_name: "", specialization: "", license_number: "", hospital_id: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vRes, pRes, aRes, dRes, phRes, hRes] = await Promise.all([
        api.get('/api/v1/admin/verifications/pending'),
        api.get('/api/v1/admin/patients'),
        api.get('/api/v1/admin/admins'),
        api.get('/api/v1/admin/doctors'),
        api.get('/api/v1/admin/pharmacies'),
        api.get('/api/v1/hospitals')
      ]);
      setVerifications(vRes.data.data || []);
      setPatients(pRes.data.data || []);
      setAdmins(aRes.data.data || []);
      setDoctors(dRes.data.data || []);
      setPharmacies(phRes.data.data || []);
      setHospitals(hRes.data.data || []);
    } catch (err) {
      console.error("Failed to fetch admin data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/api/v1/admin/verifications/${id}/approve`);
      fetchData();
    } catch (err) {
      console.error("Failed to approve", err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.post(`/api/v1/admin/verifications/${id}/reject`);
      fetchData();
    } catch (err) {
      console.error("Failed to reject", err);
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

  const handleSuspendUser = async (id: string) => {
    if (!confirm("Are you sure you want to suspend this user?")) return;
    try {
      // Dummy endpoint for now if backend doesn't support it yet
      // await api.post(`/api/v1/admin/users/${id}/suspend`);
      toast.success("User suspended successfully (UI demo)");
    } catch (err) {
      console.error("Failed to suspend user", err);
    }
  };

  const handleResetSecurity = async (id: string) => {
    if (!confirm("Are you sure you want to reset this user's security credentials? They will need to set up their PIN and Face ID again.")) return;
    try {
      await api.post(`/api/v1/admin/users/${id}/reset-security`);
      toast.success("Security credentials reset successfully");
    } catch (err) {
      console.error("Failed to reset security", err);
      toast.error("Failed to reset security");
    }
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoctor.email || !newDoctor.password || !newDoctor.full_name) return;
    try {
      const payload: any = {...newDoctor};
      if (!payload.hospital_id) delete payload.hospital_id; // don't send empty string
      await api.post('/api/v1/admin/doctors', payload);
      toast.success("Doctor created successfully!");
      setNewDoctor({email: "", password: "", full_name: "", specialization: "", license_number: "", hospital_id: ""});
      setIsAddingDoctor(false);
      fetchData();
    } catch (err: any) {
      console.error("Failed to create doctor", err);
      toast.error(err.response?.data?.detail || "Failed to create doctor");
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail || !newAdminPassword) return;
    try {
      await api.post('/api/v1/admin/admins', { email: newAdminEmail, password: newAdminPassword });
      toast.success("Admin created successfully!");
      setNewAdminEmail("");
      setNewAdminPassword("");
      fetchData();
    } catch (err) {
      console.error("Failed to create admin", err);
      toast.error("Failed to create admin");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users & Verification</h1>
        <p className="text-muted-foreground mt-2">Manage users, approve professionals, and monitor access.</p>
      </div>

      <Tabs defaultValue="verifications" className="space-y-6">
        <TabsList className="bg-card/50 border border-border/60 flex flex-wrap h-auto py-2">
          <TabsTrigger value="verifications">Pending Verifications</TabsTrigger>
          <TabsTrigger value="patients">Patients</TabsTrigger>
          <TabsTrigger value="doctors">Doctors</TabsTrigger>
          <TabsTrigger value="pharmacies">Pharmacies</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
        </TabsList>

        <TabsContent value="verifications">
          <Card>
            <CardHeader>
              <CardTitle>Pending Professional Verifications</CardTitle>
              <CardDescription>Review and approve Doctors and Pharmacies.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-40 w-full" /> : verifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">No pending verifications.</div>
              ) : (
                <div className="space-y-4">
                  {verifications.map((req) => (
                    <div key={req.request_id} className="flex justify-between items-center p-5 border rounded-xl hover:bg-muted/20">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge>{req.role}</Badge>
                          <span className="font-semibold">{req.profile?.full_name || req.profile?.business_name || req.email}</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-2">
                          <p className="flex items-center gap-1">
                            Email: {req.email} 
                            {req.email?.toLowerCase().includes('@gmail.com') && (
                              <span className="flex items-center text-emerald-500 text-xs font-medium ml-2 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                <CheckCircle className="h-3 w-3 mr-1" /> Verified
                              </span>
                            )}
                          </p>
                          <p>License / GST No: {req.profile?.license_number}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setSelectedVerification(req)}>View Details</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {selectedVerification && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-background rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">Verification Request</h2>
                <p className="text-sm text-muted-foreground">Review details before approving.</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground font-medium uppercase">Role</span>
                    <p className="font-medium">{selectedVerification.role}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-medium uppercase">Email</span>
                    <p className="font-medium flex items-center gap-2">
                      {selectedVerification.email}
                      {selectedVerification.email?.toLowerCase().includes('@gmail.com') && (
                        <span className="flex items-center text-emerald-500 text-xs bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Supabase Verified
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground font-medium uppercase">Name / Business Name</span>
                    <p className="font-medium">{selectedVerification.profile?.full_name || selectedVerification.profile?.business_name || "N/A"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground font-medium uppercase">License / GST No.</span>
                    <p className="font-medium">{selectedVerification.profile?.license_number || "N/A"}</p>
                  </div>
                  {selectedVerification.role === 'DOCTOR' && (
                    <>
                      <div className="col-span-2">
                        <span className="text-xs text-muted-foreground font-medium uppercase">Hospital / Clinic</span>
                        <p className="font-medium">{selectedVerification.profile?.hospital_name || selectedVerification.profile?.clinic_name || "N/A"}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs text-muted-foreground font-medium uppercase">Specialization</span>
                        <p className="font-medium">{selectedVerification.profile?.specialization || "N/A"}</p>
                      </div>
                    </>
                  )}
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground font-medium uppercase">Address</span>
                    <p className="font-medium whitespace-pre-wrap">{selectedVerification.profile?.address || selectedVerification.profile?.hospital_address || selectedVerification.profile?.clinic_address || "N/A"}</p>
                  </div>
                  {(selectedVerification.profile?.google_maps_url) && (
                    <div className="col-span-2">
                      <span className="text-xs text-muted-foreground font-medium uppercase">Google Maps Link</span>
                      <p className="font-medium text-blue-500 hover:underline">
                        <a href={selectedVerification.profile.google_maps_url} target="_blank" rel="noreferrer">Open in Maps</a>
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 bg-muted/20">
                <Button variant="outline" onClick={() => setSelectedVerification(null)}>Close</Button>
                <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => { handleReject(selectedVerification.request_id); setSelectedVerification(null); }}>Reject</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { handleApprove(selectedVerification.request_id); setSelectedVerification(null); }}>Verify & Approve</Button>
              </div>
            </div>
          </div>
        )}

        <TabsContent value="patients">
          <Card>
            <CardHeader><CardTitle>Registered Patients</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-40 w-full" /> : (
                <div className="divide-y border rounded-xl">
                  {patients.map(p => (
                    <div key={p.user_id} className="flex justify-between p-4 hover:bg-muted/10">
                      <div>
                        <p className="font-medium">{p.full_name}</p>
                        <p className="text-sm text-muted-foreground">{p.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{p.status}</Badge>
                        <Button variant="ghost" title="Reset Security Credentials" onClick={() => handleResetSecurity(p.user_id)}>
                          <ShieldOff className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button variant="ghost" title="Suspend Patient" onClick={() => handleSuspendUser(p.user_id)}>
                          <XCircle className="h-4 w-4 text-amber-500 hover:text-amber-600" />
                        </Button>
                        <Button variant="ghost" title="Delete Patient" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteUser(p.user_id, 'patient')}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

                        <TabsContent value="doctors">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Verified Doctors</CardTitle>
                <CardDescription>Manage active doctors on the platform.</CardDescription>
              </div>
              <Button onClick={() => setIsAddingDoctor(!isAddingDoctor)} variant="outline">
                {isAddingDoctor ? "Cancel" : "Add Doctor"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {isAddingDoctor && (
                <div className="p-4 border rounded-xl bg-muted/20 mb-6">
                  <h3 className="font-medium mb-4">Register New Doctor</h3>
                  <form onSubmit={handleAddDoctor} className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Full Name</label>
                      <input type="text" required value={newDoctor.full_name} onChange={(e) => setNewDoctor({...newDoctor, full_name: e.target.value})} className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Email</label>
                      <input type="email" required value={newDoctor.email} onChange={(e) => setNewDoctor({...newDoctor, email: e.target.value})} className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Password</label>
                      <input type="password" required minLength={6} value={newDoctor.password} onChange={(e) => setNewDoctor({...newDoctor, password: e.target.value})} className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Specialization</label>
                      <input type="text" value={newDoctor.specialization} onChange={(e) => setNewDoctor({...newDoctor, specialization: e.target.value})} className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">License Number</label>
                      <input type="text" value={newDoctor.license_number} onChange={(e) => setNewDoctor({...newDoctor, license_number: e.target.value})} className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Hospital Assignment</label>
                      <select value={newDoctor.hospital_id} onChange={(e) => setNewDoctor({...newDoctor, hospital_id: e.target.value})} className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <option value="">Independent (No Hospital)</option>
                        {hospitals.map((h: any) => (
                          <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2 mt-2">
                      <Button type="submit" className="h-10 px-8 bg-primary w-full md:w-auto">Create Doctor Profile</Button>
                    </div>
                  </form>
                </div>
              )}

              {loading ? <Skeleton className="h-40 w-full" /> : (
                <div className="divide-y border rounded-xl">
                  {doctors.map(d => (
                    <div key={d.user_id} className="flex justify-between items-center p-4 hover:bg-muted/10">
                      <div>
                        <p className="font-medium">Dr. {d.full_name}</p>
                        <p className="text-sm text-muted-foreground">{d.email} • {d.license_number}</p>
                        <p className="text-xs text-muted-foreground mt-1">Practice: {d.hospital_name || d.clinic_name || 'Independent'}</p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Verified</Badge>
                        <Button variant="ghost" title="Suspend Doctor" onClick={() => handleSuspendUser(d.user_id)}>
                          <XCircle className="h-4 w-4 text-amber-500 hover:text-amber-600" />
                        </Button>
                        <Button variant="ghost" title="Delete Doctor" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteUser(d.user_id, 'doctor')}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {doctors.length === 0 && <div className="p-8 text-center text-muted-foreground">No doctors found.</div>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pharmacies">
          <Card>
            <CardHeader><CardTitle>Verified Pharmacies</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-40 w-full" /> : (
                <div className="divide-y border rounded-xl">
                  {pharmacies.map(p => (
                    <div key={p.user_id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/10 gap-4">
                      <div>
                        <p className="font-medium">{p.business_name}</p>
                        <p className="text-sm text-muted-foreground">{p.email} • {p.license_number}</p>
                        <p className="text-xs text-muted-foreground mt-1">Location: {p.address}, {p.city}</p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Verified</Badge>
                        <Button variant="ghost" title="Suspend Pharmacy" onClick={() => handleSuspendUser(p.user_id)}>
                          <XCircle className="h-4 w-4 text-amber-500 hover:text-amber-600" />
                        </Button>
                        <Button variant="ghost" title="Delete Pharmacy" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteUser(p.user_id, 'pharmacy')}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {pharmacies.length === 0 && <div className="p-8 text-center text-muted-foreground">No pharmacies found.</div>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admins">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>System Administrators</CardTitle>
                <CardDescription>Manage dashboard access.</CardDescription>
              </div>
              <Button onClick={() => setIsAddingAdmin(!isAddingAdmin)} variant="outline">
                {isAddingAdmin ? "Cancel" : "Add Admin"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {isAddingAdmin && (
                <div className="p-4 border rounded-xl bg-muted/20">
                  <h3 className="font-medium mb-4">Create New Administrator</h3>
                  <form onSubmit={handleAddAdmin} className="flex gap-4 items-end">
                    <div className="space-y-1 flex-1">
                      <label className="text-sm font-medium">Email</label>
                      <input 
                        type="email" 
                        required 
                        value={newAdminEmail} 
                        onChange={(e) => setNewAdminEmail(e.target.value)} 
                        className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                    <div className="space-y-1 flex-1">
                      <label className="text-sm font-medium">Password</label>
                      <input 
                        type="password" 
                        required 
                        minLength={6}
                        value={newAdminPassword} 
                        onChange={(e) => setNewAdminPassword(e.target.value)} 
                        className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                    <Button type="submit" className="h-10 px-8 bg-primary">Create</Button>
                  </form>
                </div>
              )}

              {loading ? <Skeleton className="h-40 w-full" /> : (
                <div className="divide-y border rounded-xl">
                  {admins.map(a => (
                    <div key={a.user_id} className="flex justify-between p-4 hover:bg-muted/10">
                      <div>
                        <p className="font-medium">{a.email}</p>
                        <p className="text-sm text-muted-foreground">Joined: {new Date(a.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Badge variant="outline" className="h-fit">Admin</Badge>
                        <Button variant="ghost" title="Suspend Admin" onClick={() => handleSuspendUser(a.user_id)}>
                          <XCircle className="h-4 w-4 text-amber-500 hover:text-amber-600" />
                        </Button>
                        <Button variant="ghost" title="Delete Admin" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteUser(a.user_id, 'admin')}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
