"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Skeleton } from "@medsync/ui";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import { profileService } from "@/services/profile.service";
import { Loader2, Save, Heart, Activity, PhoneCall, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function MyHealthPage() {
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: "",
    date_of_birth: "",
    gender: "",
    blood_group: "",
    phone_number: "",
    address: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
    // Medical & Clinical Details (Shown in Doctor's tabs)
    medical_alerts: "",
    allergies: "",
    chronic_diseases: "",
    height_cm: "",
    weight_kg: "",
    // Emergency Contact
    emergency_contact_name: "",
    emergency_contact_number: ""
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
      }
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    
    async function loadProfile() {
      try {
        const { data, error } = await supabase
          .from("patients")
          .select("*")
          .eq("user_id", userId)
          .single();
          
        if (error) {
          console.error("Supabase error fetching patient profile:", error);
          if (error.code !== 'PGRST116') {
            toast.error("Failed to load patient information");
          }
        }
          
        if (data) {
          setFormData({
            full_name: data.full_name || "",
            date_of_birth: data.date_of_birth || "",
            gender: data.gender || "",
            blood_group: data.blood_group || "",
            phone_number: data.phone_number || "",
            address: data.address || "",
            city: data.city || "",
            state: data.state || "",
            country: data.country || "",
            pincode: data.pincode || "",
            medical_alerts: data.medical_alerts || "",
            allergies: data.allergies || "",
            chronic_diseases: data.chronic_diseases || "",
            height_cm: data.height_cm ? String(data.height_cm) : "",
            weight_kg: data.weight_kg ? String(data.weight_kg) : "",
            emergency_contact_name: data.emergency_contact_name || "",
            emergency_contact_number: data.emergency_contact_number || ""
          });
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    }
    
    loadProfile();
  }, [userId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const payload: any = {
        ...formData,
        height_cm: formData.height_cm ? parseFloat(formData.height_cm) : null,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        profile_completion_percentage: 100,
      };

      // 1. Try saving via backend API
      try {
        await profileService.updateProfileCompletion(userId, payload);
      } catch (backendErr) {
        console.warn("Backend profile completion update fallback to Supabase direct:", backendErr);
      }

      // 2. Also update Supabase for direct client queries
      const { error: supaErr } = await supabase
        .from("patients")
        .update({
          full_name: formData.full_name,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          blood_group: formData.blood_group,
          phone_number: formData.phone_number,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          pincode: formData.pincode,
          medical_alerts: formData.medical_alerts,
          allergies: formData.allergies,
          chronic_diseases: formData.chronic_diseases,
          height_cm: payload.height_cm,
          weight_kg: payload.weight_kg,
          emergency_contact_name: formData.emergency_contact_name,
          emergency_contact_number: formData.emergency_contact_number,
        })
        .eq("user_id", userId);

      if (supaErr) {
        throw supaErr;
      }

      toast.success("Health profile and clinical details updated successfully");
    } catch (err) {
      console.error("Error saving profile", err);
      toast.error("Failed to update health profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative space-y-8 pb-12 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <p className="text-sm font-medium tracking-widest uppercase text-blue-500 mb-2">My Health</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
            Health Profile
          </h1>
          <p className="text-muted-foreground mt-2 max-w-lg leading-relaxed">
            Manage your personal credentials, allergies, vitals, and medical alerts. These will appear in your clinical summary for doctors.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || loading} className="w-full sm:w-auto shadow-md">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save All Changes
        </Button>
      </motion.div>

      {loading ? (
        <Card className="rounded-2xl border border-border/60 bg-card/50">
          <CardContent className="p-6 space-y-6">
             <Skeleton className="h-10 w-full" />
             <Skeleton className="h-10 w-full" />
             <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* 1. Personal Details */}
          <Card className="rounded-2xl border border-border/60 bg-card/50 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/30">
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCheck className="w-5 h-5 text-blue-500" />
                Personal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                  <Input name="full_name" value={formData.full_name} onChange={handleChange} placeholder="Enter your full name" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Date of Birth</label>
                  <Input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Blood Group</label>
                  <select name="blood_group" value={formData.blood_group} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
                  <Input name="phone_number" value={formData.phone_number} onChange={handleChange} placeholder="+91 ..." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Address</label>
                  <Input name="address" value={formData.address} onChange={handleChange} placeholder="Street address" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">City</label>
                  <Input name="city" value={formData.city} onChange={handleChange} placeholder="e.g. Bengaluru" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">State / Province</label>
                  <Input name="state" value={formData.state} onChange={handleChange} placeholder="e.g. Karnataka" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Allergies & Medical Alerts (Displayed in Doctor's Patient Summary) */}
          <Card className="rounded-2xl border border-border/60 bg-card/50 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/30">
              <CardTitle className="flex items-center gap-2 text-lg text-rose-500">
                <Heart className="w-5 h-5 text-rose-500" />
                Allergies & Medical Alerts (Doctor&apos;s Clinical View)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Medical Alerts</label>
                  <Input 
                    name="medical_alerts" 
                    value={formData.medical_alerts} 
                    onChange={handleChange} 
                    placeholder="e.g. Diabetic, Pacemaker, Bleeding disorder" 
                  />
                  <p className="text-[11px] text-muted-foreground">Important alerts highlighted in doctor consultations.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Known Allergies</label>
                  <Input 
                    name="allergies" 
                    value={formData.allergies} 
                    onChange={handleChange} 
                    placeholder="e.g. Penicillin, Peanuts, Sulfa drugs" 
                  />
                  <p className="text-[11px] text-muted-foreground">Drug, food, or environmental allergies.</p>
                </div>
                <div className="col-span-full space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Chronic Diseases / Existing Conditions</label>
                  <Input 
                    name="chronic_diseases" 
                    value={formData.chronic_diseases} 
                    onChange={handleChange} 
                    placeholder="e.g. Hypertension, Asthma, Thyroid disorder" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Vitals Summary (Displayed in Doctor's Patient View) */}
          <Card className="rounded-2xl border border-border/60 bg-card/50 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/30">
              <CardTitle className="flex items-center gap-2 text-lg text-emerald-500">
                <Activity className="w-5 h-5 text-emerald-500" />
                Vitals Summary (Doctor&apos;s Clinical View)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Height (cm)</label>
                  <Input 
                    type="number" 
                    name="height_cm" 
                    value={formData.height_cm} 
                    onChange={handleChange} 
                    placeholder="e.g. 175" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Weight (kg)</label>
                  <Input 
                    type="number" 
                    name="weight_kg" 
                    value={formData.weight_kg} 
                    onChange={handleChange} 
                    placeholder="e.g. 70" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Emergency Contact */}
          <Card className="rounded-2xl border border-border/60 bg-card/50 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/30">
              <CardTitle className="flex items-center gap-2 text-lg">
                <PhoneCall className="w-5 h-5 text-amber-500" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Contact Name</label>
                  <Input 
                    name="emergency_contact_name" 
                    value={formData.emergency_contact_name} 
                    onChange={handleChange} 
                    placeholder="e.g. Jane Doe (Spouse)" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Emergency Phone Number</label>
                  <Input 
                    name="emergency_contact_number" 
                    value={formData.emergency_contact_number} 
                    onChange={handleChange} 
                    placeholder="e.g. +91 9876543210" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving} size="lg" className="w-full sm:w-auto">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save All Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
