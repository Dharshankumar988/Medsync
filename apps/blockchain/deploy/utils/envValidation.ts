import { HardhatRuntimeEnvironment } from "hardhat/types";

export function validateEnvironment(hre: HardhatRuntimeEnvironment) {
  const network = hre.network.name;

  console.log(`\nValidating environment for network: ${network}...`);

  if (network === "hardhat" || network === "localhost") {
    console.log("Local environment validation passed.");
    return;
  }

  const { url, accounts } = hre.network.config as any;

  if (!url) {
    throw new Error(`Missing RPC URL for network ${network}. Please check your environment variables.`);
  }

  if (!accounts || accounts.length === 0) {
    throw new Error(`Missing deployer private key for network ${network}. Please check your environment variables.`);
  }

  const etherscanConfig = hre.config.etherscan as any;
  const networkEtherscanName = network === 'amoy' ? 'polygonAmoy' : network;

  const apiKey = typeof etherscanConfig?.apiKey === 'object' 
    ? etherscanConfig.apiKey[networkEtherscanName] 
    : etherscanConfig?.apiKey;

  if (!apiKey) {
    console.warn(`[WARNING] Missing Etherscan API key for ${network}. Verification will fail.`);
  }

  console.log("Environment validation passed.");
}
