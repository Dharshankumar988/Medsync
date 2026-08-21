"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { Activity, FileText, Package } from "lucide-react";
import { Skeleton } from "@medsync/ui";
import api from "@/lib/api";

export default function AdminOperations() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/admin/operations');
      setData(res.data.data);
    } catch (err) {
      console.error("Failed to fetch operations data", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Healthcare Operations</h1>
        <p className="text-muted-foreground mt-2">Monitor system-wide healthcare activities (metadata only).</p>
      </div>

      {loading || !data ? <Skeleton className="h-96 w-full" /> : (
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5"/> Appointments</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.appointments.slice(0,10).map((a: any) => (
                  <div key={a.id} className="text-sm border-b pb-2">
                    <p className="font-medium">Date: {a.date}</p>
                    <p className="text-muted-foreground">Status: {a.status}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5"/> Prescriptions</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.prescriptions.slice(0,10).map((p: any) => (
                  <div key={p.id} className="text-sm border-b pb-2">
                    <p className="font-medium">ID: {p.id.split('-')[0]}</p>
                    <p className="text-muted-foreground">Dispensed: {p.is_dispensed ? "Yes" : "No"}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5"/> Orders</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.orders.slice(0,10).map((o: any) => (
                  <div key={o.id} className="text-sm border-b pb-2">
                    <p className="font-medium">Status: {o.status}</p>
                    <p className="text-muted-foreground">Total: ${o.total}</p>
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
