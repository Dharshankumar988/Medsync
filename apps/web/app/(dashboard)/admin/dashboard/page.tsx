"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { Users, Server, Activity, ShieldCheck, CheckCircle, XCircle, Trash2, UserPlus, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@medsync/ui";
import { Button } from "@medsync/ui";
import { Badge, Skeleton } from "@medsync/ui";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminDashboard() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const [verifications, setVerifications] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsMounted(true);
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
    if (!confirm("Are you sure you want to delete this patient? This action cannot be undone.")) return;
    try {
      await api.delete(`/api/v1/admin/users/${id}`);
      fetchData();
    } catch (err) {
      console.error("Failed to delete patient", err);
    }
  };

  if (!isMounted) return null;

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            System Administration
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">Monitor platform health, verify professionals, and manage infrastructure.</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" className="h-9">
          Refresh Data
        </Button>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl h-12 w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-6">Overview</TabsTrigger>
          <TabsTrigger value="verifications" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-6">
            Pending Verifications
            {verifications.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                {verifications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="patients" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-6">Patients</TabsTrigger>
          <TabsTrigger value="admins" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-6">Admins</TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mt-6"
            >
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="border-primary/10 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -10 }}
            >
              <TabsContent value="overview" className="m-0 focus-visible:outline-none">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <motion.div variants={itemVariants}>
                    <Card className="border-primary/10 shadow-sm transition-all hover:shadow-md hover:border-primary/30">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{patients.length + admins.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">Registered accounts</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  
                  <motion.div variants={itemVariants}>
                    <Card className="border-primary/10 shadow-sm transition-all hover:shadow-md hover:border-primary/30">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">System Health</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                          <Server className="h-4 w-4 text-emerald-600" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">99.99%</div>
                        <p className="text-xs text-muted-foreground mt-1">All services operational</p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Card className="border-amber-500/10 shadow-sm transition-all hover:shadow-md hover:border-amber-500/30">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending Reviews</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                          <Activity className="h-4 w-4 text-amber-600" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-amber-600">{verifications.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">Professionals awaiting approval</p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Card className="border-primary/10 shadow-sm transition-all hover:shadow-md hover:border-primary/30">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Blockchain Status</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">Synced</div>
                        <p className="text-xs text-muted-foreground mt-1">Ledger immutable</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </TabsContent>

              <TabsContent value="verifications" className="m-0 focus-visible:outline-none">
                <Card className="border-muted shadow-sm">
                  <CardHeader>
                    <CardTitle>Pending Professional Verifications</CardTitle>
                    <CardDescription>Review and approve Doctors and Pharmacies before they can access the platform.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {verifications.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                        No pending verifications at this time.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {verifications.map((req, idx) => (
                          <motion.div 
                            key={req.request_id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
                          >
                            <div className="space-y-1 mb-4 md:mb-0">
                              <div className="flex items-center gap-2">
                                <Badge variant={req.role === 'DOCTOR' ? 'default' : 'secondary'}>{req.role}</Badge>
                                <span className="font-semibold text-lg">{req.profile?.full_name || req.profile?.business_name || req.email}</span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {req.role === 'DOCTOR' ? (
                                  <>
                                    <p><strong className="text-foreground/70">Hospital:</strong> {req.profile?.hospital_name}</p>
                                    <p><strong className="text-foreground/70">Address:</strong> {req.profile?.hospital_address}</p>
                                    <p><strong className="text-foreground/70">License:</strong> {req.profile?.license_number}</p>
                                  </>
                                ) : (
                                  <>
                                    <p><strong className="text-foreground/70">Address:</strong> {req.profile?.address}</p>
                                    <p><strong className="text-foreground/70">License:</strong> {req.profile?.license_number}</p>
                                  </>
                                )}
                                <p><strong className="text-foreground/70">Email:</strong> {req.email}</p>
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleReject(req.request_id)}>
                                <XCircle className="w-4 h-4 mr-2" /> Reject
                              </Button>
                              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleApprove(req.request_id)}>
                                <CheckCircle className="w-4 h-4 mr-2" /> Approve
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="patients" className="m-0 focus-visible:outline-none">
                <Card className="border-muted shadow-sm">
                  <CardHeader>
                    <CardTitle>Registered Patients</CardTitle>
                    <CardDescription>Manage patient accounts across the platform.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <div className="grid grid-cols-4 font-medium text-sm text-muted-foreground border-b p-4 bg-muted/30">
                        <div className="col-span-1">Name</div>
                        <div className="col-span-1">Email</div>
                        <div className="col-span-1">Status</div>
                        <div className="col-span-1 text-right">Actions</div>
                      </div>
                      <div className="divide-y">
                        {patients.map((p) => (
                          <div key={p.user_id} className="grid grid-cols-4 items-center text-sm p-4 hover:bg-muted/10 transition-colors">
                            <div className="col-span-1 font-medium">{p.full_name}</div>
                            <div className="col-span-1 text-muted-foreground">{p.email}</div>
                            <div className="col-span-1">
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{p.status}</Badge>
                            </div>
                            <div className="col-span-1 text-right">
                              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeletePatient(p.user_id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {patients.length === 0 && (
                          <div className="p-8 text-center text-muted-foreground">No patients found.</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="admins" className="m-0 focus-visible:outline-none">
                <Card className="border-muted shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>System Administrators</CardTitle>
                      <CardDescription>Manage personnel with administrative access.</CardDescription>
                    </div>
                    <Button variant="default" className="shadow-sm">
                      <UserPlus className="h-4 w-4 mr-2" /> Invite Admin
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <div className="divide-y">
                        {admins.map((a) => (
                          <div key={a.user_id} className="flex justify-between items-center text-sm p-4 hover:bg-muted/10 transition-colors">
                            <div>
                              <div className="font-medium">{a.email}</div>
                              <div className="text-xs text-muted-foreground mt-1">Joined: {new Date(a.created_at).toLocaleDateString()}</div>
                            </div>
                            <Badge variant="secondary">Admin</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Tabs>
    </div>
  );
}
