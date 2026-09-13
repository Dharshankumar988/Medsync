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

  // Add Admin State
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vRes, pRes, aRes, dRes, phRes] = await Promise.all([
        api.get('/api/v1/admin/verifications/pending'),
        api.get('/api/v1/admin/patients'),
        api.get('/api/v1/admin/admins'),
        api.get('/api/v1/admin/doctors'),
        api.get('/api/v1/admin/pharmacies')
      ]);
      setVerifications(vRes.data.data || []);
      setPatients(pRes.data.data || []);
      setAdmins(aRes.data.data || []);
      setDoctors(dRes.data.data || []);
      setPharmacies(phRes.data.data || []);
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

  const handleDeletePatient = async (id: string) => {
    if (!confirm("Are you sure you want to delete this patient?")) return;
    try {
      await api.delete(`/api/v1/admin/users/${id}`);
      fetchData();
    } catch (err) {
      console.error("Failed to delete patient", err);
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
                          {req.role === 'DOCTOR' ? (
                            <>
                              <p>Hospital: {req.profile?.hospital_name}</p>
                              <p>Specialization: {req.profile?.specialization}</p>
                              <p>License: {req.profile?.license_number}</p>
                            </>
                          ) : (
                            <>
                              <p>Address: {req.profile?.address}</p>
                              <p>License: {req.profile?.license_number}</p>
                            </>
                          )}
                          <p>Email: {req.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="text-red-500 border-red-200" onClick={() => handleReject(req.request_id)}>Reject</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleApprove(req.request_id)}>Approve</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

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
                        <Button variant="ghost" title="Delete Patient" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeletePatient(p.user_id)}>
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
            <CardHeader><CardTitle>Verified Doctors</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-40 w-full" /> : (
                <div className="divide-y border rounded-xl">
                  {doctors.map(d => (
                    <div key={d.user_id} className="flex justify-between items-center p-4 hover:bg-muted/10">
                      <div>
                        <p className="font-medium">Dr. {d.full_name}</p>
                        <p className="text-sm text-muted-foreground">{d.email} • {d.license_number}</p>
                        <p className="text-xs text-muted-foreground mt-1">Practice: {d.hospital_name || d.clinic_name || 'Independent'}</p>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Verified</Badge>
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
                      <Badge variant="outline" className="h-fit">Admin</Badge>
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
