import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import "./tasks"; // Import custom tasks

dotenv.config();

const polygonAmoyRpcUrl = process.env.POLYGON_AMOY_RPC_URL || "";
const polygonMainnetRpcUrl = process.env.POLYGON_RPC_URL || "";
const deployPrivateKey = process.env.BACKEND_PRIVATE_KEY || process.env.PRIVATE_KEY || "";
const polygonscanApiKey = process.env.POLYGONSCAN_API_KEY || "";

// Ensure a valid private key is provided for networks that need it, else fallback to a dummy to allow compilation
const accounts = deployPrivateKey ? [deployPrivateKey] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    amoy: {
      url: polygonAmoyRpcUrl,
      accounts: accounts,
      chainId: 80002,
    },
    polygon: {
      url: polygonMainnetRpcUrl,
      accounts: accounts,
      chainId: 137,
    },
  },
  etherscan: {
    apiKey: {
      polygonAmoy: polygonscanApiKey,
      polygon: polygonscanApiKey,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true" || true,
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
