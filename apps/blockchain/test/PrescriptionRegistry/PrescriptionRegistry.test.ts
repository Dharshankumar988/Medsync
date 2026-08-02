import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("PrescriptionRegistry", function () {
  async function deployPrescriptionRegistryFixture() {
    const [owner, backend, unauthorized, creator] = await ethers.getSigners();

    const PrescriptionRegistry = await ethers.getContractFactory("PrescriptionRegistry");
    const registry = await PrescriptionRegistry.deploy();

    const BACKEND_ROLE = ethers.id("BACKEND_ROLE");
    await registry.grantRole(BACKEND_ROLE, backend.address);

    return { registry, owner, backend, unauthorized, creator, BACKEND_ROLE };
  }

  describe("Core Functions", function () {
    const prescriptionHash = ethers.id("rx1");
    const patientHash = ethers.id("patient1");
    const doctorHash = ethers.id("doctor1");

    it("Should allow BACKEND_ROLE to create a prescription", async function () {
      const { registry, backend } = await loadFixture(deployPrescriptionRegistryFixture);

      await expect(registry.connect(backend).createPrescription(prescriptionHash, patientHash, doctorHash))
        .to.emit(registry, "PrescriptionCreated")
        .withArgs(prescriptionHash, patientHash, doctorHash, 1, (val: any) => val > 0);

      const rx = await registry.getPrescription(prescriptionHash);
      expect(rx.patientHash).to.equal(patientHash);
      expect(rx.doctorHash).to.equal(doctorHash);
      expect(rx.creator).to.equal(backend.address);
      expect(rx.version).to.equal(1);
      expect(rx.isRevoked).to.be.false;
      expect(rx.isVerified).to.be.false;
    });

    it("Should revert if prescription already exists", async function () {
      const { registry, backend } = await loadFixture(deployPrescriptionRegistryFixture);
      await registry.connect(backend).createPrescription(prescriptionHash, patientHash, doctorHash);

      await expect(registry.connect(backend).createPrescription(prescriptionHash, patientHash, doctorHash))
        .to.be.revertedWithCustomError(registry, "EntityAlreadyExists");
    });

    it("Should allow verifying a prescription", async function () {
      const { registry, backend } = await loadFixture(deployPrescriptionRegistryFixture);
      await registry.connect(backend).createPrescription(prescriptionHash, patientHash, doctorHash);

      await expect(registry.connect(backend).verifyPrescription(prescriptionHash))
        .to.emit(registry, "PrescriptionVerified");

      const rx = await registry.getPrescription(prescriptionHash);
      expect(rx.isVerified).to.be.true;
    });

    it("Should revert if verifying a revoked prescription", async function () {
      const { registry, backend } = await loadFixture(deployPrescriptionRegistryFixture);
      await registry.connect(backend).createPrescription(prescriptionHash, patientHash, doctorHash);
      await registry.connect(backend).revokePrescription(prescriptionHash);

      await expect(registry.connect(backend).verifyPrescription(prescriptionHash))
        .to.be.revertedWithCustomError(registry, "IsRevoked");
    });

    it("Should allow revoking a prescription", async function () {
      const { registry, backend } = await loadFixture(deployPrescriptionRegistryFixture);
      await registry.connect(backend).createPrescription(prescriptionHash, patientHash, doctorHash);

      await expect(registry.connect(backend).revokePrescription(prescriptionHash))
        .to.emit(registry, "PrescriptionRevoked");

      const rx = await registry.getPrescription(prescriptionHash);
      expect(rx.isRevoked).to.be.true;
    });

    it("Should allow updating prescription version", async function () {
      const { registry, backend } = await loadFixture(deployPrescriptionRegistryFixture);
      await registry.connect(backend).createPrescription(prescriptionHash, patientHash, doctorHash);

      const newPrescriptionHash = ethers.id("rx1_v2");

      await expect(registry.connect(backend).updateVersion(prescriptionHash, newPrescriptionHash))
        .to.emit(registry, "PrescriptionVersionUpdated")
        .withArgs(prescriptionHash, newPrescriptionHash, 2, (val: any) => val > 0);

      const newRx = await registry.getPrescription(newPrescriptionHash);
      expect(newRx.version).to.equal(2);
      expect(newRx.patientHash).to.equal(patientHash);
      expect(newRx.doctorHash).to.equal(doctorHash);
      expect(newRx.isRevoked).to.be.false;

      // Ensure old is revoked implicitly based on logic
      const oldRx = await registry.getPrescription(prescriptionHash);
      expect(oldRx.isRevoked).to.be.true;
    });

    it("Should revert updating from a revoked prescription", async function () {
      const { registry, backend } = await loadFixture(deployPrescriptionRegistryFixture);
      await registry.connect(backend).createPrescription(prescriptionHash, patientHash, doctorHash);
      await registry.connect(backend).revokePrescription(prescriptionHash);

      const newPrescriptionHash = ethers.id("rx1_v2");

      await expect(registry.connect(backend).updateVersion(prescriptionHash, newPrescriptionHash))
        .to.be.revertedWithCustomError(registry, "IsRevoked");
    });
  });
});
