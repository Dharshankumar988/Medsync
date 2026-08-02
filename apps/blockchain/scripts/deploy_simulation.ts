import { ethers } from "hardhat";

async function main() {
  console.log("Starting MedSync Local Deployment Simulation...");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);

  // Deploy PatientRegistry
  const PatientRegistry = await ethers.getContractFactory("PatientRegistry");
  const patientRegistry = await PatientRegistry.deploy();
  await patientRegistry.waitForDeployment();
  console.log(`PatientRegistry deployed to: ${await patientRegistry.getAddress()}`);

  // Deploy DoctorRegistry
  const DoctorRegistry = await ethers.getContractFactory("DoctorRegistry");
  const doctorRegistry = await DoctorRegistry.deploy();
  await doctorRegistry.waitForDeployment();
  console.log(`DoctorRegistry deployed to: ${await doctorRegistry.getAddress()}`);

  // Deploy PrescriptionRegistry
  const PrescriptionRegistry = await ethers.getContractFactory("PrescriptionRegistry");
  const prescriptionRegistry = await PrescriptionRegistry.deploy();
  await prescriptionRegistry.waitForDeployment();
  console.log(`PrescriptionRegistry deployed to: ${await prescriptionRegistry.getAddress()}`);

  // Deploy MedicalRecordRegistry
  const MedicalRecordRegistry = await ethers.getContractFactory("MedicalRecordRegistry");
  const medicalRecordRegistry = await MedicalRecordRegistry.deploy();
  await medicalRecordRegistry.waitForDeployment();
  console.log(`MedicalRecordRegistry deployed to: ${await medicalRecordRegistry.getAddress()}`);

  // Deploy PharmacyRegistry
  const PharmacyRegistry = await ethers.getContractFactory("PharmacyRegistry");
  const pharmacyRegistry = await PharmacyRegistry.deploy();
  await pharmacyRegistry.waitForDeployment();
  console.log(`PharmacyRegistry deployed to: ${await pharmacyRegistry.getAddress()}`);

  // Deploy AuditTrail
  const AuditTrail = await ethers.getContractFactory("AuditTrail");
  const auditTrail = await AuditTrail.deploy();
  await auditTrail.waitForDeployment();
  console.log(`AuditTrail deployed to: ${await auditTrail.getAddress()}`);

  console.log("Local deployment simulation completed successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
