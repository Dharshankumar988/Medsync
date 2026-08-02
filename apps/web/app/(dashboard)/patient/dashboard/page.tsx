"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { Skeleton } from "@medsync/ui";
import { Activity, Clock, FileText, CheckCircle2 } from "lucide-react";
import { AuditHistory } from "@medsync/ui";
import { ProfileCompletionBanner } from "@/components/profile-wizard/ProfileCompletionBanner";
import { supabase } from "@/lib/supabase";

export default function PatientDashboard() {
  const [isMounted, setIsMounted] = useState(false);

  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    setIsMounted(true);
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  if (!isMounted) return null;

  return (
    <div className="space-y-6">
      {userId && <ProfileCompletionBanner userId={userId} role="patient" initialPercentage={20} />}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Patient Overview</h1>
        <p className="text-muted-foreground mt-1">Review your health summary and upcoming appointments.</p>
      </div>

      {!userId ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-[120px] w-full rounded-xl" />
          <Skeleton className="h-[120px] w-full rounded-xl" />
          <Skeleton className="h-[120px] w-full rounded-xl" />
          <Skeleton className="h-[120px] w-full rounded-xl" />
        </div>
      ) : (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Next Appointment</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Oct 24, 10:00 AM</div>
            <p className="text-xs text-muted-foreground mt-1">Dr. Sarah Smith (Cardiology)</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent Test Results</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Available</div>
            <p className="text-xs text-muted-foreground mt-1">Blood Panel - Oct 12</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Prescriptions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2 Medications</div>
            <p className="text-xs text-muted-foreground mt-1">Ready for refill in 5 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Health Status</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Stable</div>
            <p className="text-xs text-muted-foreground mt-1">Last checkup: 2 weeks ago</p>
          </CardContent>
        </Card>
      </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <AuditHistory />

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Upcoming Tasks</CardTitle>
            <CardDescription>Action items requiring your attention.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 rounded-full bg-muted p-3">
                <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium">All caught up!</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">
                You have no pending tasks or forms to complete.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
