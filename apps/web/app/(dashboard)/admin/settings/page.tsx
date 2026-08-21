"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { Button } from "@medsync/ui";
import { Settings } from "lucide-react";

export default function AdminSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Settings</h1>
        <p className="text-muted-foreground mt-2">Configure system-wide control plane preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Configuration</CardTitle>
          <CardDescription>Manage global environment feature flags.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center p-4 border rounded-xl">
            <div>
              <p className="font-medium">Maintenance Mode</p>
              <p className="text-sm text-muted-foreground">Disable non-admin access to the platform</p>
            </div>
            <Button variant="outline">Enable</Button>
          </div>
          <div className="flex justify-between items-center p-4 border rounded-xl">
            <div>
              <p className="font-medium">Strict Verification</p>
              <p className="text-sm text-muted-foreground">Require manual approval for all new healthcare professionals</p>
            </div>
            <Button className="bg-emerald-600 text-white">Enabled</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
