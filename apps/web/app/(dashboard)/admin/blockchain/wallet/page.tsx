"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Wallet, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function WalletManagement() {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const res = await api.get("/api/v1/blockchain/wallet");
        setWallet(res.data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchWallet();
  }, []);

  if (loading) {
    return <div className="animate-pulse h-64 bg-muted rounded-xl"></div>;
  }

  const isHealthy = wallet?.status === "healthy";
  const estimatedTx = wallet?.balance_eth ? Math.floor(wallet.balance_eth / 0.0005) : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wallet Management</h1>
          <p className="text-muted-foreground mt-1">Monitor the backend hot wallet used for dispatching smart contract transactions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm col-span-1 md:col-span-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Wallet Address</p>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-xl md:text-3xl font-bold font-mono text-primary break-all">{wallet?.address}</p>
            <a href={`https://amoy.polygonscan.com/address/${wallet?.address}`} target="_blank" rel="noreferrer" className="px-3 py-1 bg-muted hover:bg-muted/80 rounded-md text-xs font-semibold shrink-0">
              View Explorer ↗
            </a>
          </div>
        </div>
        
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2"><Wallet className="w-4 h-4" /> Native Token Balance</p>
          <p className="text-4xl font-bold mt-4">{wallet?.balance_eth?.toFixed(4)} POL</p>
          <div className={`mt-4 flex items-center gap-2 text-sm font-medium ${isHealthy ? 'text-emerald-500' : 'text-red-500'}`}>
            {isHealthy ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            {isHealthy ? 'Balance Sufficient' : 'Low Balance Warning'}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transaction Nonce</p>
              <p className="text-2xl font-bold mt-1 font-mono">{wallet?.nonce?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Estimated Tx Capacity</p>
              <p className="text-xl font-bold mt-1">~{estimatedTx.toLocaleString()} transactions</p>
              <p className="text-xs text-muted-foreground mt-1">Based on avg 0.0005 POL per tx.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
