"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function DoctorDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Doctor Overview</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Today's Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No appointments scheduled for today.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Patient Analyses (AI)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No recent MRI/CT scans processed.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
