"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Skeleton } from "@medsync/ui";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import { profileService } from "@/services/profile.service";
import { Loader2, Save } from "lucide-react";
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
    address: ""
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
          
        if (data) {
          setFormData({
            full_name: data.full_name || "",
            date_of_birth: data.date_of_birth || "",
            gender: data.gender || "",
            blood_group: data.blood_group || "",
            phone_number: data.phone_number || "",
            address: data.address || ""
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await profileService.updateProfileCompletion(userId, {
        profile_completion_percentage: 100,
        ...formData
      });
      toast.success("Health profile updated successfully");
    } catch (err) {
      console.error("Error saving profile", err);
      toast.error("Failed to update health profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative space-y-8 pb-12 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm font-medium tracking-widest uppercase text-blue-500 mb-2">My Health</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
          Health Profile
        </h1>
        <p className="text-muted-foreground mt-2 max-w-md leading-relaxed">
          Manage your personal and medical information.
        </p>
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
          <Card className="rounded-2xl border border-border/60 bg-card/50">
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input name="full_name" value={formData.full_name} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date of Birth</label>
                  <Input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Gender</label>
                  <Input name="gender" value={formData.gender} onChange={handleChange} placeholder="e.g. Male, Female, Other" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Blood Group</label>
                  <Input name="blood_group" value={formData.blood_group} onChange={handleChange} placeholder="e.g. O+" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input name="phone_number" value={formData.phone_number} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Address</label>
                  <Input name="address" value={formData.address} onChange={handleChange} />
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border/60 bg-card/50">
            <CardHeader>
              <CardTitle>Authorization PIN</CardTitle>
              <p className="text-sm text-muted-foreground">Set a 6-digit PIN to authorize prescription claims at the pharmacy.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">New 6-Digit PIN</label>
                  <Input type="password" maxLength={6} placeholder="******" id="new_pin" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm PIN</label>
                  <Input type="password" maxLength={6} placeholder="******" id="confirm_pin" />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={async () => {
                  const newPin = (document.getElementById('new_pin') as HTMLInputElement).value;
                  const confirmPin = (document.getElementById('confirm_pin') as HTMLInputElement).value;
                  if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
                    toast.error("PIN must be exactly 6 digits.");
                    return;
                  }
                  if (newPin !== confirmPin) {
                    toast.error("PINs do not match.");
                    return;
                  }
                  try {
                    setSaving(true);
                    await api.post(`/api/v1/profile/${userId}/pin`, { pin: newPin });
                    toast.success("Authorization PIN updated successfully");
                    (document.getElementById('new_pin') as HTMLInputElement).value = "";
                    (document.getElementById('confirm_pin') as HTMLInputElement).value = "";
                  } catch (err) {
                    console.error("Error setting PIN", err);
                    toast.error("Failed to update Authorization PIN");
                  } finally {
                    setSaving(false);
                  }
                }} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Update PIN
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
