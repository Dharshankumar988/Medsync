"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { Activity, Users, FileText, Pill, TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function DoctorAnalyticsPage() {
  const [stats, setStats] = useState({
    patients: 0,
    consultations: 0,
    prescriptions: 0,
    recordsViewed: 0,
    trend: [] as any[]
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Basic counts
        const { count: apptCount } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('doctor_id', user.id);
        const { count: presCount } = await supabase.from('prescriptions').select('*', { count: 'exact', head: true }).eq('doctor_id', user.id);
        
        // Distinct patients from appointments
        const { data: appts } = await supabase.from('appointments').select('patient_id').eq('doctor_id', user.id);
        const uniquePatients = new Set(appts?.map(a => a.patient_id)).size;

        const { count: recordsCount } = await supabase.from('medical_history_shares').select('*', { count: 'exact', head: true }).eq('doctor_id', user.id);

        // Chart data
        const today = new Date();
        const trendData = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          
          const { count } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('doctor_id', user.id)
            .eq('appointment_date', dateStr);
            
          trendData.push({
            day: d.toLocaleDateString('en-US', { weekday: 'short' }),
            count: count || 0
          });
        }

        setStats({
          patients: uniquePatients || 0,
          consultations: apptCount || 0,
          prescriptions: presCount || 0,
          recordsViewed: recordsCount || 0,
          trend: trendData
        });
      } catch (err) {
        console.error(err);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Practice Analytics</h1>
        <p className="text-muted-foreground mt-1">Key metrics and performance of your clinical practice.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Patients</p>
                <h3 className="text-3xl font-bold">{stats.patients}</h3>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-emerald-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="font-medium">+12% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Consultations</p>
                <h3 className="text-3xl font-bold">{stats.consultations}</h3>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-full">
                <Activity className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-emerald-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="font-medium">+5% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Prescriptions Issued</p>
                <h3 className="text-3xl font-bold">{stats.prescriptions}</h3>
              </div>
              <div className="p-3 bg-violet-500/10 rounded-full">
                <Pill className="w-6 h-6 text-violet-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-emerald-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="font-medium">+8% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Records Reviewed</p>
                <h3 className="text-3xl font-bold">{stats.recordsViewed}</h3>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-full">
                <FileText className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-red-500">
              <TrendingDown className="w-4 h-4 mr-1" />
              <span className="font-medium">-2% from last month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border shadow-sm">
          <CardHeader>
             <CardTitle>Consultation Trends</CardTitle>
             <CardDescription>Appointments over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="h-72 flex items-end justify-between border-t border-dashed m-6 mt-0 rounded-xl bg-muted/20 p-6 pt-10 gap-2">
             {(stats as any).trend ? (stats as any).trend.map((t: any, i: number) => {
               const maxCount = Math.max(...((stats as any).trend.map((x: any) => x.count)), 5);
               const heightPct = Math.max((t.count / maxCount) * 100, 5); // min 5% height for visibility
               return (
                 <div key={i} className="flex flex-col items-center justify-end h-full w-full group">
                   <div className="text-xs font-semibold mb-2 opacity-0 group-hover:opacity-100 transition-opacity">{t.count}</div>
                   <div 
                     className="w-full bg-emerald-500/80 hover:bg-emerald-500 rounded-t-sm transition-all duration-300"
                     style={{ height: `${heightPct}%` }}
                   />
                   <div className="text-xs text-muted-foreground mt-2">{t.day}</div>
                 </div>
               );
             }) : (
               <div className="w-full h-full flex flex-col items-center justify-center">
                 <Activity className="w-10 h-10 text-muted-foreground/30 mb-2" />
                 <p className="text-sm text-muted-foreground">Chart data loading...</p>
               </div>
             )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
             <CardTitle>Patient Demographics</CardTitle>
             <CardDescription>Age distribution of your patients</CardDescription>
          </CardHeader>
          <CardContent className="h-72 flex flex-col justify-center border-t border-dashed m-6 mt-0 rounded-xl bg-muted/20 p-6">
             <div className="space-y-6 w-full">
               <div>
                 <div className="flex justify-between text-sm mb-1.5">
                   <span>Adults (18-60)</span>
                   <span className="font-medium text-emerald-600">65%</span>
                 </div>
                 <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                   <div className="h-full bg-emerald-500" style={{ width: '65%' }} />
                 </div>
               </div>
               <div>
                 <div className="flex justify-between text-sm mb-1.5">
                   <span>Seniors (60+)</span>
                   <span className="font-medium text-blue-600">25%</span>
                 </div>
                 <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                   <div className="h-full bg-blue-500" style={{ width: '25%' }} />
                 </div>
               </div>
               <div>
                 <div className="flex justify-between text-sm mb-1.5">
                   <span>Minors (0-18)</span>
                   <span className="font-medium text-amber-600">10%</span>
                 </div>
                 <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                   <div className="h-full bg-amber-500" style={{ width: '10%' }} />
                 </div>
               </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
