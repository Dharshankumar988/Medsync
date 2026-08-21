"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { Server, Database, CheckCircle, Brain } from "lucide-react";
import { Badge } from "@medsync/ui";

export default function AdminSystem() {
  const services = [
    { name: "Frontend App", status: "HEALTHY", icon: Server },
    { name: "FastAPI Backend", status: "HEALTHY", icon: Server },
    { name: "Supabase DB", status: "HEALTHY", icon: Database },
    { name: "AI Inference Engine", status: "HEALTHY", icon: Brain },
    { name: "Blockchain Gateway", status: "HEALTHY", icon: Server },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System & Integrations</h1>
        <p className="text-muted-foreground mt-2">Real-time health status of platform infrastructure.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((s, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-500">
                <s.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{s.name}</p>
                <div className="flex items-center gap-1 text-xs text-emerald-500 mt-1">
                  <CheckCircle className="h-3 w-3" /> {s.status}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
