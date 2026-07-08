"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

type BlockchainTask = {
  id: string;
  prescription_id: string;
  status: string;
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  created_at: string;
};

type AuditLog = {
  id: string;
  transaction_hash: string;
  block_number: number;
  gas_used: number;
  explorer_url: string;
  confirmation_time: string;
  prescription_id: string;
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-emerald-900/50 text-emerald-300 border-emerald-700/50",
  FAILED: "bg-red-900/50 text-red-300 border-red-700/50",
  PENDING: "bg-yellow-900/50 text-yellow-300 border-yellow-700/50",
  PROCESSING: "bg-blue-900/50 text-blue-300 border-blue-700/50",
  RETRYING: "bg-orange-900/50 text-orange-300 border-orange-700/50",
  CANCELLED: "bg-gray-800/50 text-gray-400 border-gray-700/50",
};

export default function BlockchainDashboard() {
  const [tasks, setTasks] = useState<BlockchainTask[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const taskRes = await api.get("/api/v1/blockchain/tasks");
      setTasks(taskRes.data.data.tasks);
      setStats({ ...taskRes.data.data.stats, success_rate: taskRes.data.data.success_rate });

      const logRes = await api.get("/api/v1/blockchain/logs");
      setLogs(logRes.data.data);
    } catch (e) {
      // Silently handle — dashboard will show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRetry = async (taskId: string) => {
    try {
      await api.post(`/api/v1/blockchain/tasks/${taskId}/retry`);
      fetchData();
    } catch (e) {
      // Handle silently
    }
  };

  const filteredTasks = searchId
    ? tasks.filter((t) => t.prescription_id.toLowerCase().includes(searchId.toLowerCase()))
    : tasks;

  const filteredLogs = searchId
    ? logs.filter((l) => l.prescription_id?.toLowerCase().includes(searchId.toLowerCase()))
    : logs;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Blockchain Audit Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Blockchain Audit Dashboard</h1>
        <input
          type="text"
          placeholder="Search by Prescription ID..."
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-72"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Success Rate</p>
          <p className="text-3xl font-bold text-emerald-500 mt-1">{stats.success_rate ?? 0}%</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending / Processing</p>
          <p className="text-3xl font-bold text-yellow-500 mt-1">{stats.PENDING ?? 0} / {stats.PROCESSING ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Confirmed</p>
          <p className="text-3xl font-bold text-blue-500 mt-1">{stats.CONFIRMED ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Failed</p>
          <p className="text-3xl font-bold text-red-500 mt-1">{stats.FAILED ?? 0}</p>
        </div>
      </div>

      {/* Tasks Queue */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Background Task Queue</h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-5 py-3 font-medium text-muted-foreground">Task ID</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Prescription ID</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Retries</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Created</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    No blockchain tasks found.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs">{t.id.slice(0, 8)}...</td>
                    <td className="px-5 py-3 font-mono text-xs">{t.prescription_id.slice(0, 12)}...</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[t.status] || STATUS_COLORS.PENDING}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{t.retry_count} / {t.max_retries}</td>
                    <td className="px-5 py-3 text-muted-foreground">{t.created_at ? new Date(t.created_at).toLocaleString() : "—"}</td>
                    <td className="px-5 py-3">
                      {(t.status === "FAILED" || t.status === "CANCELLED") && (
                        <button
                          onClick={() => handleRetry(t.id)}
                          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Logs */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Blockchain Audit Logs</h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-5 py-3 font-medium text-muted-foreground">Prescription ID</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Tx Hash</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Block</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Gas Used</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Confirmed At</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Explorer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    No audit logs yet. Logs appear after prescriptions are confirmed on-chain.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs">{log.prescription_id?.slice(0, 12) ?? "—"}...</td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{log.transaction_hash?.slice(0, 18) ?? "—"}...</td>
                    <td className="px-5 py-3">{log.block_number ?? "—"}</td>
                    <td className="px-5 py-3">{log.gas_used?.toLocaleString() ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{log.confirmation_time ? new Date(log.confirmation_time).toLocaleString() : "—"}</td>
                    <td className="px-5 py-3">
                      {log.explorer_url ? (
                        <a
                          href={log.explorer_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline text-xs font-medium"
                        >
                          View on PolygonScan ↗
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
