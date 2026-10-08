"use client";

import { useEffect, useState } from "react";
import { pharmacyService } from "@/services/pharmacy.service";
import { Card, CardHeader, CardTitle, CardContent, Button, Input, CardDescription } from "@medsync/ui";
import { Building2, MapPin, Clock, Phone, FileText, Lock, Loader2, Key } from "lucide-react";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import { toast } from "sonner";
import axios from "axios";

export default function PharmacySettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Security State
  const [pin, setPin] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [isEnrollingPin, setIsEnrollingPin] = useState(false);
  const [pinStatus, setPinStatus] = useState<string>("NOT_STARTED");

  useEffect(() => {
    pharmacyService.getProfile().then(data => {
      setProfile(data);
      setLoading(false);
    });
    fetchPinStatus();
  }, []);

  const fetchPinStatus = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) return;

      const baseUrl = process.env.NEXT_PUBLIC_API_URL as string;
      const apiUrl = baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`;
      
      const res = await axios.get(`${apiUrl}/security/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPinStatus(res.data.status);
    } catch (err) {
      console.error("Failed to fetch PIN status", err);
    }
  };

  const handleEnrollPin = async () => {
    if (pin.length !== 6) {
      toast.error("PIN must be exactly 6 digits.");
      return;
    }
    
    if (!currentPassword) {
      toast.error("Please enter your current account password to update your PIN.");
      return;
    }
    
    setIsEnrollingPin(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const baseUrl = process.env.NEXT_PUBLIC_API_URL as string;
      const apiUrl = baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`;
      
      const formData = new FormData();
      formData.append('new_pin', pin);
      formData.append('current_password', currentPassword);

      await axios.post(`${apiUrl}/security/reset-pin-with-password`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(pinStatus === "NOT_STARTED" ? "PIN enrolled successfully!" : "PIN updated successfully!");
      setPin("");
      setCurrentPassword("");
      fetchPinStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update PIN");
    } finally {
      setIsEnrollingPin(false);
    }
  };



  if (loading) {
    return <div className="p-8 flex items-center justify-center h-[50vh]"><div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" /></div>;
  }

  if (!profile) {
    return (
      <div className="space-y-8 pb-12">
        <h1 className="text-3xl font-bold tracking-tight">Pharmacy Profile</h1>
        <Card className="p-8 text-center text-muted-foreground border-dashed bg-transparent shadow-none border-2">
          Profile data is currently unavailable. Complete your onboarding to set up a profile.
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Profile & Settings</h1>
        <p className="text-muted-foreground">Manage your pharmacy&apos;s public information, licensing, and operational settings.</p>
      </div>

      <div className="grid gap-6">
        <Card className="rounded-2xl border-border/60">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-500" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Business Name</label>
                <Input defaultValue={profile.business_name} readOnly className="bg-muted/30" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">License Number</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input defaultValue={profile.license_number} readOnly className="pl-9 bg-muted/30 font-mono" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">GST Number</label>
                <Input defaultValue={profile.gst_number || "Not provided"} readOnly className="bg-muted/30 font-mono" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Contact Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input defaultValue={profile.contact_number || "Not provided"} readOnly className="pl-9 bg-muted/30" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-amber-500" />
              Location & Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Registered Address</label>
              <Input defaultValue={profile.address || "Not provided"} readOnly className="bg-muted/30" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Operating Hours</label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input defaultValue={profile.operating_hours || "09:00 AM - 09:00 PM"} readOnly className="pl-9 bg-muted/30" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lock className="w-4 h-4 text-amber-500" /> Authorization PIN</CardTitle>
            <CardDescription>
              {pinStatus !== "NOT_STARTED" 
                ? "You have an active Authorization PIN. You can update it below." 
                : "Create a 6-digit PIN used to authorize dispensing and restock orders."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Current Account Password</label>
              <Input 
                type="password" 
                className="text-lg" 
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Required for authorization"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">New 6-Digit PIN</label>
              <Input 
                type="password" 
                maxLength={6} 
                className="tracking-widest font-mono text-center text-lg" 
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            </div>
            <Button onClick={handleEnrollPin} disabled={isEnrollingPin || pin.length !== 6} className="w-full bg-amber-600 hover:bg-amber-700 text-white">
              {isEnrollingPin && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {pinStatus !== "NOT_STARTED" ? "Update PIN" : "Enroll PIN"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Key className="w-4 h-4 text-amber-500" /> Change Password</CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Current Password</label>
              <Input type="password" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">New Password</label>
              <Input type="password" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Confirm New Password</label>
              <Input type="password" />
            </div>
            <Button variant="outline" className="w-full">Update Password</Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 md:col-span-2">
          <Button variant="outline" className="rounded-xl border-amber-500/30 text-amber-600 hover:bg-amber-500/10 cursor-not-allowed opacity-50">
            Request Profile Update
          </Button>
          <p className="text-xs text-muted-foreground self-center">Profile updates require administrator approval.</p>
        </div>
      </div>
    </div>
  );
}
