"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input } from "@medsync/ui";
import { Shield, Bell, Key, LogOut, Loader2, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import { toast } from "sonner";
import axios from "axios";

export default function DoctorSettingsPage() {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isEnrollingPin, setIsEnrollingPin] = useState(false);
  const [pinStatus, setPinStatus] = useState<string>("NOT_STARTED");

  useEffect(() => {
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
    if (pin.length !== 6 || pin !== confirmPin) {
      toast.error("PINs must be exactly 6 digits and match.");
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
      formData.append('pin', pin);

      await axios.post(`${apiUrl}/security/enroll-pin`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(pinStatus === "NOT_STARTED" ? "PIN enrolled successfully!" : "PIN updated successfully!");
      setPin("");
      setConfirmPin("");
      fetchPinStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to enroll PIN");
    } finally {
      setIsEnrollingPin(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your security and notification preferences.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /> Authorization PIN</CardTitle>
            <CardDescription>
              {pinStatus !== "NOT_STARTED" 
                ? "You have an active Authorization PIN. You can update it below." 
                : "Create a 6-digit PIN used to sign and finalize prescriptions."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Confirm New PIN</label>
              <Input 
                type="password" 
                maxLength={6} 
                className="tracking-widest font-mono text-center text-lg" 
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <Button onClick={handleEnrollPin} disabled={isEnrollingPin || pin.length !== 6 || pin !== confirmPin} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              {isEnrollingPin && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {pinStatus !== "NOT_STARTED" ? "Update PIN" : "Enroll PIN"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Key className="w-4 h-4" /> Change Password</CardTitle>
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

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="w-4 h-4" /> Notification Preferences</CardTitle>
            <CardDescription>Choose what alerts you receive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-0.5">
                <p className="font-medium text-sm">Appointment Requests</p>
                <p className="text-xs text-muted-foreground">Receive email for new bookings</p>
              </div>
              <input type="checkbox" className="w-4 h-4" defaultChecked />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-0.5">
                <p className="font-medium text-sm">Patient Messages</p>
                <p className="text-xs text-muted-foreground">Get notified for new messages</p>
              </div>
              <input type="checkbox" className="w-4 h-4" defaultChecked />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-0.5">
                <p className="font-medium text-sm">AI Analysis Alerts</p>
                <p className="text-xs text-muted-foreground">When high-confidence anomalies are detected</p>
              </div>
              <input type="checkbox" className="w-4 h-4" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive"><Shield className="w-4 h-4" /> Active Sessions</CardTitle>
            <CardDescription>Manage your active logins across devices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="font-medium text-sm">Current Session</p>
                <p className="text-xs text-muted-foreground">Windows • Chrome • IP: 192.168.1.1</p>
              </div>
              <Button variant="outline" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <LogOut className="w-4 h-4 mr-2" /> Sign Out All Other Devices
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
