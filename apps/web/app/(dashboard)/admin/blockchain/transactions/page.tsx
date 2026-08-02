"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { ListOrdered, Search, ExternalLink } from "lucide-react";

export default function TransactionsExplorer() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  const fetchTransactions = useCallback(async () => {
    try {
      // Assuming GET /api/v1/blockchain/transactions?page=1&size=20
      const res = await api.get(`/api/v1/blockchain/transactions?page=${page}&size=20`);
      setTransactions(res.data.data.items || []);
      setTotalPages(res.data.data.pages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchTransactions();
    // Auto refresh every 15s to keep dashboard feeling "live"
    const interval = setInterval(fetchTransactions, 15000);
    return () => clearInterval(interval);
  }, [fetchTransactions]);

  const filteredTransactions = search 
    ? transactions.filter(t => t.transaction_hash?.toLowerCase().includes(search.toLowerCase()) || t.contract_name?.toLowerCase().includes(search.toLowerCase()))
    : transactions;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><ListOrdered className="w-6 h-6 text-primary" /> Transactions</h1>
          <p className="text-muted-foreground mt-1">Explore all blockchain transactions dispatched by MedSync.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search hash or contract..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-5 py-3 font-medium text-muted-foreground">Tx Hash</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Contract</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Block</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Gas Used</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Explorer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center"><div className="animate-pulse h-4 w-24 bg-muted mx-auto rounded"></div></td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No transactions found.</td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => (
                <tr key={tx.transaction_hash} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs">{tx.transaction_hash?.slice(0, 16)}...</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      tx.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' : 
                      tx.status === 'FAILED' ? 'bg-red-500/10 text-red-600 border border-red-500/30' : 
                      'bg-yellow-500/10 text-yellow-600 border border-yellow-500/30'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-medium">{tx.contract_name || "Unknown"}</td>
                  <td className="px-5 py-4">{tx.block_number || "—"}</td>
                  <td className="px-5 py-4">{tx.gas_used?.toLocaleString() || "—"}</td>
                  <td className="px-5 py-4">
                    <a href={`https://amoy.polygonscan.com/tx/${tx.transaction_hash}`} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-xs font-semibold">
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center">
        <button 
          onClick={() => setPage(p => Math.max(1, p - 1))} 
          disabled={page === 1}
          className="px-4 py-2 border rounded-md text-sm font-medium disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
        <button 
          onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
          disabled={page === totalPages}
          className="px-4 py-2 border rounded-md text-sm font-medium disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
