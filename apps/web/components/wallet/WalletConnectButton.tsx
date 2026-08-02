"use client";

import React from "react";
import { useWeb3 } from "@/context/Web3Context";
import { Button } from "@medsync/ui";
import { Loader2, Wallet, LogOut } from "lucide-react";

export function WalletConnectButton() {
  const { address, isConnecting, error, connect, disconnect } = useWeb3();

  if (address) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground hidden sm:block">
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>
        <Button variant="outline" onClick={disconnect} className="gap-2">
          <LogOut className="h-4 w-4" />
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {error && <span className="text-red-500 text-xs hidden sm:block">{error}</span>}
      <Button 
        onClick={connect} 
        disabled={isConnecting}
        className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all"
      >
        {isConnecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wallet className="h-4 w-4" />
        )}
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </Button>
    </div>
  );
}
