import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config({ path: "../apps/backend/.env" }); // Read from backend .env

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    amoy: {
      url: process.env.POLYGON_RPC_URL || "https://rpc-amoy.polygon.technology/",
      accounts: process.env.BACKEND_PRIVATE_KEY 
        ? [process.env.BACKEND_PRIVATE_KEY] 
        : [],
    },
  },
};

export default config;
