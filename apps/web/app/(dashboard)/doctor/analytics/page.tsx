"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { Activity, Users, FileText, Pill, DollarSign } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function DoctorAnalyticsPage() {
  const [stats, setStats] = useState({
    patients: 0,
    consultations: 0,
    prescriptions: 0,
    recordsViewed: 0,
    revenue: 0,
    consultationFee: 500,
    demographics: {
      adults: 0,
      seniors: 0,
      minors: 0,
      hasData: false
    },
    trend: [] as any[]
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch doctor fee
        const { data: docData } = await supabase
          .from('doctors')
          .select('consultation_fee')
          .eq('user_id', user.id)
          .maybeSingle();

        const fee = docData?.consultation_fee && docData.consultation_fee > 0 ? docData.consultation_fee : 500;

        // Basic counts
        const { count: apptCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('doctor_id', user.id);

        const { count: presCount } = await supabase
          .from('prescriptions')
          .select('*', { count: 'exact', head: true })
          .eq('doctor_id', user.id);
        
        // Distinct patients from appointments
        const { data: appts } = await supabase
          .from('appointments')
          .select('patient_id')
          .eq('doctor_id', user.id);

        const uniquePatientIds = Array.from(new Set(appts?.map(a => a.patient_id).filter(Boolean)));
        const uniquePatientsCount = uniquePatientIds.length;

        const { count: recordsCount } = await supabase
          .from('medical_records')
          .select('*', { count: 'exact', head: true })
          .eq('is_archived', false);

        // Calculate Demographics from registered patient DOBs
        let adults = 0;
        let seniors = 0;
        let minors = 0;
        let totalWithDob = 0;

        if (uniquePatientIds.length > 0) {
          const { data: patientsData } = await supabase
            .from('patients')
            .select('date_of_birth')
            .in('user_id', uniquePatientIds);

          const now = new Date();
          patientsData?.forEach(p => {
            if (p.date_of_birth) {
              const dob = new Date(p.date_of_birth);
              let age = now.getFullYear() - dob.getFullYear();
              const m = now.getMonth() - dob.getMonth();
              if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
                age--;
              }
              totalWithDob++;
              if (age < 18) minors++;
              else if (age >= 60) seniors++;
              else adults++;
            }
          });
        }

        const adultsPct = totalWithDob > 0 ? Math.round((adults / totalWithDob) * 100) : 0;
        const seniorsPct = totalWithDob > 0 ? Math.round((seniors / totalWithDob) * 100) : 0;
        const minorsPct = totalWithDob > 0 ? Math.max(0, 100 - adultsPct - seniorsPct) : 0;

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

        const calculatedRevenue = (apptCount || 0) * fee;

        setStats({
          patients: uniquePatientsCount || 0,
          consultations: apptCount || 0,
          prescriptions: presCount || 0,
          recordsViewed: recordsCount || 0,
          revenue: calculatedRevenue,
          consultationFee: fee,
          demographics: {
            adults: adultsPct,
            seniors: seniorsPct,
            minors: minorsPct,
            hasData: totalWithDob > 0
          },
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
        <p className="text-muted-foreground mt-1">Key metrics and calculated performance of your clinical practice.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Patients */}
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
            <div className="mt-4 flex items-center text-xs text-muted-foreground">
              <span>Unique registered individuals</span>
            </div>
          </CardContent>
        </Card>

        {/* Consultations */}
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
            <div className="mt-4 flex items-center text-xs text-muted-foreground">
              <span>Completed & scheduled sessions</span>
            </div>
          </CardContent>
        </Card>

        {/* Prescriptions */}
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
            <div className="mt-4 flex items-center text-xs text-muted-foreground">
              <span>Verified digital prescriptions</span>
            </div>
          </CardContent>
        </Card>

        {/* Calculated Revenue based on Patients/Consultations */}
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Practice Revenue</p>
                <h3 className="text-3xl font-bold text-emerald-600">₹{stats.revenue.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-full">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-muted-foreground">
              <span>Calculated: {stats.consultations} consultations × ₹{stats.consultationFee}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Consultation Trends */}
        <Card className="border shadow-sm">
          <CardHeader>
             <CardTitle>Consultation Trends</CardTitle>
             <CardDescription>Appointments over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="h-72 flex items-end justify-between border-t border-dashed m-6 mt-0 rounded-xl bg-muted/20 p-6 pt-10 gap-2">
             {stats.trend && stats.trend.length > 0 ? stats.trend.map((t: any, i: number) => {
               const maxCount = Math.max(...(stats.trend.map((x: any) => x.count)), 5);
               const heightPct = Math.max((t.count / maxCount) * 100, 6);
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

        {/* Real Patient Demographics */}
        <Card className="border shadow-sm">
          <CardHeader>
             <CardTitle>Patient Demographics</CardTitle>
             <CardDescription>
               {stats.demographics.hasData 
                 ? "Age distribution computed from registered patient records"
                 : `Based on your ${stats.patients} active patient(s)`}
             </CardDescription>
          </CardHeader>
          <CardContent className="h-72 flex flex-col justify-center border-t border-dashed m-6 mt-0 rounded-xl bg-muted/20 p-6">
             <div className="space-y-6 w-full">
               <div>
                 <div className="flex justify-between text-sm mb-1.5">
                   <span>Adults (18-60)</span>
                   <span className="font-medium text-emerald-600">{stats.demographics.adults}%</span>
                 </div>
                 <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                   <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${stats.demographics.adults}%` }} />
                 </div>
               </div>
               <div>
                 <div className="flex justify-between text-sm mb-1.5">
                   <span>Seniors (60+)</span>
                   <span className="font-medium text-blue-600">{stats.demographics.seniors}%</span>
                 </div>
                 <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                   <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${stats.demographics.seniors}%` }} />
                 </div>
               </div>
               <div>
                 <div className="flex justify-between text-sm mb-1.5">
                   <span>Minors (0-18)</span>
                   <span className="font-medium text-amber-600">{stats.demographics.minors}%</span>
                 </div>
                 <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                   <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${stats.demographics.minors}%` }} />
                 </div>
               </div>
               {!stats.demographics.hasData && stats.patients > 0 && (
                 <p className="text-[11px] text-muted-foreground text-center pt-1">
                   Patient date of birth will automatically populate specific age tiers once entered.
                 </p>
               )}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
