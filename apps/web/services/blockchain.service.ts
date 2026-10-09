import api from "@/lib/api";

export type BlockchainAnalyticsResponse = {
  network: {
    name: string;
    chainId: number;
    rpc: string;
    connected: boolean;
    wallet: string | null;
  };
  smartContracts: Array<{
    name: string;
    address: string;
    status: string;
    lastInteraction: string;
    totalCalls: number;
    gasSpent: number;
    explorerUrl: string;
  }>;
  gasAnalytics: {
    totalGasUsed: number;
    averageGas: number;
    highestGas: number;
    lowestGas: number;
    todayGas: number;
    thisWeekGas: number;
    thisMonthGas: number;
  };
  transactionAnalytics: {
    totalTransactions: number;
    successful: number;
    failed: number;
    pending: number;
    averageConfirmationTime: number;
  };
  contractStatistics: Array<{
    name: string;
    address: string;
    status: string;
    lastInteraction: string;
    totalCalls: number;
    gasSpent: number;
    explorerUrl: string;
  }>;
  charts: {
    gasSpentOverTime: Array<{ label: string; value: number }>;
    transactionsPerDay: Array<{ label: string; value: number }>;
    successfulVsFailed: Array<{ label: string; value: number }>;
    gasByContract: Array<{ label: string; value: number }>;
  };
  recentActivity: Array<{
    hash: string;
    shortHash: string;
    contract: string;
    method: string;
    gasUsed: number;
    timestamp: string;
    status: string;
    explorerUrl: string;
  }>;
  wallet: {
    address: string | null;
    balanceWei: number;
    balanceMatic: number;
    network: string;
    explorerUrl: string | null;
  };
  explorerBaseUrl: string;
};

export type BlockchainVerifyResult = {
  verified: boolean;
  status: "FINALIZED" | "CONFIRMED" | "PENDING" | "REVERTED" | "ACTIVE" | "NOT_FOUND" | "UNVERIFIED" | string;
  item_type: "TRANSACTION" | "CONTRACT" | "ADDRESS" | "PRESCRIPTION" | "RECORD" | "PHARMACY" | "UNKNOWN" | string;
  identifier: string;
  network: string;
  chain_id: number;
  block_number?: number | null;
  confirmations?: number | null;
  gas_used?: number | null;
  gas_price_gwei?: number | null;
  from_address?: string | null;
  to_address?: string | null;
  contract_name?: string | null;
  contract_address?: string | null;
  wallet_address?: string | null;
  explorer_url?: string | null;
  contract_explorer_url?: string | null;
  timestamp?: string | null;
  title?: string | null;
  subtitle?: string | null;
  details?: Record<string, any> | null;
  error_message?: string | null;
};

export const blockchainService = {
  getAnalytics: async () => {
    const response = await api.get("/api/v1/blockchain/analytics");
    return response.data as { data: BlockchainAnalyticsResponse };
  },

  verifyHash: async (identifier: string): Promise<BlockchainVerifyResult> => {
    try {
      const response = await api.get(`/api/v1/blockchain/verify-hash/${encodeURIComponent(identifier)}`);
      return response.data.data;
    } catch (err: any) {
      return {
        verified: false,
        status: "NOT_FOUND",
        item_type: identifier.startsWith("0x") && identifier.length === 66 ? "TRANSACTION" : "UNKNOWN",
        identifier,
        network: "Polygon Amoy Testnet",
        chain_id: 80002,
        explorer_url: identifier.startsWith("0x") ? `https://amoy.polygonscan.com/tx/${identifier}` : null,
        error_message: err.response?.data?.detail || err.message || "Failed to reach blockchain node for verification"
      };
    }
  },

  getTransaction: async (txHash: string): Promise<BlockchainVerifyResult> => {
    try {
      const response = await api.get(`/api/v1/blockchain/tx/${encodeURIComponent(txHash)}`);
      return response.data.data;
    } catch (err: any) {
      return {
        verified: false,
        status: "NOT_FOUND",
        item_type: "TRANSACTION",
        identifier: txHash,
        network: "Polygon Amoy Testnet",
        chain_id: 80002,
        explorer_url: `https://amoy.polygonscan.com/tx/${txHash}`,
        error_message: err.response?.data?.detail || err.message || "Transaction not found on ledger"
      };
    }
  }
};

