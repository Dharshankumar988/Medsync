"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./card";
import { BlockchainBadge } from "./BlockchainBadge";
import api from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { Skeleton } from './skeleton';

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
    <Card className="col-span-4 lg:col-span-4 h-full">
      <CardHeader>
        <CardTitle>Blockchain Audit History</CardTitle>
        <CardDescription>Immutable record of your clinical events.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-3 w-[100px]" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-3 w-[100px]" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-3 w-[100px]" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No immutable records found yet.
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium capitalize">{log.action.replace(/_/g, ' ').toLowerCase()}</p>
                  <p className="text-sm text-muted-foreground capitalize">{log.entity_type.replace(/_/g, ' ').toLowerCase()}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleDateString()}
                  </span>
                  <BlockchainBadge 
                    status={log.status as any} 
                    txHash={log.transaction_hash} 
                    showText={false}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
