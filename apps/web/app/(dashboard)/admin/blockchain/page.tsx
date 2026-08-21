"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@medsync/ui";
import { Shield, ShieldAlert, CheckCircle } from "lucide-react";
import { Skeleton, Badge } from "@medsync/ui";
import api from "@/lib/api";

export default function AdminBlockchain() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/admin/blockchain');
      setData(res.data.data);
    } catch (err) {
      console.error("Failed to fetch blockchain data", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Blockchain Integrity</h1>
        <p className="text-muted-foreground mt-2">Monitor smart contract logs, transactions, and integrity mismatches.</p>
      </div>

      {loading || !data ? <Skeleton className="h-96 w-full" /> : (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Network Status</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 p-6 border rounded-xl bg-emerald-500/10">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                  <div>
                    <p className="font-bold text-lg text-emerald-600">{data.status}</p>
                    <p className="text-sm text-muted-foreground">Ledger is synchronized</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Integrity Alerts</CardTitle></CardHeader>
              <CardContent>
                {data.mismatches === 0 ? (
                  <div className="flex items-center gap-4 p-6 border rounded-xl bg-muted/20">
                    <Shield className="h-8 w-8 text-muted-foreground opacity-50" />
                    <div>
                      <p className="font-bold text-lg text-muted-foreground">No mismatches detected</p>
                      <p className="text-sm text-muted-foreground">All anchored records match local hashes</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 p-6 border rounded-xl bg-red-500/10 text-red-600">
                    <ShieldAlert className="h-8 w-8" />
                    <div>
                      <p className="font-bold text-lg">{data.mismatches} Mismatches Detected</p>
                      <p className="text-sm opacity-80">Immediate review required.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.transactions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No recent transactions.</p>
                ) : (
                  data.transactions.map((tx: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-4 border rounded-xl hover:bg-muted/10 font-mono text-sm">
                      <div className="truncate max-w-[60%] text-primary">{tx.hash}</div>
                      <div className="flex gap-2">
                        <Badge variant="outline">{tx.network}</Badge>
                        <Badge className="bg-emerald-500">{tx.status}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
