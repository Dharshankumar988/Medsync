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
  const [hoveredNode, setHoveredNode] = useState<any>(null);

  const graphData = {
    nodes: nodes.map(n => ({ ...n })),
    links: edges.map(e => ({ source: e.source, target: e.target, name: e.type }))
  };

  const getNodeColor = (node: any) => {
    if (node.isCentral) return '#FFD700'; // Golden color for central medicine node
    if (node.hasError || node.status === 'ERROR' || node.status === 'FAILED') return '#ef4444';
    switch(node.type) {
      case 'Patient': return '#3b82f6'; // Blue
      case 'Doctor': return '#22c55e'; // Green
      case 'Pharmacy': return '#facc15'; // Yellow
      case 'Hospital': return '#a855f7'; // Purple
      case 'Admin': return '#f87171'; // Red
      case 'Medicine': return '#FFD700'; // Golden
      default: return '#9ca3af';
    }
  };

  const getNodeSize = (node: any): number => {
    if (node.isCentral) return 15; // Larger for central node
    return 8;
  };

  const renderEntityDetails = (data: any) => {
    if (!data) return null;

    return (
      <div className="space-y-3">
        {data.name && (
          <div>
            <p className="text-xs text-muted-foreground">Name</p>
            <p className="text-sm font-medium">{data.name}</p>
          </div>
        )}
        {data.email && (
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm">{data.email}</p>
          </div>
        )}
        {data.phone && (
          <div>
            <p className="text-xs text-muted-foreground">Phone</p>
            <p className="text-sm">{data.phone}</p>
          </div>
        )}
        {data.address && (
          <div>
            <p className="text-xs text-muted-foreground">Address</p>
            <p className="text-sm">{data.address}</p>
          </div>
        )}
        {data.city && data.state && (
          <div>
            <p className="text-xs text-muted-foreground">Location</p>
            <p className="text-sm">{data.city}, {data.state}, {data.country || ''}</p>
          </div>
        )}
        {data.pincode && (
          <div>
            <p className="text-xs text-muted-foreground">Pincode</p>
            <p className="text-sm">{data.pincode}</p>
          </div>
        )}
        {data.specialization && (
          <div>
            <p className="text-xs text-muted-foreground">Specialization</p>
            <p className="text-sm">{data.specialization}</p>
          </div>
        )}
        {data.licenseNumber && (
          <div>
            <p className="text-xs text-muted-foreground">License Number</p>
            <p className="text-sm">{data.licenseNumber}</p>
          </div>
        )}
        {data.operatingHours && (
          <div>
            <p className="text-xs text-muted-foreground">Operating Hours</p>
            <p className="text-sm">{data.operatingHours}</p>
          </div>
        )}
        {data.is24x7 !== undefined && (
          <div>
            <p className="text-xs text-muted-foreground">24/7 Service</p>
            <p className="text-sm">{data.is24x7 ? 'Yes' : 'No'}</p>
          </div>
        )}
        {data.experience !== undefined && (
          <div>
            <p className="text-xs text-muted-foreground">Experience</p>
            <p className="text-sm">{data.experience} years</p>
          </div>
        )}
        {data.consultationFee !== undefined && (
          <div>
            <p className="text-xs text-muted-foreground">Consultation Fee</p>
            <p className="text-sm">₹{data.consultationFee}</p>
          </div>
        )}
        {data.bloodGroup && (
          <div>
            <p className="text-xs text-muted-foreground">Blood Group</p>
            <p className="text-sm">{data.bloodGroup}</p>
          </div>
        )}
        {data.googleMapsLink && (
          <div>
            <a
              href={data.googleMapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 mt-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              View on Google Maps
            </a>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full border rounded-xl overflow-hidden bg-background relative flex items-center justify-center">
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        nodeLabel="label"
        nodeColor={getNodeColor}
        nodeRelSize={8}
        linkColor={() => 'rgba(100, 100, 100, 0.3)'}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        linkWidth={1}
        enableNodeDrag={true}
        onNodeHover={node => setHoveredNode(node || null)}
        onNodeClick={node => {
          setSelectedNode(node);
          // Aim at node from outside it
          const distance = 40;
          const distRatio = 1 + distance/Math.hypot(node.x || 0, node.y || 0, node.z || 0);

          fgRef.current?.cameraPosition(
            { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
            node,
            3000
          );
        }}
        width={typeof window !== 'undefined' ? (document.getElementById("graph-container")?.offsetWidth || 800) : 800}
        height={500}
        backgroundColor="#00000000"
        d3VelocityDecay={0.3}
      />

      {/* Hover tooltip */}
      {hoveredNode && !selectedNode && (
        <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm p-3 rounded-lg border shadow-lg z-20 max-w-xs">
          <p className="font-semibold text-sm">{hoveredNode.label}</p>
          <p className="text-xs text-muted-foreground mt-1">{hoveredNode.details}</p>
        </div>
      )}

      {/* Details Popup */}
      {selectedNode && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card p-6 rounded-xl border border-border shadow-2xl z-50 min-w-[350px] max-w-md max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-lg">{selectedNode.label}</h3>
              <p className="text-xs text-muted-foreground" style={{color: getNodeColor(selectedNode)}}>{selectedNode.type}</p>
            </div>
            <button onClick={() => setSelectedNode(null)} className="text-muted-foreground hover:text-foreground">
              <XCircle className="w-5 h-5"/>
            </button>
          </div>
          {selectedNode.entityData ? (
            renderEntityDetails(selectedNode.entityData)
          ) : (
            <p className="text-sm text-muted-foreground">{selectedNode.details || "No additional details available."}</p>
          )}
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
            <CardTitle className="flex items-center gap-2"><Box className="h-5 w-5 text-primary"/> MedSync Entity Constellation (3D)</CardTitle>
            <CardDescription>Interactive 3D constellation view of healthcare entities. Golden central node represents Medicine. Hover to preview, click for details including location and Google Maps link. Drag to rotate, scroll to zoom.</CardDescription>
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

        {/* Legend below the graph */}
        <Card className="col-span-full">
          <CardContent className="p-6">
            <p className="font-semibold mb-4 text-sm">Role & Entity Legend</p>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#FFD700] shadow-[0_0_10px_#FFD700]"></div>
                <span className="text-sm">Medicine (Central Hub)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#3b82f6] shadow-[0_0_10px_#3b82f6]"></div>
                <span className="text-sm">Patient</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#22c55e] shadow-[0_0_10px_#22c55e]"></div>
                <span className="text-sm">Doctor</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#facc15] shadow-[0_0_10px_#facc15]"></div>
                <span className="text-sm">Pharmacy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#a855f7] shadow-[0_0_10px_#a855f7]"></div>
                <span className="text-sm">Hospital</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#f87171] shadow-[0_0_10px_#f87171]"></div>
                <span className="text-sm">Admin</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
