"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input } from "@medsync/ui";
import { Shield, Bell, Key, LogOut, Loader2, Lock, CalendarCheck, CalendarX, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import { toast } from "sonner";
import axios from "axios";
import { getApiUrl } from "@/lib/backend-config";

export default function DoctorSettingsPage() {
  const [pin, setPin] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [isEnrollingPin, setIsEnrollingPin] = useState(false);
  const [pinStatus, setPinStatus] = useState<string>("NOT_STARTED");
  const [isAcceptingAppointments, setIsAcceptingAppointments] = useState<boolean>(true);
  const [isTogglingAppointments, setIsTogglingAppointments] = useState<boolean>(false);

  useEffect(() => {
    fetchPinStatus();
    fetchAppointmentSetting();
  }, []);

  const fetchAppointmentSetting = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const user = session?.session?.user;
      if (!token || !user) return;
      const apiUrl = getApiUrl();
      const res = await axios.get(`${apiUrl}/profile/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.data?.is_accepting_appointments !== undefined) {
        setIsAcceptingAppointments(res.data.data.is_accepting_appointments);
      }
    } catch (err) {
      console.error("Failed to fetch appointment settings", err);
    }
  };

  const handleToggleAppointments = async () => {
    setIsTogglingAppointments(true);
    const nextVal = !isAcceptingAppointments;
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Not authenticated");
      const apiUrl = getApiUrl();
      await axios.patch(`${apiUrl}/profile/doctor/accept-appointments`, 
        { is_accepting_appointments: nextVal },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsAcceptingAppointments(nextVal);
      toast.success(nextVal ? "You are now accepting appointments" : "Appointments paused successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update appointment setting");
    } finally {
      setIsTogglingAppointments(false);
    }
  };

  const fetchPinStatus = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) return;

      const apiUrl = getApiUrl();
      
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

      const apiUrl = getApiUrl();
      
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
        <Card className="md:col-span-2 border-primary/20 bg-gradient-to-r from-primary/[0.03] to-transparent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-bold">
                {isAcceptingAppointments ? (
                  <CalendarCheck className="w-5 h-5 text-emerald-500" />
                ) : (
                  <CalendarX className="w-5 h-5 text-amber-500" />
                )}
                Receive Appointments
              </CardTitle>
              <CardDescription className="mt-1">
                Controls whether patients can book consultations with you. When turned off, your booking availability is paused.
              </CardDescription>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
              isAcceptingAppointments 
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" 
                : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
            }`}>
              <span className={`w-2 h-2 rounded-full ${isAcceptingAppointments ? "bg-emerald-500" : "bg-amber-500"}`} />
              {isAcceptingAppointments ? "Accepting Bookings" : "Bookings Paused"}
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-border/60">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">
                  {isAcceptingAppointments 
                    ? "Currently accepting appointment requests" 
                    : "Currently not accepting new appointment requests"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isAcceptingAppointments 
                    ? "Patients can view available time slots and book appointments." 
                    : "Patients cannot book appointments with you until you resume."}
                </p>
              </div>
              <Button 
                variant={isAcceptingAppointments ? "outline" : "default"}
                onClick={handleToggleAppointments}
                disabled={isTogglingAppointments}
                className={isAcceptingAppointments ? "border-amber-500/30 text-amber-600 hover:bg-amber-500/10" : "bg-emerald-600 hover:bg-emerald-700 text-white"}
              >
                {isTogglingAppointments && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isAcceptingAppointments ? "Pause Bookings" : "Resume Bookings"}
              </Button>
            </div>
          </CardContent>
        </Card>

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
            <Button onClick={handleEnrollPin} disabled={isEnrollingPin || pin.length !== 6} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
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
