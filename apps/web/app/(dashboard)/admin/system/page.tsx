"use client";
import dynamic from 'next/dynamic';
import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { Server, Database, CheckCircle, Brain, XCircle, Loader2, Box } from "lucide-react";
import { Badge } from "@medsync/ui";
import api from "@/lib/api";

const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false });

function EntityGraph({ nodes, edges }: { nodes: any[], edges: any[] }) {
  const fgRef = useRef<any>();
  const [selectedNode, setSelectedNode] = useState<any>(null);
  
  const graphData = {
    nodes: nodes.map(n => ({ ...n })),
    links: edges.map(e => ({ source: e.source, target: e.target, name: e.type }))
  };

  const getNodeColor = (node: any) => {
    if (node.hasError || node.status === 'ERROR' || node.status === 'FAILED') return '#ef4444';
    switch(node.type) {
      case 'Patient': return '#3b82f6'; // Blue
      case 'Doctor': return '#22c55e'; // Green
      case 'Pharmacy': return '#facc15'; // Yellow
      case 'Hospital': return '#a855f7'; // Purple
      case 'Admin': return '#f87171'; // Red
      case 'System': return '#6366f1'; // Indigo
      default: return '#9ca3af';
    }
  };

  return (
    <div className="w-full h-full border rounded-xl overflow-hidden bg-background relative flex items-center justify-center">
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        nodeLabel="label"
        nodeColor={getNodeColor}
        nodeRelSize={8}
        linkColor={() => 'var(--border)'}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        enableNodeDrag={true}
        onNodeClick={node => {
          setSelectedNode(node);
          // Aim at node from outside it
          const distance = 40;
          const distRatio = 1 + distance/Math.hypot(node.x || 0, node.y || 0, node.z || 0);

          fgRef.current?.cameraPosition(
            { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio }, // new position
            node, // lookAt ({ x, y, z })
            3000  // ms transition duration
          );
        }}
        width={typeof window !== 'undefined' ? (document.getElementById("graph-container")?.offsetWidth || 800) : 800}
        height={500}
        backgroundColor="#00000000" // transparent to match theme
        d3VelocityDecay={0.3}
      />
      
      {/* Legend at bottom right */}
      <div className="absolute bottom-4 right-4 p-3 rounded-lg bg-card/80 backdrop-blur-sm border shadow-sm text-xs space-y-1 z-10">
        <p className="font-semibold mb-2">Role & Entity Legend</p>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#6366f1] shadow-[0_0_8px_#6366f1]"></div> System</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#3b82f6] shadow-[0_0_8px_#3b82f6]"></div> Patient</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e]"></div> Doctor</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#facc15] shadow-[0_0_8px_#facc15]"></div> Pharmacy</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#a855f7] shadow-[0_0_8px_#a855f7]"></div> Hospital</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f87171] shadow-[0_0_8px_#f87171]"></div> Admin</div>
      </div>

      {/* Details Popup */}
      {selectedNode && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card p-6 rounded-xl border border-border shadow-2xl z-50 min-w-[300px]">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-bold text-lg">{selectedNode.label}</h3>
            <button onClick={() => setSelectedNode(null)} className="text-muted-foreground hover:text-foreground">
              <XCircle className="w-5 h-5"/>
            </button>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Type: <span style={{color: getNodeColor(selectedNode)}}>{selectedNode.type}</span></p>
            <p className="text-sm text-muted-foreground">{selectedNode.details || "No additional details available."}</p>
          </div>
        </div>
      )}
    </div>
  );
}

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
        <Card className="col-span-full" id="graph-container">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Box className="h-5 w-5 text-primary"/> MedSync Master Graph (3D)</CardTitle>
            <CardDescription>Interactive 3D spatial relationship view of all blockchain nodes, users, and linked entities in the system. Drag to rotate, scroll to zoom.</CardDescription>
          </CardHeader>
          <CardContent className="h-[550px] w-full p-6">
            {graphLoading ? (
              <div className="flex items-center justify-center h-full w-full border rounded-xl border-dashed">
                <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
              </div>
            ) : graphData && graphData.nodes.length > 0 ? (
              <EntityGraph nodes={graphData.nodes} edges={graphData.edges || (graphData as any).links || []} />
            ) : (
              <div className="flex items-center justify-center h-full w-full border rounded-xl border-dashed text-muted-foreground">
                No relationship data available.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
