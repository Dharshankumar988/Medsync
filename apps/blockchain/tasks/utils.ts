import { task } from "hardhat/config";
import fs from "fs";
import path from "path";
import { exportABIs } from "../deploy/utils/abiExport";

task("medsync:show-contracts", "Displays all deployed contract addresses for the current network")
  .setAction(async (taskArgs, hre) => {
    const network = hre.network.name;
    const addressesFilePath = path.join(__dirname, "../../deployments", network, "contract-addresses.json");
    
    if (fs.existsSync(addressesFilePath)) {
      const addresses = JSON.parse(fs.readFileSync(addressesFilePath, "utf8"));
      console.log(`\nDeployed Contracts on ${network}:`);
      console.table(addresses);
    } else {
      console.log(`No deployments found for network: ${network}`);
    }
  });

task("medsync:export-abis", "Exports ABIs from artifacts")
  .setAction(async (taskArgs, hre) => {
    const CONTRACTS_TO_DEPLOY = [
      "AuditTrail",
      "PatientRegistry",
      "DoctorRegistry",
      "PharmacyRegistry",
      "MedicalRecordRegistry",
      "PrescriptionRegistry"
    ];
    await exportABIs(hre, CONTRACTS_TO_DEPLOY);
    console.log("ABIs exported to abis/ directory");
  });
