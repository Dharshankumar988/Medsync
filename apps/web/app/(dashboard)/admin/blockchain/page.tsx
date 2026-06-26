"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { blockchainService, type BlockchainAnalyticsResponse } from "@/services/blockchain.service";

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
    <svg viewBox="0 0 100 100" className="h-28 w-full">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" className="text-primary" />
    </svg>
  );
}

function BarChart({ items }: { items: Array<{ label: string; value: number }> }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="flex h-56 items-end gap-3">
      {items.map((item) => (
        <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md bg-primary/80"
              style={{ height: `${Math.max((item.value / max) * 100, 4)}%` }}
            />
          </div>
          <span className="text-[11px] text-muted-foreground">{item.label}</span>
        </div>
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Blockchain Analytics</h1>
          <p className="text-muted-foreground">Live Polygon RPC and wallet data for the MedSync admin panel.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={refresh} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
          <Button asChild>
            <Link href="/admin/dashboard">Back to Admin</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader><CardTitle>Network</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="font-semibold">Polygon</div>
            <div>Chain: {data?.network.chainId ?? "-"}</div>
            <div className="break-all">RPC: {data?.network.rpc ?? "-"}</div>
            <div className="break-all">Wallet: {data?.network.wallet ?? "Not connected"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Gas Analytics</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>Total Gas Used: {formatNumber(data?.gasAnalytics.totalGasUsed ?? 0)}</div>
            <div>Average Gas: {formatNumber(data?.gasAnalytics.averageGas ?? 0)}</div>
            <div>Highest Gas: {formatNumber(data?.gasAnalytics.highestGas ?? 0)}</div>
            <div>Today: {formatNumber(data?.gasAnalytics.todayGas ?? 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Transaction Analytics</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>Total: {formatNumber(data?.transactionAnalytics.totalTransactions ?? 0)}</div>
            <div>Successful: {formatNumber(data?.transactionAnalytics.successful ?? 0)}</div>
            <div>Failed: {formatNumber(data?.transactionAnalytics.failed ?? 0)}</div>
            <div>Pending: {formatNumber(data?.transactionAnalytics.pending ?? 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Wallet Information</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="break-all">{data?.wallet.address ?? "No wallet connected"}</div>
            <div>{(data?.wallet.balanceMatic ?? 0).toFixed(4)} MATIC</div>
            <div>Network: {data?.wallet.network ?? "Polygon"}</div>
            {data?.wallet.explorerUrl ? (
              <a className="text-primary underline" href={data.wallet.explorerUrl} target="_blank" rel="noreferrer">
                Explorer Link
              </a>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Gas Spent Over Time</CardTitle></CardHeader>
          <CardContent>{loading ? <div className="text-sm text-muted-foreground">Loading chart...</div> : <Sparkline values={gasSeries.map((item) => item.value)} />}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Transactions per Day</CardTitle></CardHeader>
          <CardContent>{loading ? <div className="text-sm text-muted-foreground">Loading chart...</div> : <BarChart items={txSeries.slice(-7)} />}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Successful vs Failed</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm">
              {successSeries.map((item) => (
                <div key={item.label} className="rounded-lg border p-4 flex-1">
                  <div className="text-muted-foreground">{item.label}</div>
                  <div className="text-2xl font-semibold">{formatNumber(item.value)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Gas by Contract</CardTitle></CardHeader>
          <CardContent>{loading ? <div className="text-sm text-muted-foreground">Loading chart...</div> : <BarChart items={contractSeries.slice(0, 6)} />}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader><CardTitle>Smart Contracts</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(data?.smartContracts ?? []).map((contract) => (
              <div key={contract.address} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{contract.name}</div>
                    <div className="text-sm text-muted-foreground break-all">{contract.address}</div>
                  </div>
                  <div className="text-sm">{contract.status}</div>
                </div>
                <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                  <div>Total Calls: {formatNumber(contract.totalCalls)}</div>
                  <div>Gas Spent: {formatNumber(contract.gasSpent)}</div>
                  <div>Last Interaction: {contract.lastInteraction}</div>
                  <a className="text-primary underline" href={contract.explorerUrl} target="_blank" rel="noreferrer">PolygonScan</a>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent Blockchain Activity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(data?.recentActivity ?? []).slice(0, 20).map((tx) => (
              <a key={tx.hash} href={tx.explorerUrl} target="_blank" rel="noreferrer" className="block rounded-lg border p-3 hover:bg-muted/40">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{tx.shortHash}</span>
                  <span>{tx.status}</span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground break-all">{tx.contract}</div>
                <div className="mt-1 text-xs text-muted-foreground">{tx.method} · Gas {formatNumber(tx.gasUsed)} · {tx.timestamp}</div>
              </a>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
