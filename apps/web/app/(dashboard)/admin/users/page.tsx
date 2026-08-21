"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { Users, Trash2, CheckCircle, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@medsync/ui";
import { Button } from "@medsync/ui";
import { Badge, Skeleton } from "@medsync/ui";
import api from "@/lib/api";

export default function AdminUsers() {
  const [verifications, setVerifications] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vRes, pRes, aRes] = await Promise.all([
        api.get('/api/v1/admin/verifications/pending'),
        api.get('/api/v1/admin/patients'),
        api.get('/api/v1/admin/admins')
      ]);
      setVerifications(vRes.data.data || []);
      setPatients(pRes.data.data || []);
      setAdmins(aRes.data.data || []);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users & Verification</h1>
        <p className="text-muted-foreground mt-2">Manage users, approve professionals, and monitor access.</p>
      </div>

      <Tabs defaultValue="verifications" className="space-y-6">
        <TabsList className="bg-card/50 border border-border/60">
          <TabsTrigger value="verifications">Pending Verifications</TabsTrigger>
          <TabsTrigger value="patients">Patients</TabsTrigger>
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
                        <Button className="bg-emerald-600" onClick={() => handleApprove(req.request_id)}>Approve</Button>
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
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">{p.status}</Badge>
                        <Button variant="ghost" className="text-red-500" onClick={() => handleDeletePatient(p.user_id)}><Trash2 className="h-4 w-4"/></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admins">
          <Card>
            <CardHeader><CardTitle>System Administrators</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-40 w-full" /> : (
                <div className="divide-y border rounded-xl">
                  {admins.map(a => (
                    <div key={a.user_id} className="flex justify-between p-4">
                      <div>
                        <p className="font-medium">{a.email}</p>
                        <p className="text-sm text-muted-foreground">Joined: {new Date(a.created_at).toLocaleDateString()}</p>
                      </div>
                      <Badge>Admin</Badge>
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
