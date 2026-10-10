"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Badge } from "@medsync/ui";
import { 
  ShieldCheck, ShieldAlert, CheckCircle2, AlertTriangle, ExternalLink, 
  Copy, Check, Activity, Globe, Blocks, Zap, Clock, Hash, ArrowRight, 
  RefreshCw, Cpu, Layers, Link as LinkIcon
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { BlockchainVerifyResult } from "@/services/blockchain.service";

import { LedgerVerificationLoader } from "./LedgerVerificationLoader";

interface BlockchainVerificationCardProps {
  data: BlockchainVerifyResult | null;
  onScanAnother?: () => void;
  isLoading?: boolean;
}

export function BlockchainVerificationCard({ 
  data, 
  onScanAnother,
  isLoading = false 
}: BlockchainVerificationCardProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (isLoading || !data) {
    return (
      <LedgerVerificationLoader
        title="Verifying Distributed Ledger..."
        description="Querying active Polygon Amoy nodes and validating cryptographic consensus."
        identifier={data?.identifier}
        network="Polygon Amoy"
      />
    );
  }

  const isVerified = data.verified;
  const isNotFound = data.status === "NOT_FOUND";
  const isPending = data.status === "PENDING";
  const isReverted = data.status === "REVERTED";

  // Dynamic Theme Palette based on authentic ledger status
  const statusConfig = isVerified ? {
    border: "border-emerald-500/30 dark:border-emerald-500/40",
    gradient: "from-emerald-500/10 via-card to-card",
    glow: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    badgeBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    title: data.title || "Cryptographically Verified Record",
    description: "This record has a genuine cryptographic signature confirmed on the Polygon Amoy distributed ledger.",
    icon: <CheckCircle2 className="h-10 w-10 text-emerald-500" />
  } : isPending ? {
    border: "border-amber-500/30 dark:border-amber-500/40",
    gradient: "from-amber-500/10 via-card to-card",
    glow: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    badgeBg: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    title: "Transaction Pending Confirmation",
    description: "The transaction has been broadcasted and is awaiting required Amoy block confirmations.",
    icon: <RefreshCw className="h-10 w-10 text-amber-500 animate-spin" />
  } : isNotFound ? {
    border: "border-amber-500/30 dark:border-amber-500/40",
    gradient: "from-amber-500/5 via-card to-card",
    glow: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    badgeBg: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    title: "Ledger Record Not Found",
    description: data.error_message || "This hash or identifier was not found on the active Polygon Amoy testnet index.",
    icon: <ShieldAlert className="h-10 w-10 text-amber-500" />
  } : {
    border: "border-rose-500/30 dark:border-rose-500/40",
    gradient: "from-rose-500/10 via-card to-card",
    glow: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
    iconBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    badgeBg: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    title: "Verification Failed / Reverted",
    description: data.error_message || "The transaction execution reverted or failed on-chain consensus.",
    icon: <AlertTriangle className="h-10 w-10 text-rose-500" />
  };

  const formattedDate = data.timestamp ? (() => {
    try {
      const d = new Date(data.timestamp);
      return isNaN(d.getTime()) ? data.timestamp : d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch {
      return data.timestamp;
    }
  })() : null;

  return (
    <Card className={`rounded-3xl border shadow-xl overflow-hidden relative max-w-xl mx-auto bg-gradient-to-b ${statusConfig.gradient} ${statusConfig.border} transition-all duration-300`}>
      {/* Top Ledger Banner */}
      <div className={`h-1.5 w-full ${isVerified ? 'bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400' : isNotFound || isPending ? 'bg-amber-500' : 'bg-rose-500'}`} />

      <CardHeader className="text-center pt-8 pb-4 px-4 sm:px-8">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={`mx-auto h-20 w-20 sm:h-24 sm:w-24 rounded-2xl flex items-center justify-center mb-4 shadow-md ${statusConfig.iconBg} relative`}
        >
          {statusConfig.icon}
        </motion.div>

        <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          {statusConfig.title}
        </CardTitle>
        <CardDescription className="text-sm sm:text-base mt-2 max-w-md mx-auto text-muted-foreground leading-relaxed">
          {statusConfig.description}
        </CardDescription>

        {/* Network & Chain ID Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
          <Badge variant="outline" className="px-3 py-1 text-xs font-medium border-border/80 bg-background/60 backdrop-blur-sm flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-primary" />
            {data.network || "Polygon Amoy Testnet"}
          </Badge>
          <Badge variant="outline" className="px-2.5 py-1 text-xs font-mono border-border/80 bg-background/60 backdrop-blur-sm">
            Chain ID: {data.chain_id || 80002}
          </Badge>
          <Badge className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider ${statusConfig.badgeBg}`}>
            {data.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-4 sm:px-8 pb-8 space-y-5">
        {/* Key Metrics Grid - Adaptive 2-column or 1-column on mobile */}
        {(data.block_number || data.confirmations || data.gas_used || formattedDate) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 bg-muted/20 dark:bg-muted/10 p-4 rounded-2xl border border-border/50 text-left">
            {data.block_number && (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-background/70 border border-border/40">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Blocks className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">Block Height</span>
                  <span className="text-sm font-bold font-mono text-foreground truncate block">
                    #{data.block_number.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {data.confirmations !== undefined && data.confirmations !== null && (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-background/70 border border-border/40">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Layers className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">Confirmations</span>
                  <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate block">
                    {data.confirmations > 0 ? `${data.confirmations.toLocaleString()} Blocks` : "1 Block (Recent)"}
                  </span>
                </div>
              </div>
            )}

            {data.gas_used && (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-background/70 border border-border/40">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                  <Zap className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">Gas Used</span>
                  <span className="text-sm font-bold font-mono text-foreground truncate block">
                    {data.gas_used.toLocaleString()} units
                    {data.gas_price_gwei ? ` • ${data.gas_price_gwei} Gwei` : ""}
                  </span>
                </div>
              </div>
            )}

            {formattedDate && (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-background/70 border border-border/40">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">Timestamp</span>
                  <span className="text-xs font-medium text-foreground truncate block" title={formattedDate}>
                    {formattedDate}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Detailed Entity / Contract Mapping */}
        <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-border/60 shadow-sm space-y-3.5">
          {data.contract_name && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/40 gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-primary" /> Smart Contract
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-semibold text-primary border-primary/30">
                  {data.contract_name}
                </Badge>
                {data.contract_address && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs font-mono px-2"
                    onClick={() => handleCopy(data.contract_address!, "Contract Address")}
                  >
                    {data.contract_address.slice(0, 6)}...{data.contract_address.slice(-4)}
                    {copiedKey === "Contract Address" ? <Check className="ml-1.5 h-3 w-3 text-emerald-600" /> : <Copy className="ml-1.5 h-3 w-3 text-muted-foreground" />}
                  </Button>
                )}
              </div>
            </div>
          )}

          {data.from_address && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/40 gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Signer / From</span>
              <div className="flex items-center justify-between sm:justify-end gap-2">
                <span className="font-mono text-xs text-foreground truncate max-w-[200px] sm:max-w-[260px]">
                  {data.from_address}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 shrink-0" 
                  onClick={() => handleCopy(data.from_address!, "Signer Address")}
                >
                  {copiedKey === "Signer Address" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                </Button>
              </div>
            </div>
          )}

          {data.to_address && !data.contract_name && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/40 gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contract / To</span>
              <div className="flex items-center justify-between sm:justify-end gap-2">
                <span className="font-mono text-xs text-foreground truncate max-w-[200px] sm:max-w-[260px]">
                  {data.to_address}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 shrink-0" 
                  onClick={() => handleCopy(data.to_address!, "Recipient Address")}
                >
                  {copiedKey === "Recipient Address" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                </Button>
              </div>
            </div>
          )}

          {/* Identifier / Transaction Hash Display */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-primary" /> {data.item_type === "TRANSACTION" ? "Transaction Hash" : "Ledger Identifier"}
              </span>
              <span className="text-[11px] text-muted-foreground">SHA-256 / Keccak-256</span>
            </div>
            <div className="bg-muted/30 dark:bg-muted/20 rounded-xl p-2.5 sm:p-3 font-mono text-xs flex items-center justify-between border border-border/50 gap-2">
              <span className="truncate text-foreground font-medium select-all break-all">
                {data.identifier}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 shrink-0 hover:bg-background"
                onClick={() => handleCopy(data.identifier, "Identifier")}
                title="Copy hash"
              >
                {copiedKey === "Identifier" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Action Buttons - Adaptive full width and stacked */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          {data.explorer_url && (
            <a 
              href={data.explorer_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex-1"
            >
              <Button 
                variant="outline" 
                className="w-full h-12 rounded-xl border-primary/20 hover:bg-primary/5 text-primary font-semibold flex items-center justify-center gap-2"
              >
                View on PolygonScan <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          )}

          {onScanAnother && (
            <Button 
              onClick={onScanAnother} 
              className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold"
            >
              Scan Another Code <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
