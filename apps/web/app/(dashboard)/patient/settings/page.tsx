"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Skeleton } from "@medsync/ui";
import { Settings, Download, Mail, Bell, Smartphone, Shield, LogOut, Loader2, X } from "lucide-react";
import { SecurityService } from "@/services/security.service";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const [userId, setUserId] = useState<string>("");
  const [prefs, setPrefs] = useState({
    email_enabled: true,
    push_enabled: true,
    in_app_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [resetModal, setResetModal] = useState<'pin' | null>(null);

  // Security Reset State
  const [pin, setPin] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    async function loadSettings() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (data) {
          setPrefs({
            email_enabled: data.email_enabled ?? true,
            push_enabled: data.push_enabled ?? true,
            in_app_enabled: data.in_app_enabled ?? true,
          });
        }
      } catch (err) {
        console.error("Error loading settings", err);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [userId]);

  const togglePref = async (key: keyof typeof prefs) => {
    const newValue = !prefs[key];
    setPrefs(prev => ({ ...prev, [key]: newValue }));

    try {
      await supabase
        .from("notification_preferences")
        .update({ [key]: newValue })
        .eq("user_id", userId);
      toast.success("Preferences updated");
    } catch (err) {
      console.error("Error updating preferences", err);
      toast.error("Failed to update preferences");
      setPrefs(prev => ({ ...prev, [key]: !newValue }));
    }
  };

  const handleExportData = async () => {
    if (!userId) return;
    setIsExporting(true);

    try {
      const response = await api.get(`/api/v1/fhir/Patient/${userId}/$export`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/fhir+json' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `medsync-health-data-${userId}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Data export successful");
    } catch (err) {
      console.error("Export error", err);
      toast.error("Failed to export health data. FHIR service may be unavailable.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleResetPin = async () => {
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      setErrorMsg('PIN must be 6 digits.');
      return;
    }
    if (!currentPassword) {
      setErrorMsg('Please enter your current password.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.access_token) {
        const formData = new FormData();
        formData.append('current_password', currentPassword);
        formData.append('new_pin', pin);

        await api.post('/api/v1/security/reset-pin-with-password', formData, {
          headers: { Authorization: `Bearer ${session.session.access_token}` }
        });

        toast.success('PIN reset successfully');
        setResetModal(null);
        setPin('');
        setCurrentPassword('');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to reset PIN');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-10">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences and security.</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" /> Notification Preferences
            </CardTitle>
            <CardDescription>Choose how you want to receive updates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Email Notifications</div>
                <div className="text-sm text-muted-foreground">Receive updates via email</div>
              </div>
              <Button
                variant={prefs.email_enabled ? "default" : "outline"}
                onClick={() => togglePref("email_enabled")}
              >
                {prefs.email_enabled ? "Enabled" : "Disabled"}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Push Notifications</div>
                <div className="text-sm text-muted-foreground">Receive in-app push alerts</div>
              </div>
              <Button
                variant={prefs.push_enabled ? "default" : "outline"}
                onClick={() => togglePref("push_enabled")}
              >
                {prefs.push_enabled ? "Enabled" : "Disabled"}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">In-App Notifications</div>
                <div className="text-sm text-muted-foreground">Show notifications in the app</div>
              </div>
              <Button
                variant={prefs.in_app_enabled ? "default" : "outline"}
                onClick={() => togglePref("in_app_enabled")}
              >
                {prefs.in_app_enabled ? "Enabled" : "Disabled"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" /> Security
            </CardTitle>
            <CardDescription>Manage your authorization PIN.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setResetModal('pin')}
            >
              Reset Authorization PIN
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" /> Data Export
            </CardTitle>
            <CardDescription>Download your health data in FHIR format.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleExportData}
              disabled={isExporting}
              className="w-full"
            >
              {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Export Health Data
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl shadow-xl relative border">
            <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={() => setResetModal(null)}>
              <X className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-bold mb-4">Reset Authorization PIN</h2>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Enter your account password to authorize PIN reset.</p>

              <div className="space-y-2">
                <label className="text-sm font-medium">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-muted/30 border border-border p-3 rounded-xl"
                  placeholder="Enter your account password"
                />
              </div>

              <div className="space-y-2 mt-4">
                <label className="text-sm font-medium">New 6-Digit PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-muted/30 border border-border p-3 rounded-xl text-center tracking-widest text-xl"
                />
              </div>
              {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
              <Button className="w-full" disabled={isSubmitting} onClick={handleResetPin}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Reset PIN"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
