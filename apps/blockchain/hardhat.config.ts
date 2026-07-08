import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const polygonRpcUrl = process.env.POLYGON_AMOY_RPC_URL || process.env.POLYGON_RPC_URL || "";
const deployPrivateKey = process.env.BACKEND_PRIVATE_KEY || process.env.PRIVATE_KEY || "";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    hardhat: {},
    amoy: {
      url: polygonRpcUrl,
      accounts: deployPrivateKey ? [deployPrivateKey] : []
    }
  }
};

export default config;
