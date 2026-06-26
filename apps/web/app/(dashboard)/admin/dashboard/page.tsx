"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { blockchainService, type BlockchainAnalyticsResponse } from "@/services/blockchain.service";

export default function AdminDashboardPage() {
  const [data, setData] = useState<BlockchainAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    blockchainService
      .getAnalytics()
      .then((response) => setData(response.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Operational overview for MedSync administrators.</p>
        </div>
        <Button asChild>
          <Link href="/admin/blockchain">Open Blockchain Analytics</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Blockchain</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{loading ? "Loading..." : data?.network.connected ? "Connected" : "Disconnected"}</div>
            <p className="text-sm text-muted-foreground">Polygon Amoy network status.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{loading ? "Loading..." : `${data?.wallet.balanceMatic?.toFixed(4) ?? "0.0000"} MATIC`}</div>
            <p className="text-sm text-muted-foreground break-all">{data?.wallet.address || "No server wallet configured"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{loading ? "Loading..." : data?.transactionAnalytics.totalTransactions ?? 0}</div>
            <p className="text-sm text-muted-foreground">Recent on-chain activity from Polygon RPC.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
