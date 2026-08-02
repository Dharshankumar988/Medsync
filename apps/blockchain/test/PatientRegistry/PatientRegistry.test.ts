import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("PatientRegistry", function () {
  async function deployPatientRegistryFixture() {
    const [owner, backend, unauthorized, patientWallet] = await ethers.getSigners();

    const PatientRegistry = await ethers.getContractFactory("PatientRegistry");
    const registry = await PatientRegistry.deploy();

    // Default admin grants backend role automatically in the constructor
    // BACKEND_ROLE is keccak256("BACKEND_ROLE")
    const BACKEND_ROLE = ethers.id("BACKEND_ROLE");
    await registry.grantRole(BACKEND_ROLE, backend.address);

    return { registry, owner, backend, unauthorized, patientWallet, BACKEND_ROLE };
  }

  describe("Deployment", function () {
    it("Should grant DEFAULT_ADMIN_ROLE and BACKEND_ROLE to the deployer", async function () {
      const { registry, owner, BACKEND_ROLE } = await loadFixture(deployPatientRegistryFixture);
      const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
      expect(await registry.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await registry.hasRole(BACKEND_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Core Functions", function () {
    const patientHash = ethers.id("patient1");

    it("Should allow BACKEND_ROLE to register a patient", async function () {
      const { registry, backend, patientWallet } = await loadFixture(deployPatientRegistryFixture);

      await expect(registry.connect(backend).registerPatient(patientHash, patientWallet.address))
        .to.emit(registry, "PatientRegistered")
        .withArgs(patientHash, patientWallet.address, (val: any) => val > 0);

      const patient = await registry.getPatient(patientHash);
      expect(patient.wallet).to.equal(patientWallet.address);
      expect(patient.isVerified).to.be.false;
      expect(patient.isActive).to.be.true;
    });

    it("Should not allow unauthorized users to register a patient", async function () {
      const { registry, unauthorized, patientWallet } = await loadFixture(deployPatientRegistryFixture);

      await expect(registry.connect(unauthorized).registerPatient(patientHash, patientWallet.address))
        .to.be.revertedWithCustomError(registry, "Unauthorized");
    });

    it("Should revert if patient already exists", async function () {
      const { registry, backend, patientWallet } = await loadFixture(deployPatientRegistryFixture);
      await registry.connect(backend).registerPatient(patientHash, patientWallet.address);

      await expect(registry.connect(backend).registerPatient(patientHash, patientWallet.address))
        .to.be.revertedWithCustomError(registry, "EntityAlreadyExists");
    });

    it("Should allow BACKEND_ROLE to verify a patient", async function () {
      const { registry, backend, patientWallet } = await loadFixture(deployPatientRegistryFixture);
      await registry.connect(backend).registerPatient(patientHash, patientWallet.address);

      await expect(registry.connect(backend).verifyPatient(patientHash))
        .to.emit(registry, "PatientVerified")
        .withArgs(patientHash, (val: any) => val > 0);

      const patient = await registry.getPatient(patientHash);
      expect(patient.isVerified).to.be.true;
    });

    it("Should not allow verifying an already verified patient", async function () {
      const { registry, backend, patientWallet } = await loadFixture(deployPatientRegistryFixture);
      await registry.connect(backend).registerPatient(patientHash, patientWallet.address);
      await registry.connect(backend).verifyPatient(patientHash);

      await expect(registry.connect(backend).verifyPatient(patientHash))
        .to.be.revertedWithCustomError(registry, "EntityAlreadyVerified");
    });

    it("Should revert verifying non-existent patient", async function () {
      const { registry, backend } = await loadFixture(deployPatientRegistryFixture);
      await expect(registry.connect(backend).verifyPatient(patientHash))
        .to.be.revertedWithCustomError(registry, "EntityNotFound");
    });

    it("Should allow deactivating and reactivating a patient", async function () {
      const { registry, backend, patientWallet } = await loadFixture(deployPatientRegistryFixture);
      await registry.connect(backend).registerPatient(patientHash, patientWallet.address);

      await expect(registry.connect(backend).deactivatePatient(patientHash))
        .to.emit(registry, "PatientDeactivated");
      
      let patient = await registry.getPatient(patientHash);
      expect(patient.isActive).to.be.false;

      await expect(registry.connect(backend).reactivatePatient(patientHash))
        .to.emit(registry, "PatientReactivated");
      
      patient = await registry.getPatient(patientHash);
      expect(patient.isActive).to.be.true;
    });

    it("Should allow updating wallet", async function () {
      const { registry, backend, patientWallet, owner } = await loadFixture(deployPatientRegistryFixture);
      await registry.connect(backend).registerPatient(patientHash, patientWallet.address);

      await expect(registry.connect(backend).updateWallet(patientHash, owner.address))
        .to.emit(registry, "PatientWalletUpdated")
        .withArgs(patientHash, owner.address, (val: any) => val > 0);

      const patient = await registry.getPatient(patientHash);
      expect(patient.wallet).to.equal(owner.address);
    });
  });
});
