"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { FileCode2, ArrowLeft, Terminal, ActivitySquare } from "lucide-react";

export default function ContractDetail() {
  const params = useParams();
  const router = useRouter();
  const contractName = params.name as string;
  
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContract = async () => {
      try {
        const res = await api.get(`/api/v1/blockchain/contracts/${contractName}`);
        setContract(res.data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchContract();
  }, [contractName]);

  if (loading) {
    return <div className="animate-pulse h-96 bg-muted rounded-xl"></div>;
  }

  if (!contract) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold">Contract Not Found</h2>
        <button onClick={() => router.back()} className="mt-4 text-primary hover:underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><FileCode2 className="w-6 h-6 text-primary" /> {contract.name}</h1>
          <a href={contract.explorer_url} target="_blank" rel="noreferrer" className="text-muted-foreground mt-1 font-mono text-sm hover:text-primary hover:underline transition-colors">{contract.address}</a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Network Balance</p>
          <p className="text-2xl font-bold mt-2 font-mono text-primary">{contract.balance || "0.0000 POL"}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transactions</p>
          <p className="text-2xl font-bold mt-2 font-mono">{contract.transaction_count ?? "0"}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between md:col-span-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Block Explorer</p>
          <a href={contract.explorer_url} target="_blank" rel="noreferrer" className="text-lg font-bold mt-2 text-primary hover:underline truncate">
            View on PolygonScan →
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-2">
            <ActivitySquare className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-sm uppercase tracking-wide">ABI Events</h3>
          </div>
          <div className="p-0 max-h-96 overflow-y-auto">
            <ul className="divide-y divide-border">
              {contract.events?.length === 0 && <li className="p-4 text-sm text-muted-foreground">No events found in ABI.</li>}
              {contract.events?.map((e: string) => (
                <li key={e} className="p-4 text-sm font-mono hover:bg-muted/10">{e}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Functions */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-500" />
            <h3 className="font-semibold text-sm uppercase tracking-wide">ABI Functions</h3>
          </div>
          <div className="p-0 max-h-96 overflow-y-auto">
            <ul className="divide-y divide-border">
              {contract.functions?.length === 0 && <li className="p-4 text-sm text-muted-foreground">No functions found in ABI.</li>}
              {contract.functions?.map((f: string) => (
                <li key={f} className="p-4 text-sm font-mono hover:bg-muted/10">{f}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      {contract.recent_transactions && contract.recent_transactions.length > 0 && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden mt-6">
          <div className="p-4 border-b border-border bg-muted/30">
            <h3 className="font-semibold text-sm uppercase tracking-wide">Recent Transactions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-muted/10 border-b border-border">
                <tr>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Tx Hash</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Block</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Time</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">From</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contract.recent_transactions.map((tx: any, idx: number) => {
                  const date = tx.time ? new Date(parseInt(tx.time) * 1000).toLocaleString() : "Unknown";
                  return (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4 font-mono text-xs text-primary truncate max-w-[150px]">
                        <a href={`https://amoy.polygonscan.com/tx/${tx.hash}`} target="_blank" rel="noreferrer" className="hover:underline">{tx.hash}</a>
                      </td>
                      <td className="px-5 py-4 text-xs font-mono">{tx.block}</td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{date}</td>
                      <td className="px-5 py-4 font-mono text-xs truncate max-w-[150px]">{tx.from}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
