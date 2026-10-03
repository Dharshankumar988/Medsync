"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { ListOrdered, Search, ExternalLink, Filter, CalendarDays, Key, Server, Tag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function TransactionsExplorer() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [contract, setContract] = useState("ALL");
  const [sort, setSort] = useState("latest");
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/v1/blockchain/transactions`, {
        params: { page, size: 20, search, status, contract, sort_by: sort }
      });
      setTransactions(res.data.data.items || []);
      setTotalPages(res.data.data.pages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, contract, sort]);

  useEffect(() => {
    fetchTransactions();
    const interval = setInterval(fetchTransactions, 15000);
    return () => clearInterval(interval);
  }, [fetchTransactions]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
      case 'FAILED': return 'bg-red-500/10 text-red-600 border-red-500/30';
      case 'PENDING': return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><ListOrdered className="w-6 h-6 text-primary" /> Transactions</h1>
          <p className="text-muted-foreground mt-1">Explore all blockchain transactions dispatched by MedSync.</p>
        </div>
        
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search hash or wallet address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            />
          </div>
          <select 
            value={status} 
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
          <select 
            value={contract} 
            onChange={(e) => { setContract(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="ALL">All Contracts</option>
            <option value="PatientRegistry">PatientRegistry</option>
            <option value="DoctorRegistry">DoctorRegistry</option>
            <option value="PharmacyRegistry">PharmacyRegistry</option>
            <option value="MedicalRecordRegistry">MedicalRecordRegistry</option>
            <option value="PrescriptionRegistry">PrescriptionRegistry</option>
            <option value="ConsentManagement">ConsentManagement</option>
          </select>
          <select 
            value={sort} 
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="latest">Latest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            Search
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="min-w-full text-left text-sm whitespace-nowrap">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-5 py-3 font-medium text-muted-foreground">Tx Hash</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Contract</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Block</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Timestamp</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center"><div className="animate-pulse h-4 w-24 bg-muted mx-auto rounded"></div></td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No transactions match your criteria.</td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.transaction_hash} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedTx(tx)}>
                  <td className="px-5 py-4 font-mono text-xs text-primary">{tx.transaction_hash?.slice(0, 16)}...</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getStatusBadge(tx.status)}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-medium">{tx.contract_name || "Unknown"}</td>
                  <td className="px-5 py-4 text-muted-foreground">{tx.block_number || "—"}</td>
                  <td className="px-5 py-4 text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <button className="text-primary hover:underline text-xs font-medium">Details</button>
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

      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" /> Transaction Details
            </DialogTitle>
            <DialogDescription>Detailed view of blockchain interaction.</DialogDescription>
          </DialogHeader>
          
          {selectedTx && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-muted/30 rounded-lg border">
                  <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1"><Server className="w-3 h-3" /> Network</p>
                  <p className="text-sm font-medium">{selectedTx.network}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg border">
                  <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1"><Tag className="w-3 h-3" /> Status</p>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border ${getStatusBadge(selectedTx.status)}`}>
                    {selectedTx.status}
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Transaction Hash</p>
                  <p className="text-sm font-mono break-all bg-muted p-2 rounded border">{selectedTx.transaction_hash}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">From Wallet</p>
                  <p className="text-sm font-mono break-all">{selectedTx.wallet_address || "System Default"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">To Contract</p>
                  <p className="text-sm font-mono break-all">{selectedTx.contract_name || "Unknown"} {selectedTx.contract_address ? `(${selectedTx.contract_address})` : ""}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Block Number</p>
                  <p className="text-sm">{selectedTx.block_number || "Pending"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Timestamp</p>
                  <p className="text-sm">{new Date(selectedTx.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Gas Used</p>
                  <p className="text-sm">{selectedTx.gas_used?.toLocaleString() || "0"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Value</p>
                  <p className="text-sm">0.0000 POL</p>
                </div>
              </div>

              {selectedTx.failure_reason && (
                <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30 text-red-600 text-sm mt-4">
                  <p className="font-semibold mb-1">Failure Reason</p>
                  <p>{selectedTx.failure_reason}</p>
                </div>
              )}

              {selectedTx.explorer_url && (
                <div className="pt-4 flex justify-end">
                  <a 
                    href={selectedTx.explorer_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 text-sm font-medium transition-colors"
                  >
                    View on Explorer <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
