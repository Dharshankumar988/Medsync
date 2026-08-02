"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { FileCode2, Search } from "lucide-react";

export default function SmartContractsList() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const res = await api.get("/api/v1/blockchain/contracts");
        setContracts(res.data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchContracts();
  }, []);

  const filteredContracts = contracts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><FileCode2 className="w-6 h-6 text-primary" /> Smart Contracts</h1>
          <p className="text-muted-foreground mt-1">Manage and inspect all deployed smart contracts in the MedSync network.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or address..."
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
              <th className="px-5 py-3 font-medium text-muted-foreground">Contract Name</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Version</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Address</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Health</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center"><div className="animate-pulse h-4 w-24 bg-muted mx-auto rounded"></div></td>
              </tr>
            ) : filteredContracts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No contracts found.</td>
              </tr>
            ) : (
              filteredContracts.map((c) => (
                <tr key={c.name} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4 font-semibold">{c.name}</td>
                  <td className="px-5 py-4 text-muted-foreground">v{c.version}</td>
                  <td className="px-5 py-4 font-mono text-xs text-primary">{c.address}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                      {c.health}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/admin/blockchain/contracts/${c.name}`}
                      className="text-primary hover:underline font-medium text-sm"
                    >
                      View Details →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
