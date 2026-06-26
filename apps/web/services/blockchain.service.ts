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

export const blockchainService = {
  getAnalytics: async () => {
    const response = await api.get("/api/v1/blockchain/analytics");
    return response.data as { data: BlockchainAnalyticsResponse };
  },
};
