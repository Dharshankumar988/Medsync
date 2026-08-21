"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";

export function AppointmentHeatmap() {
  // A visual representation of a weekly heatmap
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = ["9AM", "11AM", "1PM", "3PM", "5PM"];
  
  // 1: light, 2: medium, 3: heavy, 0: none
  const data = [
    [1, 2, 3, 2, 1], // Mon
    [0, 1, 2, 1, 0], // Tue
    [2, 3, 3, 2, 1], // Wed
    [1, 1, 1, 0, 0], // Thu
    [3, 3, 2, 1, 1], // Fri
    [1, 2, 1, 0, 0], // Sat
    [0, 0, 0, 0, 0], // Sun
  ];

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
          {days.map((day, i) => (
            <div key={day} className="flex items-center gap-4">
              <span className="text-xs font-medium w-8 text-muted-foreground shrink-0">{day}</span>
              <div className="flex-1 flex justify-between gap-1.5 sm:gap-2">
                {data[i].map((intensity, j) => (
                  <div 
                    key={j} 
                    className={`h-8 sm:h-10 w-full rounded-lg sm:rounded-xl transition-all duration-300 ${getColor(intensity)} hover:scale-[1.03] hover:shadow-md cursor-pointer`} 
                    title={`${day} ${hours[j]}`} 
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
