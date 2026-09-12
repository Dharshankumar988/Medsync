"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { Brain, Activity } from "lucide-react";
import { Skeleton, Badge, Button } from "@medsync/ui";
import api from "@/lib/api";

export default function AdminAI() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/admin/ai');
      setData(res.data.data);
    } catch (err) {
      console.error("Failed to fetch AI data", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Management</h1>
        <p className="text-muted-foreground mt-2">Monitor AI models and inference activity.</p>
      </div>

      {loading ? <Skeleton className="h-96 w-full" /> : !data ? (
        <div className="flex flex-col items-center justify-center h-96 border border-dashed rounded-xl bg-muted/20">
          <p className="text-muted-foreground font-medium">Failed to load AI data.</p>
          <Button variant="outline" className="mt-4" onClick={fetchData}>Retry</Button>
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Available Models</CardTitle></CardHeader>
            <CardContent>
              {data.models?.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground border border-dashed rounded-xl bg-muted/10">
                  <p>No AI models found.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {data.models?.map((m: any, i: number) => (
                    <div key={i} className="p-4 border rounded-xl flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Brain className="h-8 w-8 text-red-500" />
                        <div>
                          <p className="font-bold">{m.name}</p>
                          <p className="text-xs text-muted-foreground">{m.type}</p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500">{m.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Recent Analyses</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.analyses?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No recent analyses found.</p>
                ) : (
                  data.analyses?.map((a: any) => (
                    <div key={a.id} className="flex justify-between items-center p-4 border rounded-xl hover:bg-muted/10">
                      <div>
                        <p className="font-medium">{a.model}</p>
                        <p className="text-sm text-muted-foreground">Confidence: {(a.confidence * 100).toFixed(1)}% | Latency: {a.time}ms</p>
                      </div>
                      <Badge variant="outline">{a.status}</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
