import fs from "fs";
import path from "path";
import { HardhatRuntimeEnvironment } from "hardhat/types";

export interface DeploymentRecord {
  contractName: string;
  address: string;
  version: number;
  timestamp: string;
  transactionHash: string;
  blockNumber: number;
  deployer: string;
  network: string;
  chainId: number;
}

export async function saveMetadata(hre: HardhatRuntimeEnvironment, record: DeploymentRecord) {
  const network = hre.network.name;
  const deploymentsDir = path.join(__dirname, "../../deployments", network);

  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save specific contract deployment file
  const contractFilePath = path.join(deploymentsDir, `${record.contractName}.json`);
  fs.writeFileSync(contractFilePath, JSON.stringify(record, null, 2));

  // Update contract-addresses.json
  const addressesFilePath = path.join(deploymentsDir, "contract-addresses.json");
  let addresses: any = {};
  if (fs.existsSync(addressesFilePath)) {
    addresses = JSON.parse(fs.readFileSync(addressesFilePath, "utf8"));
  }
  
  addresses[record.contractName] = record.address;
  fs.writeFileSync(addressesFilePath, JSON.stringify(addresses, null, 2));

  // Update Backend .env
  const backendEnvPath = path.join(__dirname, "../../../backend/.env");
  if (fs.existsSync(backendEnvPath)) {
    let envContent = fs.readFileSync(backendEnvPath, "utf8");
    const regex = new RegExp(`^${record.contractName.toUpperCase()}_ADDRESS=.*$`, "m");
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${record.contractName.toUpperCase()}_ADDRESS=${record.address}`);
    } else {
      envContent += `\n${record.contractName.toUpperCase()}_ADDRESS=${record.address}`;
    }
    fs.writeFileSync(backendEnvPath, envContent);
  }

  // Update Web .env.local
  const webEnvPath = path.join(__dirname, "../../../web/.env.local");
  if (fs.existsSync(webEnvPath)) {
    let envContent = fs.readFileSync(webEnvPath, "utf8");
    
    // Add both NEXT_PUBLIC_ and non-prefixed for safety
    const envKey = `${record.contractName.toUpperCase()}_ADDRESS`;
    const nextKey = `NEXT_PUBLIC_${envKey}`;
    
    if (new RegExp(`^${envKey}=.*$`, "m").test(envContent)) {
      envContent = envContent.replace(new RegExp(`^${envKey}=.*$`, "m"), `${envKey}=${record.address}`);
    } else {
      envContent += `\n${envKey}=${record.address}`;
    }
    
    if (new RegExp(`^${nextKey}=.*$`, "m").test(envContent)) {
      envContent = envContent.replace(new RegExp(`^${nextKey}=.*$`, "m"), `${nextKey}=${record.address}`);
    } else {
      envContent += `\n${nextKey}=${record.address}`;
    }
    
    fs.writeFileSync(webEnvPath, envContent);
  }

  console.log(`Metadata for ${record.contractName} saved and .env files updated.`);
}

export function getContractAddress(network: string, contractName: string): string | null {
  const addressesFilePath = path.join(__dirname, "../../deployments", network, "contract-addresses.json");
  if (fs.existsSync(addressesFilePath)) {
    const addresses = JSON.parse(fs.readFileSync(addressesFilePath, "utf8"));
    return addresses[contractName] || null;
  }
  return null;
}
