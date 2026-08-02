"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { LineChart, BarChart3 } from "lucide-react";

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get("/api/v1/blockchain/analytics");
        setAnalytics(res.data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return <div className="animate-pulse h-96 bg-muted rounded-xl"></div>;
  }

  const txData = analytics?.transactions || {};
  const maxTx = Math.max(...Object.values(txData as Record<string, number>), 1);

  const eventData = analytics?.events || {};
  const maxEvent = Math.max(...Object.values(eventData as Record<string, number>), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><LineChart className="w-6 h-6 text-primary" /> Analytics</h1>
        <p className="text-muted-foreground mt-1">Aggregated metrics and performance visualization.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Transactions CSS Bar Chart */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-semibold flex items-center gap-2 mb-6"><BarChart3 className="w-4 h-4 text-emerald-500" /> Transactions by Status</h3>
          <div className="space-y-4">
            {Object.entries(txData).map(([status, count]: any) => {
              const width = Math.max((count / maxTx) * 100, 2);
              return (
                <div key={status}>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>{status}</span>
                    <span>{count}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${status === 'FAILED' ? 'bg-red-500' : status === 'CONFIRMED' ? 'bg-emerald-500' : 'bg-yellow-500'}`}
                      style={{ width: `${width}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
            {Object.keys(txData).length === 0 && <p className="text-sm text-muted-foreground text-center">No transaction data available.</p>}
          </div>
        </div>

        {/* Events CSS Bar Chart */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-semibold flex items-center gap-2 mb-6"><BarChart3 className="w-4 h-4 text-blue-500" /> Events by Type</h3>
          <div className="space-y-4">
            {Object.entries(eventData).map(([type, count]: any) => {
              const width = Math.max((count / maxEvent) * 100, 2);
              return (
                <div key={type}>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>{type}</span>
                    <span>{count}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div 
                      className="h-3 rounded-full bg-primary"
                      style={{ width: `${width}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
            {Object.keys(eventData).length === 0 && <p className="text-sm text-muted-foreground text-center">No event data available.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
