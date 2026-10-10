"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import {
  Activity,
  Zap,
  Server,
  Shield,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Clock,
  Radio,
  CheckCircle2,
  Layers,
  ArrowUpRight,
  Cpu,
  FileCode2,
  Wifi,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Button,
} from "@medsync/ui";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface RealBlock {
  number: number;
  hash: string;
  tx_count: number;
  gas_used: number;
  gas_limit: number;
  gas_pct: number;
  miner: string;
  timestamp: number;
}

interface RealContract {
  name: string;
  address: string;
  status: string;
  network: string;
}

interface NetworkData {
  network: string;
  chain_id: number;
  status: string;
  latest_block: number;
  gas_price_gwei: number;
  base_fee_gwei?: number;
  priority_fee_gwei?: number;
  client_version?: string;
  rpc_provider: string;
  rpc_provider_full?: string;
  recent_blocks?: RealBlock[];
  contracts?: RealContract[];
}

const CONTRACT_DESCRIPTIONS: Record<string, string> = {
  PatientRegistry: "Anonymized DID & patient cryptographic identity registry",
  DoctorRegistry: "Practitioner licensing & medical credentials verification",
  PharmacyRegistry: "Licensed dispensary validation & pharmacy catalog",
  MedicalRecordRegistry: "EHR Merkle roots, integrity hashes & access control",
  PrescriptionRegistry: "Digital cryptographic prescription & dispensing ledger",
  ConsentManagement: "Granular patient consent & data revocation policies",
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
  },
};

function formatTimeAgo(timestampSeconds: number): string {
  if (!timestampSeconds) return "Just now";
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestampSeconds;
  if (diff <= 3) return "Just now";
  if (diff < 60) return `${diff}s ago`;
  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function NetworkMonitoring() {
  const [network, setNetwork] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(10);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [measuredPing, setMeasuredPing] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchNetwork = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    const start = performance.now();
    try {
      const res = await api.get("/api/v1/blockchain/network");
      const duration = Math.round(performance.now() - start);
      setMeasuredPing(duration);
      const data: NetworkData = res.data.data;
      setNetwork(data);
      setLastUpdated(new Date());
      setCountdown(10);
    } catch (e) {
      console.error(e);
      toast.error("Failed to fetch blockchain network telemetry");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handlePingNode = async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      await api.get("/api/v1/blockchain/network");
      const duration = Math.round(performance.now() - start);
      setMeasuredPing(duration);
      toast.success(`RPC response received in ${duration}ms!`, {
        description: `Node: ${network?.rpc_provider || "Polygon Amoy"} is healthy.`,
      });
    } catch (err) {
      toast.error("RPC Ping timed out or failed");
    } finally {
      setIsPinging(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchNetwork();
  }, [fetchNetwork]);

  // Countdown and periodic poll
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          fetchNetwork();
          return 10;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchNetwork, autoRefresh]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-muted/60 animate-pulse rounded-lg" />
            <div className="h-4 w-96 bg-muted/40 animate-pulse rounded-md" />
          </div>
          <div className="h-10 w-36 bg-muted/50 animate-pulse rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted/30 border border-border/40 animate-pulse rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-72 bg-muted/30 animate-pulse rounded-2xl border border-border/40" />
          <div className="lg:col-span-5 h-72 bg-muted/30 animate-pulse rounded-2xl border border-border/40" />
        </div>
      </div>
    );
  }

  const isHealthy = network?.status === "healthy" || network?.status === "connected";
  const recentBlocks = network?.recent_blocks || [];
  const contracts = network?.contracts || [];

  return (
    <div className="space-y-8 pb-10">
      {/* Dynamic Background Glow Effect */}
      <div className="pointer-events-none absolute -top-10 right-10 w-[500px] h-[350px] bg-emerald-500/[0.04] rounded-full blur-[120px]" />

      {/* ── Top Header & Real-time Telemetry Controls ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              DevOps Telemetry
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {lastUpdated ? `Sync: ${lastUpdated.toLocaleTimeString()}` : "Live"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Network Monitoring & RPC Health
          </h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl leading-relaxed">
            Real-time status of Polygon Amoy testnet RPC endpoints, block throughput, consensus parameters, and gas oracle.
          </p>
        </div>

        {/* Action Controls & Health Status Badge */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`px-3.5 py-1.5 rounded-full border text-xs sm:text-sm font-semibold flex items-center gap-2.5 shadow-sm transition-all ${
              isHealthy
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 dark:text-emerald-400"
                : "bg-red-500/10 border-red-500/30 text-red-500"
            }`}
          >
            <span className="relative flex h-2.5 w-2.5">
              {isHealthy && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isHealthy ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
            </span>
            <span>{isHealthy ? "SYNCHRONIZED" : "DEGRADED"}</span>
            <span className="text-[11px] opacity-75 font-mono">
              (ID: {network?.chain_id || 80002})
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePingNode}
            disabled={isPinging}
            className="rounded-xl border-border/70 text-xs font-medium hover:bg-muted/80 gap-1.5"
            title="Measure live round-trip latency to the RPC endpoint"
          >
            <Radio className={`w-3.5 h-3.5 ${isPinging ? "animate-spin text-emerald-500" : "text-emerald-500"}`} />
            {isPinging ? "Pinging..." : `Ping (${measuredPing !== null ? `${measuredPing}ms` : "..."})`}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNetwork(true)}
            disabled={refreshing}
            className="rounded-xl border-border/70 text-xs font-medium hover:bg-muted/80 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>{autoRefresh ? `${countdown}s` : "Refresh"}</span>
          </Button>

          <a
            href="https://amoy.polygonscan.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/70 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-primary" />
            <span>PolygonScan</span>
          </a>
        </div>
      </div>

      {/* ── 4 Elevated KPI Cards ── */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5"
      >
        {/* Card 1: RPC Provider & Node Gateway */}
        <motion.div variants={fadeUp}>
          <Card className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-emerald-500/40 group h-full flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/[0.06] rounded-full blur-2xl group-hover:bg-emerald-500/[0.12] transition-colors" />
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-emerald-500" />
                  RPC Provider
                </span>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-medium">
                  {isHealthy ? "Active" : "Degraded"}
                </Badge>
              </div>

              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <p
                    className="text-base font-bold text-foreground font-mono truncate"
                    title={network?.rpc_provider_full || network?.rpc_provider || "Configured Node"}
                  >
                    {network?.rpc_provider || "Not configured"}
                  </p>
                  <button
                    onClick={() =>
                      copyText(
                        network?.rpc_provider_full || network?.rpc_provider || "",
                        "RPC Provider URL"
                      )
                    }
                    className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted shrink-0"
                    title="Copy full RPC endpoint"
                  >
                    {copiedKey === "RPC Provider URL" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  Polygon Amoy Dedicated Gateway
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
              <span>Latency: <strong className="text-foreground font-mono">{measuredPing !== null ? `${measuredPing} ms` : "..."}</strong></span>
              <span>Status: <strong className="text-emerald-500 font-mono capitalize">{network?.status || "Connected"}</strong></span>
            </div>
          </Card>
        </motion.div>

        {/* Card 2: Network Identity & Consensus */}
        <motion.div variants={fadeUp}>
          <Card className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-blue-500/40 group h-full flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/[0.06] rounded-full blur-2xl group-hover:bg-blue-500/[0.12] transition-colors" />
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-blue-500" />
                  Network Name
                </span>
                <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-500 border-blue-500/30 font-medium">
                  EVM
                </Badge>
              </div>

              <div className="mt-3">
                <h3 className="text-xl font-bold text-foreground capitalize">
                  {network?.network || "Amoy"}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                    Chain ID: {network?.chain_id || 80002}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                    0x{(network?.chain_id || 80002).toString(16)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
              <span>Token: <strong className="text-foreground">POL</strong></span>
              <span>Network: <strong className="text-foreground">Polygon Testnet</strong></span>
            </div>
          </Card>
        </motion.div>

        {/* Card 3: Latest Block */}
        <motion.div variants={fadeUp}>
          <Card className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-purple-500/40 group h-full flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/[0.06] rounded-full blur-2xl group-hover:bg-purple-500/[0.12] transition-colors" />
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-purple-500" />
                  Latest Block
                </span>
                <span className="flex items-center gap-1 text-[11px] text-purple-500 font-medium bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                  On-Chain
                </span>
              </div>

              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold font-mono text-foreground tracking-tight">
                    {network?.latest_block ? `#${network.latest_block.toLocaleString()}` : "—"}
                  </p>
                  {network?.latest_block ? (
                    <a
                      href={`https://amoy.polygonscan.com/block/${network.latest_block}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-purple-500 transition-colors p-1"
                      title="View block on PolygonScan"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  Latest mined block index
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
              <span>Cadence: <strong className="text-foreground font-mono">~2.0s</strong></span>
              <span>Finality: <strong className="text-foreground font-mono">~32 blocks</strong></span>
            </div>
          </Card>
        </motion.div>

        {/* Card 4: Current Gas Price */}
        <motion.div variants={fadeUp}>
          <Card className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-amber-500/40 group h-full flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/[0.06] rounded-full blur-2xl group-hover:bg-amber-500/[0.12] transition-colors" />
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Current Gas Price
                </span>
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/30 font-medium">
                  EIP-1559
                </Badge>
              </div>

              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold font-mono text-foreground">
                    {network?.gas_price_gwei !== undefined ? `${network.gas_price_gwei.toFixed(2)}` : "—"}{" "}
                    <span className="text-sm font-sans font-medium text-muted-foreground">Gwei</span>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-muted/40 p-2 rounded-lg">
                    <p className="text-[10px] text-muted-foreground">Base Fee</p>
                    <p className="text-xs font-mono font-semibold text-foreground">
                      {network?.base_fee_gwei !== undefined ? `${network.base_fee_gwei.toFixed(4)} Gwei` : "—"}
                    </p>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Priority Fee</p>
                    <p className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                      {network?.priority_fee_gwei !== undefined ? `${network.priority_fee_gwei.toFixed(2)} Gwei` : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
              <span>Oracle: <strong className="text-foreground">Real-Time Eth Gas</strong></span>
              <span>Unit: <strong className="text-foreground">Gwei (10⁻⁹ POL)</strong></span>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* ── Middle Grid: Live Mined Blocks & Execution Node Info ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Real Recent Mined Blocks Feed */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/40 pb-4 bg-muted/20 flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Layers className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-base">Recent Mined Blocks</CardTitle>
                </div>
                <CardDescription className="text-xs mt-0.5">
                  Actual verified blocks queried directly from the Polygon Amoy chain
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[11px] gap-1.5 py-1 px-2.5 bg-background/50">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Feed ({recentBlocks.length})
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {recentBlocks.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No block history returned from the node.
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  <AnimatePresence initial={false}>
                    {recentBlocks.map((b) => (
                      <motion.div
                        key={b.number}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                            <Cpu className="h-4 w-4 text-purple-500" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <a
                                href={`https://amoy.polygonscan.com/block/${b.number}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-sm font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1"
                              >
                                #{b.number.toLocaleString()}
                                <ArrowUpRight className="w-3 h-3 opacity-60" />
                              </a>
                              <span className="text-[11px] text-muted-foreground">
                                {formatTimeAgo(b.timestamp)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5 font-mono">
                              Hash: {b.hash.slice(0, 10)}...{b.hash.slice(-8)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-right shrink-0">
                          <div>
                            <p className="text-xs font-semibold text-foreground">{b.tx_count} Txs</p>
                            <div className="flex items-center gap-1.5 mt-1 justify-end">
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${Math.min(100, b.gas_pct)}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {b.gas_pct}% Gas
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Node & Execution Specs */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md overflow-hidden shadow-sm h-full flex flex-col justify-between">
            <CardHeader className="border-b border-border/40 pb-4 bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Wifi className="h-4 w-4 text-emerald-500" />
                </div>
                <CardTitle className="text-base">Node Execution Details</CardTitle>
              </div>
              <CardDescription className="text-xs mt-0.5">
                Live client parameters reported by the active Web3 provider
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="p-3 rounded-xl border border-border/50 bg-muted/20">
                  <span className="text-muted-foreground text-xs block mb-1">Active Client Version</span>
                  <p className="text-xs font-mono font-medium text-foreground break-all">
                    {network?.client_version || "Bor (Polygon Client)"}
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-border/50 bg-muted/20">
                  <span className="text-muted-foreground text-xs block mb-1">Resolved Provider Endpoint</span>
                  <p className="text-xs font-mono font-medium text-foreground break-all">
                    {network?.rpc_provider_full || network?.rpc_provider || "Configured RPC"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/40 text-xs">
                <div className="bg-muted/30 p-2.5 rounded-xl border border-border/40">
                  <span className="text-muted-foreground block text-[11px]">Consensus Model</span>
                  <strong className="text-foreground">Proof-of-Stake</strong>
                </div>
                <div className="bg-muted/30 p-2.5 rounded-xl border border-border/40">
                  <span className="text-muted-foreground block text-[11px]">Round-Trip Ping</span>
                  <strong className="text-foreground font-mono">
                    {measuredPing !== null ? `${measuredPing} ms` : "..."}
                  </strong>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── MedSync Deployed Smart Contracts on Amoy ── */}
      <Card className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md overflow-hidden shadow-sm">
        <CardHeader className="border-b border-border/40 pb-4 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileCode2 className="h-4 w-4 text-blue-500" />
              </div>
              <CardTitle className="text-base">MedSync Verified Smart Contracts</CardTitle>
            </div>
            <CardDescription className="text-xs mt-0.5">
              Live smart contracts deployed on Polygon Amoy
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" /> All {contracts.length} Contracts Deployed
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x border-b border-border/40">
            {contracts.slice(0, 3).map((c, i) => (
              <div key={i} className="p-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="font-semibold text-sm text-foreground">{c.name}</p>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                    Deployed
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {CONTRACT_DESCRIPTIONS[c.name] || "MedSync protocol contract"}
                </p>
                <div className="flex items-center justify-between bg-muted/40 px-2.5 py-1.5 rounded-lg text-xs font-mono">
                  <span className="text-muted-foreground truncate mr-2" title={c.address}>
                    {c.address.slice(0, 8)}...{c.address.slice(-6)}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => copyText(c.address, c.name)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      title="Copy contract address"
                    >
                      {copiedKey === c.name ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <a
                      href={`https://amoy.polygonscan.com/address/${c.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors p-1"
                      title="View on PolygonScan"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x">
            {contracts.slice(3, 6).map((c, i) => (
              <div key={i} className="p-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="font-semibold text-sm text-foreground">{c.name}</p>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                    Deployed
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {CONTRACT_DESCRIPTIONS[c.name] || "MedSync protocol contract"}
                </p>
                <div className="flex items-center justify-between bg-muted/40 px-2.5 py-1.5 rounded-lg text-xs font-mono">
                  <span className="text-muted-foreground truncate mr-2" title={c.address}>
                    {c.address.slice(0, 8)}...{c.address.slice(-6)}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => copyText(c.address, c.name)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      title="Copy contract address"
                    >
                      {copiedKey === c.name ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <a
                      href={`https://amoy.polygonscan.com/address/${c.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors p-1"
                      title="View on PolygonScan"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
