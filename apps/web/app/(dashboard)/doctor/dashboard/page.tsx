"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Calendar, Activity, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DoctorDashboard() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clinical Overview</h1>
          <p className="text-muted-foreground mt-1">Manage your patients, appointments, and daily schedule.</p>
        </div>
        <Button>View Full Schedule</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground mt-1">4 remaining</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Reports</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">5</div>
            <p className="text-xs text-muted-foreground mt-1">Requires sign-off</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Next Appointment</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">11:30 AM</div>
            <p className="text-xs text-muted-foreground mt-1">Michael Chen - Follow up</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">AI Insights</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">3</div>
            <p className="text-xs text-muted-foreground mt-1">New clinical suggestions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>Your appointments for today.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { time: "09:00 AM", name: "Sarah Williams", type: "Annual Physical", status: "Completed" },
                { time: "10:30 AM", name: "John Doe", type: "Cardiology Consult", status: "Completed" },
                { time: "11:30 AM", name: "Michael Chen", type: "Follow up", status: "In Progress" },
                { time: "01:00 PM", name: "Emily Davis", type: "Lab Review", status: "Upcoming" },
              ].map((apt, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="flex gap-4 items-center">
                    <span className="text-sm font-medium w-20 shrink-0">{apt.time}</span>
                    <div>
                      <p className="font-medium">{apt.name}</p>
                      <p className="text-sm text-muted-foreground">{apt.type}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                    apt.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600' : 
                    apt.status === 'In Progress' ? 'bg-blue-500/10 text-blue-600' : 
                    'bg-muted text-muted-foreground'
                  }`}>
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Patient Alerts</CardTitle>
            <CardDescription>Critical updates from monitored patients.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 rounded-full bg-emerald-500/10 p-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="font-medium">All patients stable</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">
                No abnormal vitals reported in the last 24 hours.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
