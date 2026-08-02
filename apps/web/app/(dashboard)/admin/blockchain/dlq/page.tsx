"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { ArchiveX, RefreshCw, AlertCircle } from "lucide-react";

export default function DLQManagement() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [replaying, setReplaying] = useState<string | null>(null);

  const fetchDLQ = useCallback(async () => {
    try {
      const res = await api.get(`/api/v1/blockchain/queue/events?status=DLQ&page=${page}&size=20`);
      setEvents(res.data.data.items || []);
      setTotalPages(res.data.data.pages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchDLQ();
  }, [fetchDLQ]);

  const handleReplay = async (eventId: string) => {
    try {
      setReplaying(eventId);
      await api.post(`/api/v1/blockchain/queue/replay/${eventId}`);
      // Remove from list or refresh
      fetchDLQ();
    } catch (e) {
      console.error(e);
      alert("Failed to replay event.");
    } finally {
      setReplaying(null);
    }
  };

  const handleReplayAll = async () => {
    if (!confirm("Are you sure you want to replay all events in the DLQ?")) return;
    try {
      await api.post("/api/v1/blockchain/queue/replay-all");
      fetchDLQ();
      alert("All DLQ events scheduled for replay.");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-red-500"><ArchiveX className="w-6 h-6" /> Dead Letter Queue</h1>
          <p className="text-muted-foreground mt-1">Manage events that failed processing after maximum retries.</p>
        </div>
        {events.length > 0 && (
          <button 
            onClick={handleReplayAll}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
          >
            Replay All
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-red-500/20 bg-card shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-red-500/5">
            <tr>
              <th className="px-5 py-3 font-medium text-muted-foreground">Event</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Contract</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Error Reason</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Retries</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Date</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center"><div className="animate-pulse h-4 w-24 bg-muted mx-auto rounded"></div></td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center text-muted-foreground">
                  <CheckCircleEmptyState />
                </td>
              </tr>
            ) : (
              events.map((evt) => (
                <tr key={evt.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4 font-semibold">{evt.event_name}</td>
                  <td className="px-5 py-4 font-medium">{evt.contract_name}</td>
                  <td className="px-5 py-4 font-mono text-xs text-red-500 max-w-xs truncate" title={evt.error_message}>
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    {evt.error_message || "Unknown error"}
                  </td>
                  <td className="px-5 py-4">{evt.retry_count}</td>
                  <td className="px-5 py-4 text-muted-foreground">{evt.created_at ? new Date(evt.created_at).toLocaleString() : "—"}</td>
                  <td className="px-5 py-4">
                    <button 
                      onClick={() => handleReplay(evt.id)}
                      disabled={replaying === evt.id}
                      className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-md text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${replaying === evt.id ? 'animate-spin' : ''}`} />
                      Replay
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {events.length > 0 && (
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
      )}
    </div>
  );
}

function CheckCircleEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className="bg-emerald-500/10 p-3 rounded-full">
        <ArchiveX className="w-8 h-8 text-emerald-500" />
      </div>
      <p className="font-medium text-foreground">DLQ is empty</p>
      <p className="text-sm">All events have been processed successfully.</p>
    </div>
  );
}
