"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { LineChart, BarChart } from "lucide-react";
import { dashboardService } from "@/services/dashboard.service";

export default function AdminAnalytics() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof dashboardService.getAdminDashboard>>>(null);

  useEffect(() => {
    dashboardService.getAdminDashboard().then(data => {
      setStats(data);
    });
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const userStats = stats.users;
  const opStats = stats.operations;

  // Calculate percentages for the user distribution bar
  const totalUsers = userStats.total || 1;
  const patientPct = Math.round((userStats.patients / totalUsers) * 100);
  const doctorPct = Math.round((userStats.doctors / totalUsers) * 100);
  const pharmacyPct = Math.round((userStats.pharmacies / totalUsers) * 100);

  // For operations, find max to scale bars
  const maxOp = Math.max(opStats.appointments, opStats.prescriptions, opStats.orders, 1);
  const apptHeight = Math.round((opStats.appointments / maxOp) * 100);
  const prescHeight = Math.round((opStats.prescriptions / maxOp) * 100);
  const orderHeight = Math.round((opStats.orders / maxOp) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Analytics</h1>
        <p className="text-muted-foreground mt-2">Historical trends and aggregated metadata.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Growth (Mocked as Distribution since we don't have time series) */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><LineChart className="h-5 w-5"/> User Distribution</CardTitle></CardHeader>
          <CardContent className="h-64 flex flex-col justify-center gap-4 text-sm px-8">
            
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Patients</span><span>{userStats.patients} ({patientPct}%)</span>
              </div>
              <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${patientPct}%` }}></div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Doctors</span><span>{userStats.doctors} ({doctorPct}%)</span>
              </div>
              <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${doctorPct}%` }}></div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Pharmacies</span><span>{userStats.pharmacies} ({pharmacyPct}%)</span>
              </div>
              <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pharmacyPct}%` }}></div>
              </div>
            </div>
            
          </CardContent>
        </Card>
        
        {/* Operations Volume */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart className="h-5 w-5"/> Operations Volume</CardTitle></CardHeader>
          <CardContent className="h-64 flex items-end justify-around pb-6 pt-10 border-t border-border/50">
            
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-semibold">{opStats.appointments}</span>
              <div className="w-16 bg-violet-500 rounded-t-lg transition-all" style={{ height: `${Math.max(apptHeight, 10)}%` }}></div>
              <span className="text-xs text-muted-foreground">Appts</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-semibold">{opStats.prescriptions}</span>
              <div className="w-16 bg-emerald-500 rounded-t-lg transition-all" style={{ height: `${Math.max(prescHeight, 10)}%` }}></div>
              <span className="text-xs text-muted-foreground">Prescriptions</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-semibold">{opStats.orders}</span>
              <div className="w-16 bg-blue-500 rounded-t-lg transition-all" style={{ height: `${Math.max(orderHeight, 10)}%` }}></div>
              <span className="text-xs text-muted-foreground">Orders</span>
            </div>
            
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
