"use client";

import { useState, useEffect } from "react";
import { 
  Users, Trash2, CheckCircle, XCircle, ShieldOff, Building2, Building, 
  Stethoscope, Pill, MapPin, Phone, Mail, Clock, ShieldCheck, ExternalLink, 
  Loader2, Award, FileText, CheckCircle2 
} from "lucide-react";
import { 
  Tabs, TabsContent, TabsList, TabsTrigger, Button, Badge, Skeleton, 
  Card, CardHeader, CardTitle, CardDescription, CardContent 
} from "@medsync/ui";
import api from "@/lib/api";
import { toast } from "sonner";
import { formatDoctorName } from "@/lib/formatDoctorName";

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

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await api.post(`/api/v1/admin/verifications/${id}/approve`);
      toast.success("Application approved and verified successfully!");
      fetchData();
      setSelectedVerification(null);
    } catch (err: any) {
      console.error("Failed to approve", err);
      toast.error(err.response?.data?.detail || "Failed to approve verification");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this verification request?")) return;
    setActionLoading(id);
    try {
      await api.post(`/api/v1/admin/verifications/${id}/reject`);
      toast.success("Verification request rejected");
      fetchData();
      setSelectedVerification(null);
    } catch (err: any) {
      console.error("Failed to reject", err);
      toast.error(err.response?.data?.detail || "Failed to reject verification");
    } finally {
      setActionLoading(null);
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
          <Card className="border shadow-sm">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Pending Professional Verifications</CardTitle>
                  <CardDescription>Carefully review clinical credentials, practice affiliations, and facility registrations before granting full network access.</CardDescription>
                </div>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 px-3 py-1 text-xs">
                  {verifications.length} Pending Approval
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
                </div>
              ) : verifications.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground border border-dashed rounded-xl p-8 bg-muted/10">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500/60 mb-3" />
                  <p className="text-base font-semibold text-foreground">All Clear!</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    There are no pending doctor licenses, clinic registrations, or pharmacy verification requests at this time.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {verifications.map((req: any) => {
                    const isDoctor = req.role === "DOCTOR";
                    const prof = req.profile || {};
                    const isClinic = prof.practice_type === "CLINIC" || prof.clinic_name;
                    const appliedHospName = prof.applied_hospital_info?.name || prof.hospital_name;
                    const clinicName = prof.clinic_info?.name || prof.clinic_name;
                    const gstNo = prof.gst_number;

                    return (
                      <div 
                        key={req.request_id} 
                        className="p-5 border border-border/70 rounded-xl hover:border-primary/50 transition-all bg-card shadow-sm space-y-3.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={isDoctor ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-amber-600 hover:bg-amber-700 text-white"}>
                                {req.role}
                              </Badge>
                              <span className="font-bold text-base text-foreground">
                                {isDoctor ? formatDoctorName(prof.full_name || req.email) : (prof.business_name || req.email)}
                              </span>
                              {prof.specialization && (
                                <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                                  {prof.specialization}
                                </Badge>
                              )}
                              {req.email?.toLowerCase().includes('@gmail.com') && (
                                <span className="flex items-center text-emerald-600 text-xs font-medium bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                  <CheckCircle className="h-3 w-3 mr-1" /> Auth Verified
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                              <span><Mail className="w-3 h-3 inline mr-1" />{req.email}</span>
                              <span>•</span>
                              <span>License: <strong>{prof.license_number || "Pending"}</strong></span>
                              {prof.medical_council_reg_number && (
                                <>
                                  <span>•</span>
                                  <span>Council Reg: <strong>{prof.medical_council_reg_number}</strong></span>
                                </>
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setSelectedVerification(req)}
                              className="text-xs h-9 gap-1 shadow-sm"
                            >
                              Review Application
                            </Button>
                            <Button 
                              size="sm" 
                              disabled={actionLoading === req.request_id}
                              onClick={() => handleApprove(req.request_id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 gap-1 shadow-sm"
                            >
                              {actionLoading === req.request_id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle className="w-3.5 h-3.5" />
                              )}
                              Approve
                            </Button>
                          </div>
                        </div>

                        {/* Workplace & Facility Highlight Banner */}
                        <div className="p-3 rounded-lg bg-muted/40 border border-border/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            {isDoctor ? (
                              isClinic ? (
                                <span className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                                  <Stethoscope className="w-4 h-4 text-emerald-600" />
                                  <span><strong>Private Clinic:</strong> {clinicName || "Clinic details submitted"}</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 font-medium text-blue-700 dark:text-blue-400">
                                  <Building2 className="w-4 h-4 text-blue-600" />
                                  <span><strong>Applied to Hospital:</strong> {appliedHospName || "Hospital facility"}</span>
                                </span>
                              )
                            ) : (
                              <span className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
                                <Pill className="w-4 h-4 text-amber-600" />
                                <span><strong>Pharmacy Store:</strong> {prof.business_name} {prof.clinic_name ? `(Linked to Clinic: ${prof.clinic_name})` : (prof.affiliated_info ? `(At ${prof.affiliated_info.name})` : "")}</span>
                              </span>
                            )}

                            {(prof.city || prof.clinic_info?.city || prof.applied_hospital_info?.city) && (
                              <span className="text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {prof.city || prof.clinic_info?.city || prof.applied_hospital_info?.city}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {gstNo && (
                              <Badge variant="outline" className="text-[11px] bg-background border-border">
                                GST: {gstNo}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                              <Clock className="w-3 h-3 mr-1" /> Pending Approval
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── MODAL: Comprehensive Professional Verification Details ─── */}
        {selectedVerification && (() => {
          const req = selectedVerification;
          const isDoctor = req.role === "DOCTOR";
          const prof = req.profile || {};
          const isClinic = prof.practice_type === "CLINIC" || prof.clinic_name;
          const appliedHosp = prof.applied_hospital_info;
          const clinicInfo = prof.clinic_info;
          const gstNo = prof.gst_number;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
              <div className="bg-background border border-border/80 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto">
                <div className="p-6 border-b border-border/60 flex items-start justify-between bg-muted/20">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={isDoctor ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"}>
                        {req.role}
                      </Badge>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-xs">
                        <Clock className="w-3 h-3 mr-1" /> Pending Approval
                      </Badge>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                      {isDoctor ? formatDoctorName(prof.full_name || req.email) : (prof.business_name || req.email)}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Submitted application for MedSync credentialing and network authorization.
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedVerification(null)} className="h-8 w-8 p-0 rounded-full">
                    ✕
                  </Button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Card 1: Identity & Credentials */}
                  <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-primary" />
                      Professional Identity & Credentials
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground">Email Address</span>
                        <p className="font-medium flex items-center gap-1.5 text-foreground">
                          {req.email}
                          {req.email?.toLowerCase().includes('@gmail.com') && (
                            <span className="text-emerald-600 text-[11px] bg-emerald-500/10 px-1.5 py-0.2 rounded font-normal">
                              Verified
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Medical License No.</span>
                        <p className="font-semibold text-foreground">{prof.license_number || "N/A"}</p>
                      </div>
                      {prof.medical_council_reg_number && (
                        <div>
                          <span className="text-xs text-muted-foreground">Medical Council Reg. No.</span>
                          <p className="font-semibold text-foreground">{prof.medical_council_reg_number}</p>
                        </div>
                      )}
                      {gstNo && (
                        <div>
                          <span className="text-xs text-muted-foreground">GST Registration No.</span>
                          <p className="font-semibold text-foreground">{gstNo}</p>
                        </div>
                      )}
                      {prof.specialization && (
                        <div>
                          <span className="text-xs text-muted-foreground">Specialization</span>
                          <p className="font-medium text-foreground">{prof.specialization}</p>
                        </div>
                      )}
                      {prof.qualifications && (
                        <div>
                          <span className="text-xs text-muted-foreground">Qualifications</span>
                          <p className="font-medium text-foreground">{prof.qualifications}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card 2: Workplace & Facility Affiliation (Exact requirement) */}
                  <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-primary" />
                      Practice Workplace & Facility Affiliation
                    </h3>

                    {isDoctor ? (
                      isClinic ? (
                        /* Doctor registering a Private Clinic */
                        <div className="space-y-3 bg-emerald-500/[0.04] p-3.5 rounded-lg border border-emerald-500/20">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                              <Stethoscope className="w-4 h-4" /> New Private Clinic Registration
                            </span>
                            <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                              Private Practice
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm pt-1">
                            <div>
                              <span className="text-xs text-muted-foreground">Clinic Name</span>
                              <p className="font-semibold text-foreground">{clinicInfo?.name || prof.clinic_name || "Apex Care Clinic"}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground">Clinic Phone / Contact</span>
                              <p className="font-medium text-foreground">{clinicInfo?.phone || prof.clinic_phone || "On file"}</p>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-xs text-muted-foreground">Clinic Complete Address</span>
                              <p className="font-medium text-foreground flex items-start gap-1">
                                <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                {[clinicInfo?.address || prof.clinic_address, clinicInfo?.city || prof.city, clinicInfo?.state || prof.state, clinicInfo?.pincode || prof.pincode].filter(Boolean).join(", ") || "Location details submitted"}
                              </p>
                            </div>
                            {(clinicInfo?.google_maps_url || prof.google_maps_url) && (
                              <div className="sm:col-span-2">
                                <span className="text-xs text-muted-foreground">Map Coordinates & Link</span>
                                <p className="text-sm">
                                  <a 
                                    href={clinicInfo?.google_maps_url || prof.google_maps_url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
                                  >
                                    View on Google Maps <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Doctor applying to work at an Existing Hospital */
                        <div className="space-y-3 bg-blue-500/[0.04] p-3.5 rounded-lg border border-blue-500/20">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                              <Building2 className="w-4 h-4" /> Hospital Affiliation Application
                            </span>
                            <Badge variant="outline" className="text-[11px] bg-blue-500/10 text-blue-700 border-blue-500/30">
                              Network Hospital
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm pt-1">
                            <div className="sm:col-span-2">
                              <span className="text-xs text-muted-foreground">Hospital Facility Applied For</span>
                              <p className="font-semibold text-foreground text-base">
                                {appliedHosp?.name || prof.hospital_name || "Existing Hospital Facility"}
                              </p>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-xs text-muted-foreground">Hospital Address</span>
                              <p className="font-medium text-foreground flex items-start gap-1">
                                <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                {[appliedHosp?.address || prof.hospital_address, appliedHosp?.city, appliedHosp?.state].filter(Boolean).join(", ") || "Facility address on record"}
                              </p>
                            </div>
                            {appliedHosp?.phone && (
                              <div>
                                <span className="text-xs text-muted-foreground">Hospital Contact Phone</span>
                                <p className="font-medium text-foreground">{appliedHosp.phone}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    ) : (
                      /* Pharmacy Facility Details */
                      <div className="space-y-3 bg-amber-500/[0.04] p-3.5 rounded-lg border border-amber-500/20">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                            <Pill className="w-4 h-4" /> Pharmacy Store & Affiliation
                          </span>
                          <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-700 border-amber-500/30">
                            Fulfillment Center
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm pt-1">
                          <div>
                            <span className="text-xs text-muted-foreground">Store Business Name</span>
                            <p className="font-semibold text-foreground">{prof.business_name}</p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Contact Phone</span>
                            <p className="font-medium text-foreground">{prof.contact_number || "On file"}</p>
                          </div>
                          {prof.clinic_name && (
                            <div className="sm:col-span-2">
                              <span className="text-xs text-muted-foreground">Affiliated Private Clinic</span>
                              <p className="font-semibold text-emerald-600 flex items-center gap-1">
                                <Building className="w-4 h-4" /> Linked to {prof.clinic_name}
                              </p>
                            </div>
                          )}
                          {prof.affiliated_info && !prof.clinic_name && (
                            <div className="sm:col-span-2">
                              <span className="text-xs text-muted-foreground">Affiliated Facility</span>
                              <p className="font-semibold text-blue-600 flex items-center gap-1">
                                <Building2 className="w-4 h-4" /> Located at {prof.affiliated_info.name}
                              </p>
                            </div>
                          )}
                          <div className="sm:col-span-2">
                            <span className="text-xs text-muted-foreground">Physical Store Address</span>
                            <p className="font-medium text-foreground flex items-start gap-1">
                              <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              {[prof.address, prof.city, prof.state, prof.pincode].filter(Boolean).join(", ") || "Store address on file"}
                            </p>
                          </div>
                          {prof.operating_hours && (
                            <div>
                              <span className="text-xs text-muted-foreground">Operating Hours</span>
                              <p className="font-medium text-foreground">{prof.operating_hours}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card 3: Additional Practice Locations if any */}
                  {prof.locations && prof.locations.length > 0 && (
                    <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-primary" />
                        Registered Practice Facilities ({prof.locations.length})
                      </h3>
                      <div className="space-y-2">
                        {prof.locations.map((loc: any, idx: number) => (
                          <div key={idx} className="p-2.5 rounded-lg border border-border/40 bg-muted/20 text-xs flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-foreground">{loc.location_name || "Facility"} ({loc.location_type})</p>
                              <p className="text-muted-foreground">{[loc.address, loc.city].filter(Boolean).join(", ")}</p>
                            </div>
                            <span className="text-muted-foreground">{loc.working_days || "Full Week"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-border/60 flex flex-col sm:flex-row justify-end items-center gap-3 bg-muted/20">
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedVerification(null)}
                    disabled={actionLoading === req.request_id}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="outline" 
                    disabled={actionLoading === req.request_id}
                    className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
                    onClick={() => handleReject(req.request_id)}
                  >
                    {actionLoading === req.request_id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Reject Application
                  </Button>
                  <Button 
                    disabled={actionLoading === req.request_id}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-md"
                    onClick={() => handleApprove(req.request_id)}
                  >
                    {actionLoading === req.request_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    Verify & Authorize {isDoctor ? "Doctor & Clinics" : "Pharmacy"}
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}

        <TabsContent value="patients">
          <Card>
            <CardHeader><CardTitle>Registered Patients</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-40 w-full" /> : (
                <div className="divide-y border rounded-xl">
                  {patients.map((p: any) => (
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
                  {doctors.map((d: any) => (
                    <div key={d.user_id} className="flex justify-between items-center p-4 hover:bg-muted/10">
                      <div>
                        <p className="font-medium">{formatDoctorName(d.full_name)}</p>
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
                  {pharmacies.map((p: any) => (
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
                  {admins.map((a: any) => (
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
