"use client";
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { LineChart as LineChartIcon, BarChart as BarChartIcon, Activity, TrendingUp, Users, Box, Hexagon, Database } from "lucide-react";
import { dashboardService } from "@/services/dashboard.service";
import api from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function AdminAnalytics() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const defaultStats = { 
      users: { total: 1, patients: 0, doctors: 0, pharmacies: 0, pending_verification: 0 }, 
      operations: { appointments: 0, prescriptions: 0, orders: 0 },
      blockchain_activity: { total_tx: 0, avg_gas_used: 0, network_latency_ms: 0, block_time_s: 0 }
    };
    dashboardService.getAdminDashboard().then(data => {
      setStats(data || defaultStats);
    }).catch(err => {
      console.error(err);
      setStats(defaultStats);
    });
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const userStats = stats.users || { total: 1, patients: 0, doctors: 0, pharmacies: 0, pending_verification: 0 };
  const opStats = stats.operations || { appointments: 0, prescriptions: 0, orders: 0 };
  const blockchainStats = stats.blockchain_activity || { total_tx: 0, avg_gas_used: 0, network_latency_ms: 0, block_time_s: 0 };

  const totalUsers = userStats.total || 1;
  const patientPct = Math.round((userStats.patients / totalUsers) * 100);
  const doctorPct = Math.round((userStats.doctors / totalUsers) * 100);
  const pharmacyPct = Math.round((userStats.pharmacies / totalUsers) * 100);

  const operationsData = [
    { name: "Appointments", value: opStats.appointments, fill: "#8b5cf6" },
    { name: "Prescriptions", value: opStats.prescriptions, fill: "#10b981" },
    { name: "Orders", value: opStats.orders, fill: "#3b82f6" }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Analytics</h1>
        <p className="text-muted-foreground mt-2">Historical trends, system health, and aggregated metadata.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><LineChartIcon className="h-5 w-5"/> User Distribution</CardTitle></CardHeader>
          <CardContent className="h-72 flex flex-col justify-center gap-4 text-sm px-8">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Patients</span><span className="font-medium">{userStats.patients} ({patientPct}%)</span>
              </div>
              <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${patientPct}%` }}></div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Doctors</span><span className="font-medium">{userStats.doctors} ({doctorPct}%)</span>
              </div>
              <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${doctorPct}%` }}></div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Pharmacies</span><span className="font-medium">{userStats.pharmacies} ({pharmacyPct}%)</span>
              </div>
              <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pharmacyPct}%` }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChartIcon className="h-5 w-5"/> Operations Volume</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={operationsData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 uppercase tracking-wider text-xs font-semibold"><Users className="w-4 h-4 text-amber-500"/> Verified Professionals</CardDescription>
            <CardTitle className="text-3xl">{userStats.doctors + userStats.pharmacies}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Active in network. {userStats.doctors} Doctors, {userStats.pharmacies} Pharmacies.</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 uppercase tracking-wider text-xs font-semibold"><Hexagon className="w-4 h-4 text-primary"/> Blockchain Telemetry</CardDescription>
            <CardTitle className="text-3xl">Active (Polygon Amoy)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">6 Smart Contracts Deployed. Consistently logging state changes and securing medical records.</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-emerald-500"/> Distributed Ledger Activity</CardTitle>
            <CardDescription>Aggregate metadata of on-chain operations synced with MedSync&apos;s central Postgres database.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total On-Chain Tx</p>
                <p className="text-2xl font-mono mt-1 font-bold">{blockchainStats.total_tx.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Average Gas Used</p>
                <p className="text-2xl font-mono mt-1 font-bold">~{blockchainStats.avg_gas_used.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Network Latency</p>
                <p className="text-2xl font-mono mt-1 font-bold">{blockchainStats.network_latency_ms}ms</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Block Time</p>
                <p className="text-2xl font-mono mt-1 font-bold">{blockchainStats.block_time_s}s</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

