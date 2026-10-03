"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@medsync/ui";
import {
  Shield, ShieldAlert, CheckCircle, XCircle, AlertTriangle,
  Wallet, Activity, Blocks, Globe, Copy, ExternalLink,
  RefreshCw, Cpu, Zap, ArrowUpRight
} from "lucide-react";
import { Skeleton, Badge, Button } from "@medsync/ui";
import api from "@/lib/api";

interface ContractInfo {
  name: string;
  address: string;
  health: string;
  explorer_url: string;
}

interface TxInfo {
  hash: string;
  from: string;
  status: string;
  network: string;
  explorer_url?: string;
}

interface BlockchainData {
  status: string;
  nodes: number;
  latest_block: number;
  chain_id: number;
  wallet_address: string;
  wallet_balance_eth: number | null;
  gas_price_gwei: number | null;
  network_name: string;
  rpc_url: string | null;
  contracts: ContractInfo[];
  transactions: TxInfo[];
  mismatches: number;
  explorer_base: string;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

function shortenAddress(addr: string) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function StatusIcon({ status }: { status: string }) {
  const s = status?.toLowerCase();
  if (s === "healthy") return <CheckCircle className="h-5 w-5 text-emerald-400" />;
  if (s === "degraded") return <AlertTriangle className="h-5 w-5 text-amber-400" />;
  return <XCircle className="h-5 w-5 text-red-400" />;
}

function ContractHealthBadge({ health }: { health: string }) {
  const h = health?.toLowerCase();
  if (h === "available" || h === "deployed" || h === "mocked")
    return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25">{h === "mocked" ? "Active (Mocked)" : health}</Badge>;
  if (h === "not_configured")
    return <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">{health}</Badge>;
  return <Badge variant="destructive" className="bg-red-500/15 text-red-400 border-red-500/30">{health}</Badge>;
}

export default function AdminBlockchain() {
  const [data, setData] = useState<BlockchainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get('/api/v1/admin/blockchain');
      setData(res.data.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch blockchain data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-72 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 border border-dashed rounded-xl bg-muted/10">
        <XCircle className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground font-medium text-lg">Failed to load blockchain overview</p>
        <p className="text-muted-foreground/60 text-sm mt-1">Check backend connectivity and try again</p>
        <Button variant="outline" className="mt-6" onClick={() => fetchData()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const isHealthy = data.status === "Healthy";
  const isDegraded = data.status === "Degraded";
  const availableContracts = data.contracts.filter(c => c.health === "available" || c.health === "deployed" || c.health === "mocked").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Blocks className="h-6 w-6 text-primary" />
            Blockchain Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time status from Polygon {data.network_name?.charAt(0).toUpperCase() + data.network_name?.slice(1)} Testnet
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`relative overflow-hidden rounded-xl border p-5 transition-all ${
        isHealthy
          ? "bg-gradient-to-r from-emerald-500/5 via-emerald-500/10 to-teal-500/5 border-emerald-500/20"
          : isDegraded
            ? "bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-orange-500/5 border-amber-500/20"
            : "bg-gradient-to-r from-red-500/5 via-red-500/10 to-rose-500/5 border-red-500/20"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
              isHealthy ? "bg-emerald-500/15" : isDegraded ? "bg-amber-500/15" : "bg-red-500/15"
            }`}>
              <StatusIcon status={data.status} />
            </div>
            <div>
              <p className={`text-lg font-semibold ${
                isHealthy ? "text-emerald-400" : isDegraded ? "text-amber-400" : "text-red-400"
              }`}>{data.status}</p>
              <p className="text-sm text-muted-foreground">
                {data.network_name?.charAt(0).toUpperCase() + data.network_name?.slice(1)} • Chain ID {data.chain_id || "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="text-right">
              <p className="text-muted-foreground text-xs">Block Height</p>
              <p className="font-mono font-semibold">{data.latest_block ? `#${data.latest_block.toLocaleString()}` : "—"}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-xs">Contracts</p>
              <p className="font-semibold">{availableContracts}/{data.contracts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Wallet */}
        <Card className="group hover:shadow-md transition-all duration-200 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Backend Wallet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm truncate" title={data.wallet_address}>
                {shortenAddress(data.wallet_address)}
              </span>
              <button
                onClick={() => copyToClipboard(data.wallet_address)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Copy address"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <a
                href={`${data.explorer_base}/address/${data.wallet_address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                title="View on PolygonScan"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <p className="text-2xl font-bold">
              {data.wallet_balance_eth != null
                ? `${data.wallet_balance_eth.toFixed(4)} POL`
                : "—"}
            </p>
          </CardContent>
        </Card>

        {/* Latest Block */}
        <Card className="group hover:shadow-md transition-all duration-200 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Blocks className="h-4 w-4" /> Latest Block
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">
              {data.latest_block ? `#${data.latest_block.toLocaleString()}` : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Chain ID: {data.chain_id || "—"}
            </p>
          </CardContent>
        </Card>

        {/* Gas Price */}
        <Card className="group hover:shadow-md transition-all duration-200 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" /> Gas Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {data.gas_price_gwei != null
                ? `${data.gas_price_gwei.toFixed(2)} Gwei`
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Current network fee
            </p>
          </CardContent>
        </Card>

        {/* Network */}
        <Card className="group hover:shadow-md transition-all duration-200 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Globe className="h-4 w-4" /> Network
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold capitalize">{data.network_name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {data.nodes > 0 ? "RPC Connected" : "Disconnected"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contracts & Integrity Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Deployed Contracts */}
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cpu className="h-4 w-4 text-primary" />
              Deployed Smart Contracts
              <Badge variant="outline" className="ml-auto font-mono text-xs">
                {availableContracts}/{data.contracts.length} active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.contracts.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">No contracts configured</p>
              ) : (
                data.contracts.map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/5 hover:bg-muted/15 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{c.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-xs text-muted-foreground truncate">
                          {shortenAddress(c.address)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(c.address)}
                          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          title="Copy address"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <a
                          href={c.explorer_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                          title="View on PolygonScan"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                    <ContractHealthBadge health={c.health} />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Integrity Alerts */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-primary" />
              Integrity Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.mismatches === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 mb-4">
                  <Shield className="h-7 w-7 text-emerald-400" />
                </div>
                <p className="font-semibold text-emerald-400">All Clear</p>
                <p className="text-xs text-muted-foreground mt-1">No sync failures or data mismatches detected</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 mb-4">
                  <ShieldAlert className="h-7 w-7 text-red-400" />
                </div>
                <p className="font-semibold text-red-400">{data.mismatches} Failed Sync{data.mismatches !== 1 ? "s" : ""}</p>
                <p className="text-xs text-muted-foreground mt-1">Review pending blockchain sync tasks</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Recent Transactions
            {data.transactions.length > 0 && (
              <Badge variant="outline" className="ml-auto font-mono text-xs">
                {data.transactions.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground font-medium">No transactions yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Blockchain transactions will appear here as they are processed</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.transactions.slice(0, 10).map((tx, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/5 hover:bg-muted/15 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                      tx.status === "confirmed" || tx.status === "success"
                        ? "bg-emerald-500/10"
                        : tx.status === "pending"
                          ? "bg-amber-500/10"
                          : "bg-red-500/10"
                    }`}>
                      <ArrowUpRight className={`h-4 w-4 ${
                        tx.status === "confirmed" || tx.status === "success"
                          ? "text-emerald-400"
                          : tx.status === "pending"
                            ? "text-amber-400"
                            : "text-red-400"
                      }`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-sm truncate">{shortenAddress(tx.hash)}</p>
                      <p className="text-xs text-muted-foreground">from {shortenAddress(tx.from)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{tx.network}</Badge>
                    <Badge className={`text-xs ${
                      tx.status === "confirmed" || tx.status === "success"
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : tx.status === "pending"
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          : "bg-red-500/15 text-red-400 border-red-500/30"
                    }`}>{tx.status}</Badge>
                    {tx.explorer_url && (
                      <a
                        href={tx.explorer_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
