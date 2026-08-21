"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Skeleton, Badge } from "@medsync/ui";
import api from "@/lib/api";

export default function AdminSecurity() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/admin/security');
      setData(res.data.data);
    } catch (err) {
      console.error("Failed to fetch security data", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security & Audit</h1>
        <p className="text-muted-foreground mt-2">Monitor authentication events, authorization failures, and system audit logs.</p>
      </div>

      {loading || !data ? <Skeleton className="h-96 w-full" /> : (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-red-500 flex items-center gap-2"><ShieldAlert className="h-5 w-5"/> Security Alerts</CardTitle></CardHeader>
            <CardContent>
              {data.alerts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground border border-dashed rounded-xl bg-muted/10">
                  <ShieldCheck className="h-10 w-10 mx-auto text-emerald-500 mb-2 opacity-50" />
                  No active security alerts
                </div>
              ) : (
                <div className="space-y-2">
                  {data.alerts.map((a: any, i: number) => (
                    <div key={i} className="p-3 border rounded-lg bg-red-500/10 text-red-600">
                      {a.message}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>System Audit Logs</CardTitle></CardHeader>
            <CardContent>
              <div className="divide-y border rounded-xl overflow-hidden">
                <div className="grid grid-cols-4 bg-muted/20 p-3 font-medium text-sm text-muted-foreground">
                  <div>Timestamp</div>
                  <div>Endpoint</div>
                  <div>Method</div>
                  <div>Status</div>
                </div>
                {data.logs.map((log: any) => (
                  <div key={log.id} className="grid grid-cols-4 p-3 text-sm hover:bg-muted/10">
                    <div className="text-muted-foreground">{new Date(log.created_at).toLocaleString()}</div>
                    <div className="truncate pr-4 font-mono text-xs">{log.endpoint}</div>
                    <div><Badge variant="outline">{log.method}</Badge></div>
                    <div>
                      <Badge className={log.status_code >= 400 ? "bg-red-500" : "bg-emerald-500"}>
                        {log.status_code}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
