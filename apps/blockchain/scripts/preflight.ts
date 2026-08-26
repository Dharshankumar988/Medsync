import hre from "hardhat";
import { getContractAddress } from "../deploy/utils/metadata";

async function main() {
  console.log("Pre-flight checks starting...");
  console.log(`Network: ${hre.network.name}`);
  if (hre.network.name !== "amoy") {
    throw new Error("Network is not amoy");
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${hre.ethers.formatEther(balance)} POL`);

  const contractsToCheck = ["AuditTrail", "PatientRegistry", "DoctorRegistry", "PharmacyRegistry", "MedicalRecordRegistry", "PrescriptionRegistry"];
  for (const contractName of contractsToCheck) {
    const address = getContractAddress(hre.network.name, contractName);
    if (address) {
      const code = await hre.ethers.provider.getCode(address);
      if (code === "0x" || code === "") {
        console.error(`ERROR: Existing address ${address} for ${contractName} has NO bytecode!`);
        process.exitCode = 1;
        return;
      } else {
        console.log(`PASS: ${contractName} at ${address} has valid bytecode.`);
      }
    } else {
      console.log(`WARNING: ${contractName} not found in contract-addresses.json`);
    }
  }
  
  console.log("Pre-flight checks completed successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
