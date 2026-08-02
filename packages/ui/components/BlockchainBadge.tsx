"use client";

import React from 'react';
import { ShieldCheck, ShieldAlert, Clock, Info } from 'lucide-react';
import { Badge } from "./badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

export type BlockchainStatus = 'SYNCED' | 'CONFIRMED' | 'PENDING' | 'FAILED' | 'REVERTED' | 'SUBMITTED' | 'CONFIRMING' | 'RETRYING';

interface BlockchainBadgeProps {
  status: BlockchainStatus;
  txHash?: string;
  showText?: boolean;
}

export function BlockchainBadge({ status, txHash, showText = true }: BlockchainBadgeProps) {
  let icon = <Info className="w-3 h-3 mr-1" />;
  let color = "bg-gray-100 text-gray-800";
  let label: string = status;
  let tooltip = "Blockchain Status";

  switch (status) {
    case 'SYNCED':
    case 'CONFIRMED':
      icon = <ShieldCheck className="w-3 h-3 mr-1" />;
      color = "bg-green-100 text-green-800 border-green-200";
      label = "Verified";
      tooltip = "Immutable Record. Secured by Blockchain.";
      break;
    case 'PENDING':
    case 'SUBMITTED':
    case 'CONFIRMING':
    case 'RETRYING':
      icon = <Clock className="w-3 h-3 mr-1" />;
      color = "bg-blue-100 text-blue-800 border-blue-200";
      label = "Securing...";
      tooltip = "Transaction is being confirmed on the blockchain.";
      break;
    case 'FAILED':
    case 'REVERTED':
      icon = <ShieldAlert className="w-3 h-3 mr-1" />;
      color = "bg-red-100 text-red-800 border-red-200";
      label = "Unverified";
      tooltip = "Failed to secure on blockchain.";
      break;
  }

  const badgeContent = (
    <Badge variant="outline" className={`${color} flex items-center w-fit`}>
      {icon}
      {showText && <span>{label}</span>}
    </Badge>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {txHash ? (
            <a 
              href={`https://amoy.polygonscan.com/tx/${txHash}`} 
              target="_blank" 
              rel="noreferrer"
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              {badgeContent}
            </a>
          ) : (
            <div className="cursor-help">{badgeContent}</div>
          )}
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
          {txHash && <p className="text-xs font-mono mt-1 text-muted-foreground">{txHash.slice(0, 8)}...{txHash.slice(-6)}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
