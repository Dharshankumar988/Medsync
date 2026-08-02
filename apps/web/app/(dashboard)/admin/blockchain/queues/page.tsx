"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Layers, Database, ArrowRightCircle } from "lucide-react";
import Link from "next/link";

export default function QueuesDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await api.get("/api/v1/blockchain/queue/metrics");
      setMetrics(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  if (loading) {
    return <div className="animate-pulse h-96 bg-muted rounded-xl"></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Layers className="w-6 h-6 text-primary" /> Queues & Workers</h1>
        <p className="text-muted-foreground mt-1">Monitor the state of background event processing queues.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending</p>
          <p className="text-3xl font-bold mt-2 text-yellow-500">{metrics?.total_pending || 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Processing</p>
          <p className="text-3xl font-bold mt-2 text-blue-500">{metrics?.total_processing || 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Processed</p>
          <p className="text-3xl font-bold mt-2 text-emerald-500">{metrics?.total_processed || 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm bg-red-500/5 border-red-500/20">
          <p className="text-xs font-medium text-red-600/80 uppercase tracking-wide flex items-center justify-between">
            Dead Letter Queue (DLQ)
            <Link href="/admin/blockchain/dlq"><ArrowRightCircle className="w-4 h-4 text-red-500 hover:scale-110 transition-transform" /></Link>
          </p>
          <p className="text-3xl font-bold mt-2 text-red-500">{metrics?.total_dlq || 0}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm uppercase tracking-wide">Recent Worker Errors</h3>
        </div>
        <div className="p-0 max-h-64 overflow-y-auto">
          <ul className="divide-y divide-border">
            {metrics?.recent_errors?.length === 0 && <li className="p-4 text-sm text-muted-foreground">No recent errors logged by background workers.</li>}
            {metrics?.recent_errors?.map((err: string, i: number) => (
              <li key={i} className="p-4 text-sm font-mono text-red-500 bg-red-500/5">{err}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
