"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Badge } from "@medsync/ui";
import { AlertCircle, Clock, Video, Activity, Stethoscope } from "lucide-react";
import { Avatar } from "@medsync/ui/components/avatar";
import { cn } from "@/lib/utils";

export function PatientQueue({ queue }: { queue: any[] }) {

  return (
    <Card className="flex flex-col h-full rounded-2xl border border-border/60 bg-card/50">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-4">
        <div>
          <CardTitle>Today&apos;s Schedule</CardTitle>
          <CardDescription>Real-time updates on your appointments</CardDescription>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl">Manage Queue</Button>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <div className="relative p-6 pt-4">
          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                <Clock className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="font-medium">No upcoming appointments today</p>
              <p className="text-sm text-muted-foreground mt-1">Your schedule is clear.</p>
            </div>
          ) : (
            <div className="space-y-6 before:absolute before:inset-0 before:ml-9 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/60 before:to-transparent">
              {queue.map((patient, i) => {
                const statusStr = (patient.status || "PENDING").toUpperCase();
                
                let dotColor = "bg-muted border-muted-foreground/30";
                let statusBadgeCls = "bg-gray-500/10 text-gray-600 border-transparent";
                
                if (statusStr === "CONFIRMED") {
                  dotColor = "bg-blue-500 border-blue-200 dark:border-blue-900";
                  statusBadgeCls = "bg-blue-500/10 text-blue-600 border-transparent";
                } else if (statusStr === "COMPLETED") {
                  dotColor = "bg-emerald-500 border-emerald-200 dark:border-emerald-900";
                  statusBadgeCls = "bg-emerald-500/10 text-emerald-600 border-transparent";
                } else if (statusStr === "PENDING") {
                  dotColor = "bg-amber-500 border-amber-200 dark:border-amber-900";
                  statusBadgeCls = "bg-amber-500/10 text-amber-600 border-transparent";
                }

                return (
                  <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    
                    {/* Timeline Dot */}
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border-4 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 bg-background mr-3 md:mr-0 absolute left-6 md:left-1/2 -translate-x-1/2">
                      <div className={cn("w-2 h-2 rounded-full", dotColor)} />
                    </div>
                    
                    {/* Content Card */}
                    <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-4 rounded-2xl border border-border/60 bg-card/80 hover:bg-card hover:shadow-lg hover:-translate-y-0.5 transition-all ml-12 md:ml-0 shadow-sm group-hover:border-primary/20">
                      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3 sm:gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar fallback={patient.name} src={patient.picture} className="h-10 w-10 border rounded-xl" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm">{patient.name}</p>
                              {patient.urgent && <AlertCircle className="h-3.5 w-3.5 text-rose-500" />}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3" /> {patient.time}
                              <span className="mx-0.5">•</span>
                              <Badge variant="outline" className={cn("px-1.5 py-0 rounded text-[10px]", statusBadgeCls)}>
                                {statusStr.toLowerCase()}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        {(statusStr === "CONFIRMED" || statusStr === "PENDING") && (
                           <Button size="sm" variant={statusStr === "CONFIRMED" ? "default" : "secondary"} className="rounded-lg w-full sm:w-auto h-8 text-xs">
                             <Stethoscope className="w-3.5 h-3.5 mr-1.5" />
                             {statusStr === "CONFIRMED" ? "Start Consult" : "Review"}
                           </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
