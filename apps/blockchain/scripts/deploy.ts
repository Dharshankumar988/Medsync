import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy AuditLogger
  const AuditLogger = await ethers.getContractFactory("AuditLogger");
  const auditLogger = await AuditLogger.deploy();
  await auditLogger.waitForDeployment();
  console.log("AuditLogger deployed to:", await auditLogger.getAddress());

  // Deploy DoctorRegistry
  const DoctorRegistry = await ethers.getContractFactory("DoctorRegistry");
  const doctorRegistry = await DoctorRegistry.deploy();
  await doctorRegistry.waitForDeployment();
  console.log("DoctorRegistry deployed to:", await doctorRegistry.getAddress());

  // Deploy PharmacyRegistry
  const PharmacyRegistry = await ethers.getContractFactory("PharmacyRegistry");
  const pharmacyRegistry = await PharmacyRegistry.deploy();
  await pharmacyRegistry.waitForDeployment();
  console.log("PharmacyRegistry deployed to:", await pharmacyRegistry.getAddress());

  // Deploy MedicalRecordRegistry
  const MedicalRecordRegistry = await ethers.getContractFactory("MedicalRecordRegistry");
  const medicalRecordRegistry = await MedicalRecordRegistry.deploy();
  await medicalRecordRegistry.waitForDeployment();
  console.log("MedicalRecordRegistry deployed to:", await medicalRecordRegistry.getAddress());

  // Deploy PrescriptionRegistry
  const PrescriptionRegistry = await ethers.getContractFactory("PrescriptionRegistry");
  const prescriptionRegistry = await PrescriptionRegistry.deploy();
  await prescriptionRegistry.waitForDeployment();
  console.log("PrescriptionRegistry deployed to:", await prescriptionRegistry.getAddress());

  // Deploy ConsentManager
  const ConsentManager = await ethers.getContractFactory("ConsentManager");
  const consentManager = await ConsentManager.deploy();
  await consentManager.waitForDeployment();
  console.log("ConsentManager deployed to:", await consentManager.getAddress());

  // Note: For production, we'd explicitly grant the BACKEND_ROLE to a dedicated server wallet
  console.log("Deployment complete. Make sure to grant BACKEND_ROLE to your backend wallet!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
