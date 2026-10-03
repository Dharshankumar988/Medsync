"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { Button } from "@medsync/ui";
import { Settings, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function AdminSettings() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [strictVerification, setStrictVerification] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/admin/settings');
      if (res.data?.data) {
        setMaintenanceMode(res.data.data.maintenance_mode);
        setStrictVerification(res.data.data.strict_verification);
      }
    } catch (err) {
      console.error("Failed to load settings", err);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (updates: any) => {
    try {
      setSaving(true);
      const payload = {
        maintenance_mode: maintenanceMode,
        strict_verification: strictVerification,
        ...updates
      };
      
      await api.post('/api/v1/admin/settings', payload);
      
      if (updates.maintenance_mode !== undefined) setMaintenanceMode(updates.maintenance_mode);
      if (updates.strict_verification !== undefined) setStrictVerification(updates.strict_verification);
      
      toast.success("Settings updated successfully");
    } catch (err) {
      console.error("Failed to update settings", err);
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-8 w-8 text-primary" />
          Admin Settings
        </h1>
        <p className="text-muted-foreground mt-2">Configure system-wide control plane preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Configuration</CardTitle>
          <CardDescription>Manage global environment feature flags.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center p-4 border rounded-xl hover:bg-muted/10 transition-colors">
            <div>
              <p className="font-medium">Maintenance Mode</p>
              <p className="text-sm text-muted-foreground">Disable non-admin access to the platform</p>
            </div>
            <Button 
              variant={maintenanceMode ? "default" : "outline"}
              className={maintenanceMode ? "bg-red-600 hover:bg-red-700 text-white" : ""}
              disabled={saving}
              onClick={() => saveSettings({ maintenance_mode: !maintenanceMode })}
            >
              {maintenanceMode ? "Active" : "Enable"}
            </Button>
          </div>
          <div className="flex justify-between items-center p-4 border rounded-xl hover:bg-muted/10 transition-colors">
            <div>
              <p className="font-medium">Strict Verification</p>
              <p className="text-sm text-muted-foreground">Require manual approval for all new healthcare professionals</p>
            </div>
            <Button 
              variant={strictVerification ? "default" : "outline"}
              className={strictVerification ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
              disabled={saving}
              onClick={() => saveSettings({ strict_verification: !strictVerification })}
            >
              {strictVerification ? "Enabled" : "Disabled"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
