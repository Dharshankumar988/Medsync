"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input } from "@medsync/ui";
import { Shield, Bell, Key, LogOut } from "lucide-react";

export default function DoctorSettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your security and notification preferences.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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
            <Button>Update Password</Button>
          </CardContent>
        </Card>

        <Card>
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
