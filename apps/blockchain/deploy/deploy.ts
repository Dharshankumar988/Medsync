import { HardhatRuntimeEnvironment } from "hardhat/types";
import { validateEnvironment } from "./utils/envValidation";
import { saveMetadata, DeploymentRecord, getContractAddress } from "./utils/metadata";
import { exportABIs } from "./utils/abiExport";
import { verifyContract } from "./utils/verification";

const CONTRACTS_TO_DEPLOY = [
  "AuditTrail",
  "PatientRegistry",
  "DoctorRegistry",
  "PharmacyRegistry",
  "MedicalRecordRegistry",
  "PrescriptionRegistry"
];

export async function runDeployment(hre: HardhatRuntimeEnvironment) {
  validateEnvironment(hre);

  console.log(`\nStarting deployment on network: ${hre.network.name}`);
  const [deployer] = await hre.ethers.getSigners();
  
  if (!deployer) {
    throw new Error("No deployer account found");
  }

  console.log(`Deployer address: ${deployer.address}`);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${hre.ethers.formatEther(balance)} ETH`);

  const deployedContracts: { name: string; address: string }[] = [];

  for (const contractName of CONTRACTS_TO_DEPLOY) {
    const existingAddress = getContractAddress(hre.network.name, contractName);
    if (existingAddress) {
      const code = await hre.ethers.provider.getCode(existingAddress);
      if (code !== "0x" && code !== "") {
        console.log(`\n--- Reusing existing deployment for ${contractName} at ${existingAddress} ---`);
        deployedContracts.push({ name: contractName, address: existingAddress });
        continue;
      } else {
        console.log(`\n--- Found address ${existingAddress} for ${contractName} but no bytecode. Redeploying... ---`);
      }
    }

    console.log(`\n--- Deploying ${contractName} ---`);
    const ContractFactory = await hre.ethers.getContractFactory(contractName);
    const contract = await ContractFactory.deploy();
    
    await contract.waitForDeployment();
    
    const address = await contract.getAddress();
    const tx = contract.deploymentTransaction();
    
    if (!tx) {
      throw new Error(`Failed to get deployment transaction for ${contractName}`);
    }

    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error(`Failed to get transaction receipt for ${contractName}`);
    }

    console.log(`${contractName} deployed at: ${address}`);
    console.log(`Transaction Hash: ${tx.hash}`);
    console.log(`Block Number: ${receipt.blockNumber}`);
    
    const record: DeploymentRecord = {
      contractName,
      address,
      version: 1, // Basic versioning
      timestamp: new Date().toISOString(),
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      deployer: deployer.address,
      network: hre.network.name,
      chainId: Number(hre.network.config.chainId || 31337)
    };

    await saveMetadata(hre, record);
    deployedContracts.push({ name: contractName, address });

    // Assuming constructors have no arguments, but if they do, capture them.
    // For MedSync registries inheriting BaseRegistry, constructor has 0 args.
    const constructorArgs: any[] = [];
    
    // Trigger verification in background/after delay
    // We await it here so logs are sequential.
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
      await verifyContract(hre, address, constructorArgs);
    }
  }

  console.log("\n--- Exporting ABIs ---");
  await exportABIs(hre, CONTRACTS_TO_DEPLOY);

  console.log("\n--- Deployment Summary ---");
  console.table(deployedContracts);
  console.log("Deployment completed successfully.");
}
