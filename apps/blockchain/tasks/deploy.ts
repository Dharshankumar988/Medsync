import { task } from "hardhat/config";
import { runDeployment } from "../deploy/deploy";
import { verifyContract } from "../deploy/utils/verification";
import { getContractAddress } from "../deploy/utils/metadata";

task("medsync:deploy", "Deploys all MedSync smart contracts")
  .setAction(async (taskArgs, hre) => {
    await runDeployment(hre);
  });

task("medsync:verify", "Verifies all deployed MedSync contracts on Etherscan")
  .setAction(async (taskArgs, hre) => {
    const CONTRACTS_TO_DEPLOY = [
      "AuditTrail",
      "PatientRegistry",
      "DoctorRegistry",
      "PharmacyRegistry",
      "MedicalRecordRegistry",
      "PrescriptionRegistry"
    ];

    console.log(`Starting verification on ${hre.network.name}...`);
    for (const contractName of CONTRACTS_TO_DEPLOY) {
      const address = getContractAddress(hre.network.name, contractName);
      if (address) {
        await verifyContract(hre, address, []);
      } else {
        console.warn(`No address found for ${contractName} on ${hre.network.name}`);
      }
    }
    console.log("Verification process complete.");
  });
