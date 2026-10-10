"use client";
import dynamic from 'next/dynamic';
import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { Server, Database, CheckCircle, Brain, XCircle, Loader2, Sparkles, Share2 } from "lucide-react";
import { Badge } from "@medsync/ui";
import api from "@/lib/api";

const ConstellationGraph = dynamic(() => import('@/components/admin/ConstellationGraph'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full w-full border rounded-2xl border-dashed border-border/50 bg-[#070a12]">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-3 border-cyan-500 border-t-transparent rounded-full" />
        <span className="text-xs font-mono">Initializing 3D Graph Engine...</span>
      </div>
    </div>
  )
});

export default function AdminSystem() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [graphData, setGraphData] = useState<{nodes: any[], edges: any[]} | null>(null);
  const [graphLoading, setGraphLoading] = useState(true);

  useEffect(() => {
    fetchSystemHealth();
    
    api.get('/api/v1/admin/graph').then(res => {
      setGraphData(res.data.data);
      setGraphLoading(false);
    }).catch(err => {
      console.error("Failed to fetch graph data", err);
      setGraphLoading(false);
    });
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

  if (loading && !services.length) {
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
        <p className="text-muted-foreground mt-2">Real-time health status of platform infrastructure and 3D architecture view.</p>
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
      
      <div className="grid gap-6 mt-6">
        <Card className="col-span-full border-neutral-900 shadow-2xl overflow-hidden bg-black" id="graph-container">
          <CardHeader className="pb-3 border-b border-neutral-900 bg-black">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2.5 text-xl">
                  <Share2 className="h-5 w-5 text-cyan-400" /> Advanced Graph View
                </CardTitle>
                <CardDescription className="mt-1">
                  Interactive 3D network topology connecting platform entities. Drag background to rotate in 3D, scroll to zoom, and select any node to trace clinical and operational relationships.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-5 bg-black">
            {graphLoading ? (
              <div className="flex items-center justify-center h-[540px] w-full border rounded-2xl border-dashed border-neutral-800 bg-black">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <div className="animate-spin h-8 w-8 border-3 border-cyan-400 border-t-transparent rounded-full" />
                  <span className="text-xs font-mono">Loading 3D Entity Nodes & Relationships...</span>
                </div>
              </div>
            ) : graphData && graphData.nodes && graphData.nodes.length > 0 ? (
              <ConstellationGraph
                nodes={graphData.nodes}
                edges={graphData.edges || (graphData as any).links || []}
              />
            ) : (
              <div className="flex items-center justify-center h-[540px] w-full border rounded-2xl border-dashed text-muted-foreground bg-black border-neutral-800">
                No relationship graph data available.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Network Role & Entity Legend */}
        <Card className="col-span-full border-neutral-900 bg-black shadow-md">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-sm tracking-wide text-foreground flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-cyan-400" /> Network Entity Legend
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Interactive node indicators. Hover or select to highlight connected clinical pathways in 3D space.
                </p>
              </div>
              <div className="flex flex-wrap gap-4 sm:gap-6 items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#fbbf24] shadow-[0_0_10px_#fbbf24]"></div>
                  <span className="text-xs font-medium text-foreground/90">MedSync (Core)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#c084fc] shadow-[0_0_10px_#c084fc]"></div>
                  <span className="text-xs font-medium text-foreground/90">Hospital</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#34d399] shadow-[0_0_10px_#34d399]"></div>
                  <span className="text-xs font-medium text-foreground/90">Doctor</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#38bdf8] shadow-[0_0_10px_#38bdf8]"></div>
                  <span className="text-xs font-medium text-foreground/90">Patient</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#fb923c] shadow-[0_0_10px_#fb923c]"></div>
                  <span className="text-xs font-medium text-foreground/90">Pharmacy</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#fb7185] shadow-[0_0_10px_#fb7185]"></div>
                  <span className="text-xs font-medium text-foreground/90">Admin</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
