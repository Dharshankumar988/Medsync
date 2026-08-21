"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./card";
import { BlockchainBadge } from "./BlockchainBadge";
import api from '@/lib/api';
import { ShieldCheck, Activity } from 'lucide-react';
import { Skeleton } from './skeleton';
import { cn } from '@/lib/utils';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  transaction_hash?: string;
  status: string;
  created_at: string;
}

export function AuditHistory() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAuditLogs() {
      try {
        const res = await api.get('/blockchain/audit?size=5');
        setLogs(res.data?.items || []);
      } catch (error) {
        console.error("Failed to load audit logs", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAuditLogs();
  }, []);

  return (
    <Card className="flex flex-col h-full rounded-2xl border border-border/60 bg-card/50">
      <CardHeader className="border-b border-border/40 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <CardTitle>Audit & Security Log</CardTitle>
        </div>
        <CardDescription>Immutable record of clinical and system events.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <div className="relative p-6 pt-4">
          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                <Activity className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="font-medium">No immutable records found</p>
              <p className="text-sm text-muted-foreground mt-1">Audit logs will appear here.</p>
            </div>
          ) : (
            <div className="space-y-6 before:absolute before:inset-0 before:ml-9 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/60 before:to-transparent">
              {logs.map((log, i) => {
                const statusStr = (log.status || "pending").toLowerCase();
                let dotColor = "bg-muted border-muted-foreground/30";
                
                if (statusStr === "confirmed" || statusStr === "success") {
                  dotColor = "bg-emerald-500 border-emerald-200 dark:border-emerald-900";
                } else if (statusStr === "failed" || statusStr === "error") {
                  dotColor = "bg-rose-500 border-rose-200 dark:border-rose-900";
                } else if (statusStr === "pending") {
                  dotColor = "bg-amber-500 border-amber-200 dark:border-amber-900";
                }

                return (
                  <div key={log.id || i} className="relative flex items-start group">
                    {/* Timeline Dot */}
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border-4 shrink-0 shadow-sm z-10 bg-background mr-4">
                      <div className={cn("w-2 h-2 rounded-full", dotColor)} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium capitalize text-foreground">
                            {log.action.replace(/_/g, ' ').toLowerCase()}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize mt-0.5">
                            {log.entity_type.replace(/_/g, ' ').toLowerCase()}
                          </p>
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
                          <span className="text-[11px] font-medium text-muted-foreground/70 tracking-wide uppercase">
                            {new Date(log.created_at).toLocaleString(undefined, {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                          <BlockchainBadge 
                            status={log.status as any} 
                            txHash={log.transaction_hash} 
                            showText={false}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
