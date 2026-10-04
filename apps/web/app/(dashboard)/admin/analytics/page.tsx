"use client";
import dynamic from 'next/dynamic';
import { useCallback, useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { LineChart as LineChartIcon, BarChart as BarChartIcon, Activity, TrendingUp, Users, Share2, Box } from "lucide-react";
import { dashboardService } from "@/services/dashboard.service";
import api from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false });

function EntityGraph({ nodes, edges }: { nodes: any[], edges: any[] }) {
  const fgRef = useRef<any>();
  
  const graphData = {
    nodes: nodes.map(n => ({ ...n })),
    links: edges.map(e => ({ source: e.source, target: e.target, name: e.type }))
  };

  const getNodeColor = (node: any) => {
    if (node.hasError || node.status === 'ERROR' || node.status === 'FAILED') return '#ef4444';
    switch(node.type) {
      case 'Patient': return '#3b82f6';
      case 'Doctor': return '#10b981';
      case 'Pharmacy': return '#f59e0b';
      case 'Hospital': return '#8b5cf6';
      case 'Prescription': return '#ec4899';
      case 'Order': return '#14b8a6';
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
        nodeRelSize={6}
        linkColor={() => 'var(--border)'}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        onNodeClick={node => {
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
      <div className="absolute top-4 left-4 p-3 rounded-lg bg-card/80 backdrop-blur-sm border shadow-sm text-xs space-y-1">
        <p className="font-semibold mb-2">Entity Legend</p>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div> Patient</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#10b981]"></div> Doctor</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div> Pharmacy</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#8b5cf6]"></div> Hospital</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ec4899]"></div> Prescription</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#14b8a6]"></div> Order</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ef4444]"></div> Error/Failed</div>
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [stats, setStats] = useState<any>(null);
  const [graphData, setGraphData] = useState<{nodes: any[], edges: any[]} | null>(null);
  const [graphLoading, setGraphLoading] = useState(true);

  useEffect(() => {
    dashboardService.getAdminDashboard().then(data => {
      setStats(data || { users: { total: 1, patients: 0, doctors: 0, pharmacies: 0, pending_verification: 0 }, operations: { appointments: 0, prescriptions: 0, orders: 0 } });
    }).catch(err => {
      console.error(err);
      setStats({ users: { total: 1, patients: 0, doctors: 0, pharmacies: 0, pending_verification: 0 }, operations: { appointments: 0, prescriptions: 0, orders: 0 } });
    });
    
    api.get('/api/v1/admin/graph').then(res => {
      setGraphData(res.data.data);
      setGraphLoading(false);
    }).catch(err => {
      console.error("Failed to fetch graph data", err);
      setGraphLoading(false);
    });
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const userStats = stats.users || { total: 1, patients: 0, doctors: 0, pharmacies: 0, pending_verification: 0 };
  const opStats = stats.operations || { appointments: 0, prescriptions: 0, orders: 0 };

  const totalUsers = userStats.total || 1;
  const patientPct = Math.round((userStats.patients / totalUsers) * 100);
  const doctorPct = Math.round((userStats.doctors / totalUsers) * 100);
  const pharmacyPct = Math.round((userStats.pharmacies / totalUsers) * 100);

  const operationsData = [
    { name: "Appointments", value: opStats.appointments, fill: "#8b5cf6" },
    { name: "Prescriptions", value: opStats.prescriptions, fill: "#10b981" },
    { name: "Orders", value: opStats.orders, fill: "#3b82f6" }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Analytics</h1>
        <p className="text-muted-foreground mt-2">Historical trends, system health, and aggregated metadata.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><LineChartIcon className="h-5 w-5"/> User Distribution</CardTitle></CardHeader>
          <CardContent className="h-72 flex flex-col justify-center gap-4 text-sm px-8">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Patients</span><span className="font-medium">{userStats.patients} ({patientPct}%)</span>
              </div>
              <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${patientPct}%` }}></div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Doctors</span><span className="font-medium">{userStats.doctors} ({doctorPct}%)</span>
              </div>
              <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${doctorPct}%` }}></div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Pharmacies</span><span className="font-medium">{userStats.pharmacies} ({pharmacyPct}%)</span>
              </div>
              <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pharmacyPct}%` }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChartIcon className="h-5 w-5"/> Operations Volume</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={operationsData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 uppercase tracking-wider text-xs font-semibold"><Users className="w-4 h-4 text-amber-500"/> Verified Professionals</CardDescription>
            <CardTitle className="text-3xl">{userStats.doctors + userStats.pharmacies}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Active in network. {userStats.doctors} Doctors, {userStats.pharmacies} Pharmacies.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card className="col-span-full" id="graph-container">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Box className="h-5 w-5"/> MedSync Master Graph (3D)</CardTitle>
            <CardDescription>Interactive 3D spatial relationship view of all users, records, and linked entities in the system. Drag to rotate, scroll to zoom.</CardDescription>
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

