"use client";

import { useEffect, useState } from "react";
import { pharmacyService } from "@/services/pharmacy.service";
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from "@medsync/ui";
import { Building2, MapPin, Clock, Phone, FileText } from "lucide-react";

export default function PharmacySettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pharmacyService.getProfile().then(data => {
      setProfile(data);
      setLoading(false);
    });
  }, []);

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

        <div className="flex justify-end gap-4">
          <Button variant="outline" className="rounded-xl border-amber-500/30 text-amber-600 hover:bg-amber-500/10 cursor-not-allowed opacity-50">
            Request Profile Update
          </Button>
          <p className="text-xs text-muted-foreground self-center">Profile updates require administrator approval.</p>
        </div>
      </div>
    </div>
  );
}
