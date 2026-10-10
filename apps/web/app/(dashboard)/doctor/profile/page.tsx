"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { Button } from "@medsync/ui";
import { Input } from "@medsync/ui";
import { Badge } from "@medsync/ui";
import { CheckCircle, Loader2, Save, Building2, Plus, Clock, ShieldAlert, ShieldCheck, MapPin, Briefcase, Calendar, Phone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import { hospitalService } from "@/services/hospital.service";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@medsync/ui";
import { Select } from "@medsync/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@medsync/ui";

export default function DoctorProfilePage() {
  const [userId, setUserId] = useState<string>("");
  const [profile, setProfile] = useState<any>(null);
  const [doctorData, setDoctorData] = useState<any>({});
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [additionalLocations, setAdditionalLocations] = useState<any[]>([]);
  const [locationMode, setLocationMode] = useState<"HOSPITAL" | "CLINIC">("HOSPITAL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Facility Registration Modal State
  const [isAddFacilityOpen, setIsAddFacilityOpen] = useState(false);
  const [submittingFacility, setSubmittingFacility] = useState(false);
  const [newFacility, setNewFacility] = useState({
    name: "",
    type: "hospital",
    address: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
    phone_number: "",
    email: "",
    working_days: "Mon - Fri",
    consultation_hours: "09:00 AM - 05:00 PM",
  });

  // Additional Practice Facility Modal State
  const [isAddPracticeModalOpen, setIsAddPracticeModalOpen] = useState(false);
  const [submittingPractice, setSubmittingPractice] = useState(false);
  const [practiceFormData, setPracticeFormData] = useState({
    location_type: "HOSPITAL",
    hospital_id: "",
    location_name: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
    phone: "",
    working_days: "Mon, Wed, Fri",
    consultation_hours: "10:00 AM - 02:00 PM",
    is_primary: false,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const userRes = await supabase.auth.getUser();
      if (!userRes.data.user) return;
      
      const session = await supabase.auth.getSession();
      const role = session.data.session?.user.user_metadata?.role || "DOCTOR";
      
      setUserId(userRes.data.user.id);
      
      const [docDataRes, hospRes, locsRes] = await Promise.all([
        supabase.from('doctors').select('*').eq('user_id', userRes.data.user.id).single(),
        api.get('/api/v1/hospitals').catch(() => ({ data: { data: [] } })),
        api.get('/api/v1/doctor-locations').catch(() => ({ data: { data: [] } }))
      ]);
      
      const fetchedHospitals = hospRes.data?.data || [];
      setHospitals(fetchedHospitals);
      setAdditionalLocations(locsRes.data?.data || []);
      
      // Determine genuine approval status from DB
      const doctorStatus = docDataRes.data?.doctor_status || "ACTIVE";
      const status = doctorStatus === "APPROVED" || doctorStatus === "ACTIVE" ? "ACTIVE" : (docDataRes.data?.doctor_status || "ACTIVE");
        
      setProfile({
        id: userRes.data.user.id,
        email: userRes.data.user.email,
        role: role,
        status: status,
      });

      if (docDataRes.data) {
        setDoctorData(docDataRes.data);
        if (docDataRes.data.hospital_id) {
          setLocationMode("HOSPITAL");
        } else if (docDataRes.data.clinic_name) {
          setLocationMode("CLINIC");
        }
      }
      
    } catch (err) {
      console.error("Error loading doctor profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDoctorData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const payload: any = {
        full_name: doctorData.full_name,
        specialization: doctorData.specialization,
        experience_years: parseInt(doctorData.experience_years) || 0,
        bio: doctorData.bio,
        languages: doctorData.languages,
        qualifications: doctorData.qualifications,
        medical_council_reg_number: doctorData.medical_council_reg_number,
        license_number: doctorData.license_number,
        city: doctorData.city,
        state: doctorData.state,
        country: doctorData.country,
        pincode: doctorData.pincode,
        consultation_fee: parseInt(doctorData.consultation_fee) || 0,
        consultation_hours: doctorData.consultation_hours,
        profile_completion_percentage: 100,
      };

      if (locationMode === "HOSPITAL") {
        payload.hospital_id = doctorData.hospital_id || null;
        payload.clinic_name = null;
        payload.clinic_address = null;
      } else {
        payload.hospital_id = null;
        payload.clinic_name = doctorData.clinic_name;
        payload.clinic_address = doctorData.clinic_address;
      }

      await api.put(`/api/v1/profile/${userId}/completion`, payload);

      // Also update doctors table in Supabase
      await supabase
        .from('doctors')
        .update({
          full_name: payload.full_name,
          specialization: payload.specialization,
          experience_years: payload.experience_years,
          bio: payload.bio,
          languages: payload.languages,
          qualifications: payload.qualifications,
          medical_council_reg_number: payload.medical_council_reg_number,
          license_number: payload.license_number,
          city: payload.city,
          state: payload.state,
          country: payload.country,
          pincode: payload.pincode,
          consultation_fee: payload.consultation_fee,
          consultation_hours: payload.consultation_hours,
          hospital_id: payload.hospital_id,
          clinic_name: payload.clinic_name,
          clinic_address: payload.clinic_address,
        })
        .eq('user_id', userId);

      setSaveSuccess(true);
      toast.success("Professional profile saved successfully!");
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error(error.response?.data?.detail || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // Add Additional Practice Facility
  const handleAddPracticeLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPractice(true);
    try {
      const payload: any = {
        location_type: practiceFormData.location_type,
        address: practiceFormData.address,
        city: practiceFormData.city,
        state: practiceFormData.state,
        country: practiceFormData.country,
        pincode: practiceFormData.pincode,
        phone: practiceFormData.phone,
        working_days: practiceFormData.working_days,
        consultation_hours: practiceFormData.consultation_hours,
        is_primary: false,
      };

      if (practiceFormData.location_type === "HOSPITAL") {
        if (!practiceFormData.hospital_id) {
          toast.error("Please select a hospital facility");
          setSubmittingPractice(false);
          return;
        }
        payload.hospital_id = practiceFormData.hospital_id;
        const matchedHosp = hospitals.find(h => h.id === practiceFormData.hospital_id);
        payload.location_name = matchedHosp?.name || "Hospital Facility";
        payload.address = payload.address || matchedHosp?.address;
        payload.city = payload.city || matchedHosp?.city;
      } else {
        if (!practiceFormData.location_name || !practiceFormData.address) {
          toast.error("Please enter clinic name and address");
          setSubmittingPractice(false);
          return;
        }
        payload.location_name = practiceFormData.location_name;
      }

      const res = await api.post('/api/v1/doctor-locations', payload);
      toast.success("Additional facility added! Submitted for administrative verification.");
      setIsAddPracticeModalOpen(false);

      // Refresh doctor locations
      const locsRes = await api.get('/api/v1/doctor-locations');
      setAdditionalLocations(locsRes.data?.data || []);

      setPracticeFormData({
        location_type: "HOSPITAL",
        hospital_id: "",
        location_name: "",
        address: "",
        city: "",
        state: "",
        country: "India",
        pincode: "",
        phone: "",
        working_days: "Mon, Wed, Fri",
        consultation_hours: "10:00 AM - 02:00 PM",
        is_primary: false,
      });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to add facility location");
    } finally {
      setSubmittingPractice(false);
    }
  };

  // Add Entire New Facility to MedSync Network
  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFacility.name || !newFacility.address) {
      toast.error("Please enter the facility name and address.");
      return;
    }
    setSubmittingFacility(true);
    try {
      const res = await hospitalService.createHospital(newFacility);
      const created = res.data?.data;
      toast.success("Medical facility submitted! Awaiting administrator authorization.");
      setIsAddFacilityOpen(false);

      // Refresh facilities list
      const hospRes = await hospitalService.getHospitals();
      const updatedHospitals = hospRes.data?.data || [];
      setHospitals(updatedHospitals);

      if (created?.id) {
        setDoctorData((prev: any) => ({ ...prev, hospital_id: created.id }));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to submit facility.");
    } finally {
      setSubmittingFacility(false);
    }
  };

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const isPendingReview = profile?.status === "PENDING";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Professional Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your professional credentials, medical practice details, and affiliated facilities.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-md">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Profile
        </Button>
      </div>

      {isPendingReview && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-4 rounded-xl flex items-start gap-3">
          <Clock className="w-5 h-5 mt-0.5 shrink-0 text-amber-500" />
          <div>
            <h3 className="font-medium">License Verification in Progress</h3>
            <p className="text-sm mt-0.5 opacity-90">
              Your professional account and clinical license are currently under review by our administration team. 
              You can freely complete and update your credentials and affiliated practice locations below.
            </p>
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <p className="text-sm font-medium">Profile and clinical details updated successfully!</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Personal & Clinical Information */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-lg">Personal & Clinical Information</CardTitle>
            <CardDescription>Your clinical details as they appear to patients and peers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <Input value={profile?.email || ""} disabled className="bg-muted/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Account Status</label>
                <div>
                  <Badge variant={profile?.status === "ACTIVE" ? "default" : "secondary"}>
                    {profile?.status || "ACTIVE"}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Full Name *</label>
                <Input name="full_name" value={doctorData.full_name || ""} onChange={handleInputChange} placeholder="Dr. Full Name" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Specialization *</label>
                <Input name="specialization" value={doctorData.specialization || ""} onChange={handleInputChange} placeholder="e.g. Cardiologist, General Physician" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Qualifications</label>
                <Input name="qualifications" value={doctorData.qualifications || ""} onChange={handleInputChange} placeholder="e.g. MBBS, MD, FRCS" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Experience (Years)</label>
                <Input type="number" name="experience_years" value={doctorData.experience_years || ""} onChange={handleInputChange} placeholder="e.g. 10" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Languages Spoken</label>
                <Input name="languages" value={doctorData.languages || ""} placeholder="e.g. English, Hindi, Kannada" onChange={handleInputChange} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Consultation Fee ($ / ₹)</label>
                <Input type="number" name="consultation_fee" value={doctorData.consultation_fee || ""} onChange={handleInputChange} placeholder="e.g. 50" />
              </div>
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-xs font-medium text-muted-foreground">Professional Bio</label>
              <textarea 
                name="bio"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[90px]"
                value={doctorData.bio || ""}
                onChange={handleInputChange}
                placeholder="Briefly describe your clinical background, areas of expertise, and care philosophy..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Primary Workplace & Practice Facility */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-lg">Primary Workplace & Credentials</CardTitle>
            <CardDescription>Your medical license number and primary consultation facility.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Medical Council Reg. Number</label>
                <Input name="medical_council_reg_number" value={doctorData.medical_council_reg_number || ""} onChange={handleInputChange} placeholder="e.g. MCI-12345" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">License Number</label>
                <Input name="license_number" value={doctorData.license_number || ""} onChange={handleInputChange} placeholder="e.g. LIC-98765" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Primary Consultation Hours</label>
                <Input name="consultation_hours" placeholder="e.g. Mon-Fri, 9AM-5PM" value={doctorData.consultation_hours || ""} onChange={handleInputChange} />
              </div>
            </div>

            <div className="pt-2">
              <Tabs value={locationMode} onValueChange={(v: any) => { setLocationMode(v); if(v === "HOSPITAL") { setDoctorData((prev: any) => ({...prev, clinic_name: "", clinic_address: ""})) } else { setDoctorData((prev: any) => ({...prev, hospital_id: ""})) } }}>
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                  <TabsTrigger value="HOSPITAL">Hospital / Medical Center</TabsTrigger>
                  <TabsTrigger value="CLINIC">Private Clinic</TabsTrigger>
                </TabsList>
                
                <TabsContent value="HOSPITAL" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">Primary Medical Facility</label>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setNewFacility(prev => ({ ...prev, type: "hospital" }));
                          setIsAddFacilityOpen(true);
                        }}
                        className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <Plus className="w-3.5 h-3.5" /> Register New Facility
                      </Button>
                    </div>
                    <Select 
                      value={doctorData.hospital_id || ""} 
                      onChange={(e) => setDoctorData((prev: any) => ({...prev, hospital_id: e.target.value}))}
                    >
                      <option value="" disabled>Select a facility...</option>
                      {hospitals.map(h => (
                        <option key={h.id} value={h.id}>
                          {h.is_verified ? "🏥 " : "⏳ [Pending Admin] "}
                          {h.name} - {h.city || "Bengaluru"} ({h.type === "clinic" ? "Clinic" : "Hospital"})
                        </option>
                      ))}
                    </Select>

                    {(() => {
                      const selectedHospital = hospitals.find(h => h.id === doctorData.hospital_id);
                      if (!selectedHospital) return null;
                      return selectedHospital.is_verified ? (
                        <div className="p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span><strong>Verified Facility:</strong> Authorized by MedSync Administration.</span>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                          <span><strong>Pending Admin Authorization:</strong> This facility is under review by administrator.</span>
                        </div>
                      );
                    })()}
                  </div>
                </TabsContent>

                <TabsContent value="CLINIC" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Clinic Name</label>
                      <Input name="clinic_name" value={doctorData.clinic_name || ""} onChange={handleInputChange} placeholder="e.g. Apex Care Clinic" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Clinic Address</label>
                      <Input name="clinic_address" value={doctorData.clinic_address || ""} onChange={handleInputChange} placeholder="e.g. 45 Indiranagar 100ft Rd" />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Additional Practice Facilities & Workplaces */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                Additional Facilities You Work In
              </CardTitle>
              <CardDescription>
                Add additional clinics, hospitals, or consulting chambers where you practice. All added facilities go to the administrator for verification.
              </CardDescription>
            </div>
            <Button 
              size="sm" 
              onClick={() => setIsAddPracticeModalOpen(true)}
              className="gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Additional Facility
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            {additionalLocations.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-xl p-6 bg-muted/20">
                <Building2 className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium">No additional practice facilities added</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                  Do you practice at multiple hospitals or visiting clinics? Click &quot;Add Additional Facility&quot; above to register them with administrator approval.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {additionalLocations.map((loc) => {
                  const isApproved = loc.verification_status === "APPROVED";
                  return (
                    <div 
                      key={loc.id} 
                      className="p-4 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-colors space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-primary shrink-0" />
                            {loc.location_name || loc.address || "Medical Facility"}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            {[loc.address, loc.city, loc.state].filter(Boolean).join(", ") || "Location details on file"}
                          </p>
                        </div>
                        {isApproved ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px] shrink-0">
                            <ShieldCheck className="w-3 h-3 mr-1" /> Approved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[11px] shrink-0">
                            <Clock className="w-3 h-3 mr-1" /> Pending Admin
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t border-border/40">
                        {loc.working_days && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                            <span>{loc.working_days}</span>
                          </div>
                        )}
                        {loc.consultation_hours && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                            <span>{loc.consultation_hours}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal: Add Additional Practice Facility (Goes to Admin for Approval) */}
      <Dialog open={isAddPracticeModalOpen} onOpenChange={setIsAddPracticeModalOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Building2 className="w-5 h-5 text-primary" />
              Add Additional Practice Facility
            </DialogTitle>
            <DialogDescription>
              Add another hospital or clinic you consult at. This practice affiliation goes to MedSync administration for verification.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs flex gap-2.5 items-start mt-2">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Goes to Admin for Authorization</p>
              <p className="opacity-90 mt-0.5">
                Once submitted, an administrator will review and verify your affiliation with this medical facility.
              </p>
            </div>
          </div>

          <form onSubmit={handleAddPracticeLocation} className="space-y-4 mt-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Facility Type *</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={practiceFormData.location_type}
                onChange={(e) => setPracticeFormData({ ...practiceFormData, location_type: e.target.value })}
              >
                <option value="HOSPITAL">Hospital / Medical Center</option>
                <option value="CLINIC">Private Clinic / Consultation Chamber</option>
              </select>
            </div>

            {practiceFormData.location_type === "HOSPITAL" ? (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Select Hospital *</label>
                <Select 
                  value={practiceFormData.hospital_id} 
                  onChange={(e) => setPracticeFormData({ ...practiceFormData, hospital_id: e.target.value })}
                >
                  <option value="" disabled>Select hospital from MedSync network...</option>
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.name} - {h.city || "Bengaluru"}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Clinic / Center Name *</label>
                <Input 
                  required
                  value={practiceFormData.location_name}
                  onChange={(e) => setPracticeFormData({ ...practiceFormData, location_name: e.target.value })}
                  placeholder="e.g. HealthFirst Specialist Clinic"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Address / Area *</label>
              <Input 
                required
                value={practiceFormData.address}
                onChange={(e) => setPracticeFormData({ ...practiceFormData, address: e.target.value })}
                placeholder="e.g. 2nd Floor, 12th Main Road, Indiranagar"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Working Days</label>
                <Input 
                  value={practiceFormData.working_days}
                  onChange={(e) => setPracticeFormData({ ...practiceFormData, working_days: e.target.value })}
                  placeholder="e.g. Mon, Wed, Fri"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Consultation Hours</label>
                <Input 
                  value={practiceFormData.consultation_hours}
                  onChange={(e) => setPracticeFormData({ ...practiceFormData, consultation_hours: e.target.value })}
                  placeholder="e.g. 10:00 AM - 02:00 PM"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">City</label>
                <Input 
                  value={practiceFormData.city}
                  onChange={(e) => setPracticeFormData({ ...practiceFormData, city: e.target.value })}
                  placeholder="e.g. Bengaluru"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Contact Phone</label>
                <Input 
                  value={practiceFormData.phone}
                  onChange={(e) => setPracticeFormData({ ...practiceFormData, phone: e.target.value })}
                  placeholder="e.g. +91 80 2345 6789"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAddPracticeModalOpen(false)}
                disabled={submittingPractice}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submittingPractice}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
              >
                {submittingPractice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Submit to Admin for Approval
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Register Entire New Facility to MedSync */}
      <Dialog open={isAddFacilityOpen} onOpenChange={setIsAddFacilityOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Building2 className="w-5 h-5 text-primary" />
              Register Medical Facility
            </DialogTitle>
            <DialogDescription>
              Register a hospital or healthcare center into the MedSync network for administrative authorization.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateFacility} className="space-y-4 mt-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Facility Name *</label>
                <Input 
                  required
                  value={newFacility.name}
                  onChange={(e) => setNewFacility({ ...newFacility, name: e.target.value })}
                  placeholder="e.g. City General Hospital"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Facility Type *</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={newFacility.type}
                  onChange={(e) => setNewFacility({ ...newFacility, type: e.target.value })}
                >
                  <option value="hospital">Hospital</option>
                  <option value="clinic">Clinic</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Address *</label>
              <Input 
                required
                value={newFacility.address}
                onChange={(e) => setNewFacility({ ...newFacility, address: e.target.value })}
                placeholder="e.g. 100 Healthcare Boulevard"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">City</label>
                <Input 
                  value={newFacility.city}
                  onChange={(e) => setNewFacility({ ...newFacility, city: e.target.value })}
                  placeholder="e.g. Bengaluru"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Phone</label>
                <Input 
                  value={newFacility.phone_number}
                  onChange={(e) => setNewFacility({ ...newFacility, phone_number: e.target.value })}
                  placeholder="e.g. +91 80 1234567"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAddFacilityOpen(false)}
                disabled={submittingFacility}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submittingFacility || !newFacility.name || !newFacility.address}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
              >
                {submittingFacility ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Submit for Approval
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
