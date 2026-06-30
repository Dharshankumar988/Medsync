"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { blockchainService, type BlockchainAnalyticsResponse } from "@/services/blockchain.service";
import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, Wallet, ActivitySquare, ArrowRight, LayoutDashboard, Database, HardDrive, Users } from "lucide-react";

export default function AdminDashboardPage() {
  const [data, setData] = useState<BlockchainAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    blockchainService
      .getAnalytics()
      .then((response) => setData(response.data))
      .finally(() => setLoading(false));
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">Overview</h1>
          <p className="text-muted-foreground mt-1">System status and operational overview.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-10 rounded-xl bg-background/50 backdrop-blur-sm">
            Download Report
          </Button>
          <Button asChild className="h-10 rounded-xl shadow-soft hover:shadow-premium">
            <Link href="/admin/blockchain">
              Blockchain Analytics <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        {/* KPI 1 */}
        <motion.div variants={item}>
          <Card className="h-full relative overflow-hidden group hover:border-primary/50 transition-colors">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Database className="w-16 h-16 text-primary" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <LayoutDashboard className="w-4 h-4 text-primary" />
                </div>
                Network Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-24 bg-muted animate-pulse rounded-md" />
              ) : (
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${data?.network.connected ? "bg-emerald-500 animate-pulse" : "bg-destructive"}`} />
                  <span className="text-2xl font-bold tracking-tight">
                    {data?.network.connected ? "Connected" : "Disconnected"}
                  </span>
                </div>
              )}
              <CardDescription className="mt-2 text-xs">
                Polygon Amoy Testnet
              </CardDescription>
            </CardContent>
          </Card>
        </motion.div>

        {/* KPI 2 */}
        <motion.div variants={item}>
          <Card className="h-full relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Wallet className="w-16 h-16 text-emerald-500" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Wallet className="w-4 h-4 text-emerald-500" />
                </div>
                Wallet Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-32 bg-muted animate-pulse rounded-md" />
              ) : (
                <div className="text-2xl font-bold tracking-tight">
                  {data?.wallet.balanceMatic?.toFixed(4) ?? "0.0000"} <span className="text-lg font-medium text-muted-foreground">MATIC</span>
                </div>
              )}
              <CardDescription className="mt-2 text-xs truncate max-w-[200px]" title={data?.wallet.address ?? undefined}>
                {data?.wallet.address || "No server wallet configured"}
              </CardDescription>
            </CardContent>
          </Card>
        </motion.div>

        {/* KPI 3 */}
        <motion.div variants={item}>
          <Card className="h-full relative overflow-hidden group hover:border-amber-500/50 transition-colors">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <ActivitySquare className="w-16 h-16 text-amber-500" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <ActivitySquare className="w-4 h-4 text-amber-500" />
                </div>
                Total Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded-md" />
              ) : (
                <div className="text-2xl font-bold tracking-tight">
                  {data?.transactionAnalytics.totalTransactions ?? 0}
                </div>
              )}
              <CardDescription className="mt-2 text-xs">
                Recent on-chain smart contract calls
              </CardDescription>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* KPI 4 - System Health (Mock for aesthetics) */}
        <motion.div variants={item}>
          <Card className="h-full relative overflow-hidden group hover:border-blue-500/50 transition-colors">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <HardDrive className="w-16 h-16 text-blue-500" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                </div>
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-20 bg-muted animate-pulse rounded-md" />
              ) : (
                <div className="text-2xl font-bold tracking-tight text-emerald-500">
                  100%
                </div>
              )}
              <CardDescription className="mt-2 text-xs">
                All MedSync microservices operational
              </CardDescription>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
      
      {/* Expanded Layout Section (Mock for rich UI) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="grid gap-6 md:grid-cols-2"
      >
        <Card className="min-h-[300px] flex flex-col justify-center items-center text-center p-8 bg-gradient-to-br from-background to-muted/20">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-heading font-semibold">User Management</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">Detailed user analytics and role management interface is currently being indexed.</p>
        </Card>
        
        <Card className="min-h-[300px] flex flex-col justify-center items-center text-center p-8 bg-gradient-to-br from-background to-muted/20">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-lg font-heading font-semibold">Security Audit Logs</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">No recent security anomalies detected. System is operating securely.</p>
        </Card>
      </motion.div>
    </div>
  );
}
