"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { Activity, ShieldCheck, Zap, ServerCrash, Clock, Wallet } from "lucide-react";

export default function BlockchainOverview() {
  const [network, setNetwork] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [netRes, anRes] = await Promise.all([
        api.get("/api/v1/blockchain/network"),
        api.get("/api/v1/blockchain/analytics")
      ]);
      setNetwork(netRes.data.data);
      setAnalytics(anRes.data.data);
    } catch (e) {
      // Handle silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // 10s auto refresh
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-muted rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const isHealthy = network?.status === "healthy";
  const successRate = analytics?.total_transactions > 0 
    ? Math.round((analytics.transactions.CONFIRMED / analytics.total_transactions) * 100) 
    : 100;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
        <p className="text-muted-foreground mt-2">
          Real-time snapshot of the MedSync blockchain subsystem.
        </p>
      </div>

      {/* Global Status Banner */}
      <div className={`p-4 rounded-xl border flex items-center gap-4 ${isHealthy ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-red-500/10 border-red-500/20 text-red-600'}`}>
        {isHealthy ? <ShieldCheck className="h-8 w-8" /> : <ServerCrash className="h-8 w-8" />}
        <div>
          <h3 className="font-semibold">{isHealthy ? "All Systems Operational" : "System Degraded"}</h3>
          <p className="text-sm opacity-90">
            {isHealthy 
              ? "The blockchain node is syncing and backend workers are processing normally." 
              : "Warning: RPC endpoint or backend workers are currently reporting degraded health."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Network Status */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Network</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Chain:</span> <span>{network?.network || "Unknown"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Block:</span> <span className="font-mono">{network?.latest_block?.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Gas Price:</span> <span>{network?.gas_price_gwei?.toFixed(2)} Gwei</span></div>
          </div>
          <Link href="/admin/blockchain/network" className="mt-4 block text-xs text-primary hover:underline">View details →</Link>
        </div>

        {/* Transactions Status */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-500" /> Transactions</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total Processed:</span> <span>{analytics?.total_transactions?.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Success Rate:</span> <span>{successRate}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pending:</span> <span>{analytics?.transactions?.PENDING || 0}</span></div>
          </div>
          <Link href="/admin/blockchain/transactions" className="mt-4 block text-xs text-primary hover:underline">View explorer →</Link>
        </div>

        {/* Queues Status */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-blue-500" /> Event Queues</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total Events:</span> <span>{analytics?.total_events?.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">DLQ Size:</span> <span>{analytics?.events?.DLQ || 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Failed:</span> <span>{analytics?.events?.FAILED || 0}</span></div>
          </div>
          <Link href="/admin/blockchain/queues" className="mt-4 block text-xs text-primary hover:underline">Manage queues →</Link>
        </div>
      </div>
    </div>
  );
}
