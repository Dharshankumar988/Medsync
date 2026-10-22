"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Skeleton } from "@medsync/ui";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import { profileService } from "@/services/profile.service";
import { Loader2, Save, Heart, Activity, PhoneCall, UserCheck, Lock, Eye, EyeOff, KeyRound, ShieldAlert, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

function MyHealthContent() {
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Password setup for Google OAuth / general accounts
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const isFromOAuth = searchParams?.get("oauth") === "google" || searchParams?.get("setup") === "true";
  
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
        const isGoogle = data.user.app_metadata?.provider === "google" ||
          (Array.isArray(data.user.app_metadata?.providers) && data.user.app_metadata.providers.includes("google")) ||
          searchParams?.get("oauth") === "google";
        setIsGoogleUser(Boolean(isGoogle));
        setHasPassword(Boolean(data.user.user_metadata?.has_password));
      }
    });
  }, [searchParams]);

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

          if (data.date_of_birth && data.gender && data.blood_group) {
            localStorage.setItem(`medsync_profile_completed_${userId}`, "true");
          }
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

  const handleSetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New Password and Confirm Password do not match.");
      return;
    }
    setIsSettingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: { has_password: true }
      });
      if (error) {
        toast.error(error.message || "Failed to set password");
        return;
      }
      toast.success("Account password set successfully! You can now use this password for PIN setup and secure actions.");
      setPasswordSuccess(true);
      setHasPassword(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update account password");
    } finally {
      setIsSettingPassword(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      // If user filled in password fields as part of full save, update password
      if (newPassword) {
        if (newPassword.length < 6) {
          toast.error("Password must be at least 6 characters.");
          setSaving(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          toast.error("New Password and Confirm Password do not match.");
          setSaving(false);
          return;
        }
        try {
          const { error: pwdErr } = await supabase.auth.updateUser({
            password: newPassword,
            data: { has_password: true }
          });
          if (pwdErr) {
            console.warn("Password update notice during profile save:", pwdErr);
          } else {
            setPasswordSuccess(true);
            setHasPassword(true);
            setNewPassword("");
            setConfirmPassword("");
          }
        } catch (e) {
          console.warn("Password update notice:", e);
        }
      }

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

      if (formData.date_of_birth && formData.gender && formData.blood_group) {
        localStorage.setItem(`medsync_profile_completed_${userId}`, "true");
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

      {/* Google OAuth Onboarding Banner */}
      {(isFromOAuth || (isGoogleUser && !hasPassword)) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-500/15 via-primary/10 to-emerald-500/10 border border-blue-500/30 flex items-start gap-3.5 shadow-sm"
        >
          <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-500 shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-foreground">
                Welcome to MedSync! Complete Your Health Profile
              </h4>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold">
                Setup Required
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Please complete your health credentials and emergency contacts below so your clinical data is accessible to treating physicians.
              <strong> Crucial:</strong> Set your account password below so you can configure your 6-digit Authorization PIN for booking appointments, downloading records, and ordering prescriptions.
            </p>
          </div>
        </motion.div>
      )}

      {/* Account Password Card (Required for PIN setup, reset, and identity confirmation) */}
      <Card className="rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/[0.04] via-card to-card shadow-sm">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              <span>Account Password</span>
              {isGoogleUser && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-normal">
                  Google Account
                </span>
              )}
            </div>
            {(hasPassword || passwordSuccess) && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Password Configured
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {hasPassword
              ? "Your account password protects your health data and is required when creating, resetting, or updating your 6-digit Authorization PIN. You can change it below."
              : "Since you signed up with Google, setting an account password is required to enroll your secure 6-digit Authorization PIN for booking appointments and downloading records."}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Account Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter secure password (min 6 chars)"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Confirm Account Password</label>
              <Input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password to confirm"
              />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSettingPassword || !newPassword || newPassword.length < 6 || newPassword !== confirmPassword}
              onClick={handleSetPassword}
              className="rounded-xl border-primary/30 hover:bg-primary/10 text-xs"
            >
              {isSettingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <KeyRound className="w-3.5 h-3.5 mr-1.5 text-primary" />}
              {hasPassword ? "Update Password" : "Set Account Password"}
            </Button>
          </div>
        </CardContent>
      </Card>

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

export default function MyHealthPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      }
    >
      <MyHealthContent />
    </Suspense>
  );
}
