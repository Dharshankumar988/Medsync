"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Activity, Zap, Server, Shield, ExternalLink } from "lucide-react";

export default function NetworkMonitoring() {
  const [network, setNetwork] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNetwork = async () => {
      try {
        const res = await api.get("/api/v1/blockchain/network");
        setNetwork(res.data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchNetwork();
    const interval = setInterval(fetchNetwork, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="animate-pulse h-64 bg-muted rounded-xl"></div>;
  }

  const isHealthy = network?.status === "healthy" || network?.status === "connected";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Network Monitoring</h1>
          <p className="text-muted-foreground mt-1">Real-time status of the RPC endpoints and connected blockchain network.</p>
        </div>
        <div className={`px-4 py-2 rounded-full border text-sm font-semibold flex items-center gap-2 ${isHealthy ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-red-500/10 border-red-500/30 text-red-600'}`}>
          <div className={`h-2 w-2 rounded-full ${isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
          {isHealthy ? 'CONNECTED' : 'DEGRADED'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2"><Server className="w-4 h-4" /> RPC Provider</p>
          {(network?.rpc_provider?.startsWith('http') || network?.rpc_provider?.startsWith('ws')) ? (
            <a href={network.rpc_provider_full || network.rpc_provider} target="_blank" rel="noreferrer" className="text-lg font-bold mt-2 text-primary hover:underline truncate flex items-center gap-1.5 w-fit">
              View Endpoint <ExternalLink className="w-4 h-4 shrink-0" />
            </a>
          ) : (
            <p className="text-lg font-bold mt-2 truncate" title={network?.rpc_provider || "Unknown"}>{network?.rpc_provider || "Unknown"}</p>
          )}
        </div>
        
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2"><Activity className="w-4 h-4" /> Network Name</p>
          <div>
            <p className="text-xl font-bold mt-2 capitalize">{network?.network}</p>
            <p className="text-xs text-muted-foreground mt-1">Chain ID: {network?.chain_id}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2"><Shield className="w-4 h-4" /> Latest Block</p>
          <p className="text-2xl font-bold mt-2 font-mono">{network?.latest_block ? network.latest_block.toLocaleString() : "—"}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2"><Zap className="w-4 h-4" /> Current Gas Price</p>
          <p className="text-2xl font-bold mt-2">
            {network?.gas_price_gwei && network.gas_price_gwei > 0 ? `${network.gas_price_gwei.toFixed(2)} Gwei` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
