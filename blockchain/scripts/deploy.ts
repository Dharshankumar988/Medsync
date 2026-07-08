import { ethers, artifacts } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Deploying MedicalRecordRegistry to Amoy Testnet...");

  const MedicalRecordRegistry = await ethers.getContractFactory("MedicalRecordRegistry");
  const registry = await MedicalRecordRegistry.deploy();

  await registry.waitForDeployment();
  const address = await registry.getAddress();
  
  console.log(`MedicalRecordRegistry deployed to: ${address}`);

  // Export ABI to Backend
  const artifact = await artifacts.readArtifact("MedicalRecordRegistry");
  const backendAbiPath = path.join(
    __dirname,
    "../../apps/backend/app/blockchain/abi"
  );
  
  if (!fs.existsSync(backendAbiPath)) {
    fs.mkdirSync(backendAbiPath, { recursive: true });
  }

  fs.writeFileSync(
    path.join(backendAbiPath, "MedicalRecordRegistry.json"),
    JSON.stringify(artifact.abi, null, 2)
  );

  console.log(`ABI exported to: ${backendAbiPath}/MedicalRecordRegistry.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
