"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { blockchainService, type BlockchainAnalyticsResponse } from "@/services/blockchain.service";
import { motion } from "framer-motion";
import { ArrowLeft, Box, Fuel, Network, ShieldCheck, Activity, Copy, ExternalLink, ActivitySquare, Server, Link2, FileCode, CheckCircle2, XCircle } from "lucide-react";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

function Sparkline({ values }: { values: number[] }) {
  const points = useMemo(() => {
    if (!values.length) return "";
    const max = Math.max(...values, 1);
    const step = values.length > 1 ? 100 / (values.length - 1) : 100;
    return values
      .map((value, index) => {
        const x = index * step;
        const y = 100 - (value / max) * 100;
        return `${x},${y}`;
      })
      .join(" ");
  }, [values]);

  return (
    <svg viewBox="-5 -5 110 110" className="h-32 w-full drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke="url(#gradient)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BarChart({ items }: { items: Array<{ label: string; value: number }> }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="flex h-48 items-end gap-3 mt-4">
      {items.map((item, index) => (
        <motion.div 
          initial={{ height: 0 }}
          animate={{ height: "100%" }}
          transition={{ duration: 1, delay: index * 0.1, ease: "easeOut" }}
          key={item.label} 
          className="flex flex-1 flex-col items-center gap-2 group"
        >
          <div className="flex w-full flex-1 items-end relative">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs py-1 px-2 rounded-md whitespace-nowrap z-10 pointer-events-none">
              {formatNumber(item.value)}
            </div>
            <div
              className="w-full rounded-t-lg bg-gradient-to-t from-primary/40 to-primary/80 group-hover:from-primary/60 group-hover:to-primary transition-colors"
              style={{ height: `${Math.max((item.value / max) * 100, 4)}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

export default function BlockchainAnalyticsPage() {
  const [data, setData] = useState<BlockchainAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    blockchainService
      .getAnalytics()
      .then((response) => setData(response.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  const gasSeries = data?.charts.gasSpentOverTime ?? [];
  const txSeries = data?.charts.transactionsPerDay ?? [];
  const successSeries = data?.charts.successfulVsFailed ?? [];
  const contractSeries = data?.charts.gasByContract ?? [];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemAnim = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" asChild>
              <Link href="/admin/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">Blockchain Explorer</h1>
          </div>
          <p className="text-muted-foreground ml-10">Live Polygon network data, contracts, and node metrics.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={refresh} disabled={loading} className="rounded-xl shadow-sm">
            <Activity className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? "Syncing node..." : "Sync Node"}
          </Button>
        </div>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {/* Network Card */}
        <motion.div variants={itemAnim}>
          <Card className="h-full bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border-indigo-500/20 group">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Network</CardTitle>
                <div className="text-2xl font-bold mt-1 text-indigo-500 flex items-center gap-2">
                  Polygon <Badge text="Testnet" />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500 group-hover:scale-110 transition-transform"><Network className="h-6 w-6" /></div>
            </CardHeader>
            <CardContent className="space-y-3 mt-4">
              <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Chain ID</span>
                <span className="font-mono font-medium">{data?.network.chainId ?? "-"}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                <span className="text-muted-foreground">RPC Provider</span>
                <span className="font-mono text-xs truncate max-w-[120px]" title={data?.network.rpc}>{data?.network.rpc ?? "-"}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Server Wallet</span>
                <span className="font-mono text-xs truncate max-w-[120px]" title={data?.network.wallet ?? undefined}>{data?.network.wallet ?? "Not connected"}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Gas Card */}
        <motion.div variants={itemAnim}>
          <Card className="h-full bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-amber-500/20 group">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Gas Analytics</CardTitle>
                <div className="text-2xl font-bold mt-1 text-amber-500">{formatNumber(data?.gasAnalytics.totalGasUsed ?? 0)} <span className="text-sm">GWEI</span></div>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform"><Fuel className="h-6 w-6" /></div>
            </CardHeader>
            <CardContent className="space-y-3 mt-4">
              <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Average Gas</span>
                <span className="font-mono font-medium">{formatNumber(data?.gasAnalytics.averageGas ?? 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Highest Gas</span>
                <span className="font-mono font-medium">{formatNumber(data?.gasAnalytics.highestGas ?? 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Today's Usage</span>
                <span className="font-mono font-medium text-amber-500">{formatNumber(data?.gasAnalytics.todayGas ?? 0)}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Transaction Card */}
        <motion.div variants={itemAnim}>
          <Card className="h-full bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-500/20 group">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Transactions</CardTitle>
                <div className="text-2xl font-bold mt-1 text-emerald-500">{formatNumber(data?.transactionAnalytics.totalTransactions ?? 0)} <span className="text-sm">TOTAL</span></div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform"><ActivitySquare className="h-6 w-6" /></div>
            </CardHeader>
            <CardContent className="space-y-3 mt-4">
              <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                <span className="text-muted-foreground flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500"/> Successful</span>
                <span className="font-mono font-medium">{formatNumber(data?.transactionAnalytics.successful ?? 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                <span className="text-muted-foreground flex items-center gap-1"><XCircle className="w-3 h-3 text-destructive"/> Failed</span>
                <span className="font-mono font-medium">{formatNumber(data?.transactionAnalytics.failed ?? 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground flex items-center gap-1"><Server className="w-3 h-3 text-blue-500"/> Pending</span>
                <span className="font-mono font-medium">{formatNumber(data?.transactionAnalytics.pending ?? 0)}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Wallet Card */}
        <motion.div variants={itemAnim}>
          <Card className="h-full bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border-blue-500/20 group">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Master Wallet</CardTitle>
                <div className="text-2xl font-bold mt-1 text-blue-500">{(data?.wallet.balanceMatic ?? 0).toFixed(4)} <span className="text-sm">MATIC</span></div>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform"><Box className="h-6 w-6" /></div>
            </CardHeader>
            <CardContent className="space-y-3 mt-4">
              <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Address</span>
                <span className="font-mono text-xs flex items-center gap-1 truncate max-w-[100px]" title={data?.wallet.address ?? undefined}>
                  {data?.wallet.address?.substring(0, 8)}... <Copy className="w-3 h-3 cursor-pointer hover:text-foreground" />
                </span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Network</span>
                <span className="font-medium">{data?.wallet.network ?? "Polygon"}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Explorer</span>
                {data?.wallet.explorerUrl ? (
                  <a className="text-primary hover:underline flex items-center gap-1 font-medium" href={data.wallet.explorerUrl} target="_blank" rel="noreferrer">
                    View on Scan <ExternalLink className="w-3 h-3" />
                  </a>
                ) : <span className="text-muted-foreground">-</span>}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-6 xl:grid-cols-2">
        <motion.div variants={itemAnim}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Fuel className="w-5 h-5 text-amber-500" /> Gas Spent Over Time</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? <div className="h-32 bg-muted rounded-xl animate-pulse" /> : <Sparkline values={gasSeries.map((item) => item.value)} />}
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={itemAnim}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ActivitySquare className="w-5 h-5 text-emerald-500" /> Transactions per Day</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <div className="h-48 bg-muted rounded-xl animate-pulse" /> : <BarChart items={txSeries.slice(-7)} />}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <motion.div variants={itemAnim}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileCode className="w-5 h-5 text-indigo-500" /> Deployed Smart Contracts</CardTitle>
              <CardDescription>Track gas usage and interactions for MedSync contracts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {(data?.smartContracts ?? []).map((contract) => (
                <div key={contract.address} className="rounded-xl border border-border/50 bg-muted/20 p-5 hover:border-primary/50 transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 pb-4 mb-4">
                    <div>
                      <div className="font-heading font-semibold text-lg text-foreground">{contract.name}</div>
                      <div className="text-sm text-muted-foreground font-mono mt-1 flex items-center gap-2">
                        <Link2 className="w-3 h-3" /> {contract.address}
                      </div>
                    </div>
                    <Badge text={contract.status} active={contract.status === "Active"} />
                  </div>
                  <div className="grid gap-4 text-sm md:grid-cols-4">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Total Calls</span>
                      <span className="font-semibold text-base">{formatNumber(contract.totalCalls)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Gas Spent</span>
                      <span className="font-semibold text-base">{formatNumber(contract.gasSpent)}</span>
                    </div>
                    <div className="flex flex-col col-span-2 sm:col-span-1">
                      <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Last Sync</span>
                      <span className="font-medium text-foreground">{contract.lastInteraction}</span>
                    </div>
                    <div className="flex items-center sm:justify-end mt-2 sm:mt-0">
                      <Button variant="outline" size="sm" asChild className="rounded-full">
                        <a href={contract.explorerUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1">
                          Verify <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {(!data?.smartContracts || data.smartContracts.length === 0) && !loading && (
                <div className="py-10 text-center text-muted-foreground border border-dashed rounded-xl">
                  No contracts deployed yet.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={itemAnim}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Network className="w-5 h-5 text-blue-500" /> Recent Blockchain Activity</CardTitle>
              <CardDescription>Live feed of on-chain operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pr-2 overflow-y-auto max-h-[600px] custom-scrollbar">
              {(data?.recentActivity ?? []).slice(0, 20).map((tx) => (
                <a key={tx.hash} href={tx.explorerUrl} target="_blank" rel="noreferrer" className="block rounded-xl border border-transparent p-4 hover:border-border/50 hover:bg-muted/30 transition-all group">
                  <div className="flex items-center justify-between gap-2 text-sm mb-2">
                    <span className="font-mono font-medium text-primary flex items-center gap-2">
                      {tx.shortHash} <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                    <Badge text={tx.status} active={tx.status === "Success"} />
                  </div>
                  <div className="text-xs text-muted-foreground font-medium mb-1 truncate">{tx.contract}</div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                    <span className="text-xs font-semibold bg-secondary px-2 py-1 rounded-md">{tx.method}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Fuel className="w-3 h-3" /> {formatNumber(tx.gasUsed)}</span>
                  </div>
                </a>
              ))}
              {(!data?.recentActivity || data.recentActivity.length === 0) && !loading && (
                <div className="py-10 text-center text-muted-foreground">
                  No recent activity found.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}

function Badge({ text, active = true }: { text: string, active?: boolean }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
      {text}
    </span>
  )
}
