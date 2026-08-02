"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { BrowserProvider, JsonRpcSigner } from "ethers";

interface Web3ContextState {
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  error: string | null;
  signer: JsonRpcSigner | null;
  provider: BrowserProvider | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToPolygonAmoy: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextState | undefined>(undefined);

const POLYGON_AMOY_CHAIN_ID = 80002;
const POLYGON_AMOY_HEX_CHAIN_ID = `0x${POLYGON_AMOY_CHAIN_ID.toString(16)}`;

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const p = new BrowserProvider((window as any).ethereum);
      setProvider(p);

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          p.getSigner().then(setSigner).catch(console.error);
        } else {
          setAddress(null);
          setSigner(null);
        }
      };

      const handleChainChanged = (newChainIdHex: string) => {
        setChainId(parseInt(newChainIdHex, 16));
        window.location.reload();
      };

      (window as any).ethereum.on("accountsChanged", handleAccountsChanged);
      (window as any).ethereum.on("chainChanged", handleChainChanged);

      // Auto-connect if already authorized
      p.listAccounts().then((accounts) => {
        if (accounts.length > 0) {
          handleAccountsChanged([accounts[0].address]);
          p.getNetwork().then(n => setChainId(Number(n.chainId)));
        }
      });

      return () => {
        if ((window as any).ethereum?.removeListener) {
          (window as any).ethereum.removeListener("accountsChanged", handleAccountsChanged);
          (window as any).ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, []);

  const switchToPolygonAmoy = useCallback(async () => {
    if (!(window as any).ethereum) return;
    try {
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: POLYGON_AMOY_HEX_CHAIN_ID }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          await (window as any).ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: POLYGON_AMOY_HEX_CHAIN_ID,
                chainName: "Polygon Amoy Testnet",
                rpcUrls: ["https://rpc-amoy.polygon.technology/"],
                nativeCurrency: {
                  name: "MATIC",
                  symbol: "MATIC",
                  decimals: 18,
                },
                blockExplorerUrls: ["https://amoy.polygonscan.com/"],
              },
            ],
          });
        } catch (addError: any) {
          setError(addError.message || "Failed to add Polygon Amoy network");
        }
      } else {
        setError(switchError.message || "Failed to switch network");
      }
    }
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      setError("Please install MetaMask or another Web3 wallet.");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
        if (provider) {
          const s = await provider.getSigner();
          setSigner(s);
          const network = await provider.getNetwork();
          setChainId(Number(network.chainId));
          
          if (Number(network.chainId) !== POLYGON_AMOY_CHAIN_ID) {
             await switchToPolygonAmoy();
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet.");
    } finally {
      setIsConnecting(false);
    }
  }, [provider, switchToPolygonAmoy]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setSigner(null);
    setChainId(null);
    setError(null);
  }, []);

  const contextValue = useMemo(() => ({
    address,
    chainId,
    isConnecting,
    error,
    signer,
    provider,
    connect,
    disconnect,
    switchToPolygonAmoy
  }), [address, chainId, isConnecting, error, signer, provider, connect, disconnect, switchToPolygonAmoy]);

  return (
    <Web3Context.Provider value={contextValue}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
};
