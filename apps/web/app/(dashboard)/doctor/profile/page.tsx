"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { Button } from "@medsync/ui";
import { Input } from "@medsync/ui";
import { Badge } from "@medsync/ui";
import { UploadCloud, CheckCircle, XCircle, Image as ImageIcon, Loader2, Save, Building2, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import dynamic from "next/dynamic";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@medsync/ui";
import { Select } from "@medsync/ui";
import Image from "next/image";

const LocationPickerMap = dynamic(() => import("@/components/LocationPickerMap"), { ssr: false });

export default function DoctorProfilePage() {
  const [userId, setUserId] = useState<string>("");
  const [profile, setProfile] = useState<any>(null);
  const [doctorData, setDoctorData] = useState<any>({});
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [locationMode, setLocationMode] = useState<"HOSPITAL" | "CLINIC">("HOSPITAL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Image Upload State
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const status = session.data.session?.user.user_metadata?.status || "PENDING";
      
      setUserId(userRes.data.user.id);
      
      const [docDataRes, hospRes] = await Promise.all([
        supabase.from('doctors').select('*').eq('user_id', userRes.data.user.id).single(),
        api.get('/api/v1/hospitals').catch(() => ({ data: { data: [] } }))
      ]);
      
      setHospitals(hospRes.data?.data || []);
        
      setProfile({
        id: userRes.data.user.id,
        email: userRes.data.user.email,
        role: role,
        status: status,
      });

      if (docDataRes.data) {
        setDoctorData(docDataRes.data);
        if (docDataRes.data.profile_image) {
          setPreviewUrl(docDataRes.data.profile_picture_url || docDataRes.data.profile_image);
        }
        if (docDataRes.data.hospital_id) {
          setLocationMode("HOSPITAL");
        } else if (docDataRes.data.clinic_name) {
          setLocationMode("CLINIC");
        }
      }
      
    } catch (err) {
      console.error(err);
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
        profile_completion_percentage: 100, // Or whatever logic you use
      };

      if (locationMode === "HOSPITAL") {
        payload.hospital_id = doctorData.hospital_id;
        payload.clinic_name = null;
        payload.clinic_address = null;
      } else {
        payload.hospital_id = null;
        payload.clinic_name = doctorData.clinic_name;
        payload.clinic_address = doctorData.clinic_address;
      }

      await api.put(`/api/v1/profile/${userId}/completion`, payload);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (file: File) => {
    setErrorMsg("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrorMsg("Only JPG, PNG, and WEBP files are allowed.");
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("File size must be less than 5MB.");
      return false;
    }
    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        uploadFile(file);
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        uploadFile(file);
      }
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadProgress(10);
    
    // Create local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const interval = setInterval(() => {
        setUploadProgress(prev => (prev < 90 ? prev + 10 : prev));
      }, 200);

      const response = await api.post('/api/v1/profile/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      clearInterval(interval);
      setUploadProgress(100);
      
      if (response.data?.data?.profile_image_url) {
        setPreviewUrl(response.data.data.profile_image_url);
      }
      
    } catch (err: any) {
      setUploadProgress(0);
      setPreviewUrl(null);
      setErrorMsg(err.response?.data?.detail || "Upload failed. Please try again.");
    } finally {
      setTimeout(() => setUploading(false), 500);
    }
  };

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const isApproved = profile?.status === "ACTIVE";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Professional Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your professional details, clinic locations, and settings.</p>
        </div>
        <Button onClick={handleSave} disabled={saving || !isApproved} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Profile
        </Button>
      </div>

      {!isApproved && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-4 rounded-xl flex items-start gap-3">
          <Loader2 className="w-5 h-5 mt-0.5 animate-spin shrink-0" />
          <div>
            <h3 className="font-medium">Account Pending Approval</h3>
            <p className="text-sm mt-1 opacity-80">
              Your account is currently under review by our administration team. 
              Certain features, including profile updates, are disabled until you are approved.
            </p>
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5" />
          <p className="text-sm font-medium">Profile saved successfully!</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className={`col-span-1 border shadow-sm ${!isApproved ? 'opacity-70 pointer-events-none' : ''}`}>
          <CardHeader>
            <CardTitle>Profile Image</CardTitle>
            <CardDescription>Upload a professional photo.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            
            <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-muted bg-muted/30 flex items-center justify-center mb-6">
              {previewUrl ? (
                <Image 
                  src={previewUrl} 
                  alt="Profile Preview" 
                  className="w-full h-full object-cover"
                  width={160}
                  height={160}
                  unoptimized
                />
              ) : (
                <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
              )}
              
              {uploading && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                  <span className="text-xs font-medium">{uploadProgress}%</span>
                </div>
              )}
            </div>

            <div 
              className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"} ${!isApproved && "opacity-50"}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => isApproved && fileInputRef.current?.click()}
            >
              <Input 
                ref={fileInputRef}
                type="file" 
                accept="image/jpeg, image/png, image/webp" 
                className="hidden" 
                onChange={handleFileChange}
                disabled={!isApproved || uploading}
              />
              <UploadCloud className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">
                {isApproved ? "Click or drag image here" : "Upload disabled"}
              </p>
              <p className="text-xs text-muted-foreground">JPG, PNG, WEBP up to 5MB</p>
            </div>
            
            {errorMsg && (
              <p className="text-xs text-destructive mt-3 text-center flex items-center gap-1">
                <XCircle className="w-3 h-3" /> {errorMsg}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-2 border shadow-sm">
          <CardHeader>
            <CardTitle>Personal & Clinical Information</CardTitle>
            <CardDescription>Your details as they appear to patients.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <Input value={profile?.email || ""} disabled className="bg-muted/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <div>
                  <Badge variant={isApproved ? "default" : "secondary"}>{profile?.status}</Badge>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                <Input name="full_name" value={doctorData.full_name || ""} onChange={handleInputChange} disabled={!isApproved} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Specialization</label>
                <Input name="specialization" value={doctorData.specialization || ""} onChange={handleInputChange} disabled={!isApproved} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Qualifications</label>
                <Input name="qualifications" value={doctorData.qualifications || ""} onChange={handleInputChange} disabled={!isApproved} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Experience (Years)</label>
                <Input type="number" name="experience_years" value={doctorData.experience_years || ""} onChange={handleInputChange} disabled={!isApproved} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Languages</label>
                <Input name="languages" value={doctorData.languages || ""} placeholder="e.g. English, Spanish" onChange={handleInputChange} disabled={!isApproved} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Consultation Fee ($)</label>
                <Input type="number" name="consultation_fee" value={doctorData.consultation_fee || ""} onChange={handleInputChange} disabled={!isApproved} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Professional Bio</label>
              <textarea 
                name="bio"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
                value={doctorData.bio || ""}
                onChange={handleInputChange}
                disabled={!isApproved}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-full border shadow-sm">
          <CardHeader>
            <CardTitle>Professional Credentials & Location</CardTitle>
            <CardDescription>Your license and clinic information.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Medical Council Reg. Number</label>
                <Input name="medical_council_reg_number" value={doctorData.medical_council_reg_number || ""} onChange={handleInputChange} disabled={!isApproved} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">License Number</label>
                <Input name="license_number" value={doctorData.license_number || ""} onChange={handleInputChange} disabled={!isApproved} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Consultation Hours</label>
                <Input name="consultation_hours" placeholder="e.g. Mon-Fri, 9AM-5PM" value={doctorData.consultation_hours || ""} onChange={handleInputChange} disabled={!isApproved} />
              </div>
            </div>
            <div className="space-y-4">
              <Tabs value={locationMode} onValueChange={(v: any) => { setLocationMode(v); if(v === "HOSPITAL") { setDoctorData((prev: any) => ({...prev, clinic_name: "", clinic_address: ""})) } else { setDoctorData((prev: any) => ({...prev, hospital_id: ""})) } }}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="HOSPITAL" disabled={!isApproved}>Join Hospital</TabsTrigger>
                  <TabsTrigger value="CLINIC" disabled={!isApproved}>Private Clinic</TabsTrigger>
                </TabsList>
                
                <TabsContent value="HOSPITAL" className="space-y-4 mt-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Select Hospital</label>
                    <Select 
                      disabled={!isApproved} 
                      value={doctorData.hospital_id || ""} 
                      onChange={(e) => setDoctorData((prev: any) => ({...prev, hospital_id: e.target.value}))}
                    >
                      <option value="" disabled>Select a verified hospital...</option>
                      {hospitals.map(h => (
                        <option key={h.id} value={h.id}>{h.name} - {h.city}</option>
                      ))}
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="CLINIC" className="space-y-4 mt-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Clinic Name</label>
                    <Input name="clinic_name" value={doctorData.clinic_name || ""} onChange={handleInputChange} disabled={!isApproved} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Clinic Address</label>
                    <Input name="clinic_address" value={doctorData.clinic_address || ""} onChange={handleInputChange} disabled={!isApproved} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">City</label>
                      <Input name="city" value={doctorData.city || ""} onChange={handleInputChange} disabled={!isApproved} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Country</label>
                      <Input name="country" value={doctorData.country || ""} onChange={handleInputChange} disabled={!isApproved} />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
