"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { Server, Database, CheckCircle, Brain, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@medsync/ui";
import api from "@/lib/api";

export default function AdminSystem() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemHealth();
  }, []);

  const fetchSystemHealth = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/admin/system');
      if (res.data?.data?.services) {
        setServices(res.data.data.services);
      }
    } catch (err) {
      console.error("Failed to fetch system health", err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (name: string) => {
    if (name.includes("DB") || name.includes("Database")) return Database;
    if (name.includes("AI")) return Brain;
    return Server;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System & Integrations</h1>
        <p className="text-muted-foreground mt-2">Real-time health status of platform infrastructure.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((s, i) => {
          const Icon = getIcon(s.name);
          const isHealthy = s.status === "HEALTHY";
          const isError = s.status === "ERROR";
          
          return (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`p-3 rounded-xl ${
                  isHealthy ? "bg-emerald-500/10 text-emerald-500" :
                  isError ? "bg-red-500/10 text-red-500" :
                  "bg-amber-500/10 text-amber-500"
                }`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{s.name}</p>
                  <div className={`flex items-center gap-1 text-xs mt-1 ${
                    isHealthy ? "text-emerald-500" :
                    isError ? "text-red-500" :
                    "text-amber-500"
                  }`}>
                    {isHealthy ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {s.status}
                  </div>
                  {s.reason && (
                    <p className="text-xs text-muted-foreground mt-1 truncate" title={s.reason}>
                      {s.reason}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
