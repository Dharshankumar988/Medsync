"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Skeleton } from "@medsync/ui";
import { appointmentService } from "@/services/appointment.service";
import { supabase } from "@/lib/supabase";

export function AppointmentHeatmap() {
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<number[][]>([
    [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]
  ]);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = ["9AM", "11AM", "1PM", "3PM", "5PM"];
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    
    async function fetchHeatmap() {
      try {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Monday
        
        const dateFrom = startOfWeek.toISOString().split("T")[0];
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
        const dateTo = endOfWeek.toISOString().split("T")[0];

        const res = await appointmentService.getAppointments({ limit: 100 });
        if (res?.items) {
          // Initialize empty 7x5 matrix
          const heatmap = Array(7).fill(0).map(() => Array(5).fill(0));
          
          res.items.forEach((appt: any) => {
            const date = new Date(appt.appointment_date);
            // 0 is Sunday, we want 0 to be Monday, so shift by 1
            const dayIndex = (date.getDay() + 6) % 7;
            
            // Map time to slots: 9AM=0, 11AM=1, 1PM=2, 3PM=3, 5PM=4
            const hour = parseInt(appt.start_time.split(":")[0]);
            let timeIndex = 0;
            if (hour >= 17) timeIndex = 4;
            else if (hour >= 15) timeIndex = 3;
            else if (hour >= 13) timeIndex = 2;
            else if (hour >= 11) timeIndex = 1;
            
            heatmap[dayIndex][timeIndex] += 1;
          });
          
          setData(heatmap);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchHeatmap();
  }, [userId]);

  const getColor = (intensity: number) => {
    switch(intensity) {
      case 3: return "bg-primary shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]";
      case 2: return "bg-primary/70";
      case 1: return "bg-primary/30";
      default: return "bg-muted/40 dark:bg-muted/20";
    }
  };

  return (
    <Card className="col-span-full xl:col-span-3 rounded-2xl border border-border/60 bg-card/50 h-full flex flex-col">
      <CardHeader className="border-b border-border/40 pb-4">
        <CardTitle>Appointment Heatmap</CardTitle>
        <CardDescription>Busiest consultation periods this week</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center p-6">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center pl-12 text-xs font-medium text-muted-foreground pb-1">
            {hours.map(h => <span key={h}>{h}</span>)}
          </div>
          {loading ? (
             <div className="space-y-4 pt-4">
               {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
             </div>
          ) : days.map((day, i) => (
            <div key={day} className="flex items-center gap-4">
              <span className="text-xs font-medium w-8 text-muted-foreground shrink-0">{day}</span>
              <div className="flex-1 flex justify-between gap-1.5 sm:gap-2">
                {data[i].map((intensity, j) => (
                  <div 
                    key={j} 
                    className={`h-8 sm:h-10 w-full rounded-lg sm:rounded-xl transition-all duration-300 ${getColor(Math.min(intensity, 3))} hover:scale-[1.03] hover:shadow-md cursor-pointer`} 
                    title={`${day} ${hours[j]}: ${intensity} appointments`} 
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
