import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("MedicalRecordRegistry", function () {
  async function deployMedicalRecordRegistryFixture() {
    const [owner, backend, unauthorized, uploader] = await ethers.getSigners();

    const MedicalRecordRegistry = await ethers.getContractFactory("MedicalRecordRegistry");
    const registry = await MedicalRecordRegistry.deploy();

    const BACKEND_ROLE = ethers.id("BACKEND_ROLE");
    await registry.grantRole(BACKEND_ROLE, backend.address);

    return { registry, owner, backend, unauthorized, uploader, BACKEND_ROLE };
  }

  describe("Core Functions", function () {
    const recordHash = ethers.id("record1");
    const patientHash = ethers.id("patient1");

    it("Should allow BACKEND_ROLE to register a record", async function () {
      const { registry, backend } = await loadFixture(deployMedicalRecordRegistryFixture);

      await expect(registry.connect(backend).registerRecord(recordHash, patientHash))
        .to.emit(registry, "RecordRegistered")
        .withArgs(recordHash, patientHash, backend.address, 1, (val: any) => val > 0);

      const record = await registry.getRecord(recordHash);
      expect(record.patientHash).to.equal(patientHash);
      expect(record.uploader).to.equal(backend.address);
      expect(record.version).to.equal(1);
      expect(record.isVerified).to.be.false;
    });

    it("Should revert if record already exists", async function () {
      const { registry, backend } = await loadFixture(deployMedicalRecordRegistryFixture);
      await registry.connect(backend).registerRecord(recordHash, patientHash);

      await expect(registry.connect(backend).registerRecord(recordHash, patientHash))
        .to.be.revertedWithCustomError(registry, "EntityAlreadyExists");
    });

    it("Should allow verifying a record", async function () {
      const { registry, backend } = await loadFixture(deployMedicalRecordRegistryFixture);
      await registry.connect(backend).registerRecord(recordHash, patientHash);

      await expect(registry.connect(backend).verifyRecord(recordHash))
        .to.emit(registry, "RecordVerified");

      const record = await registry.getRecord(recordHash);
      expect(record.isVerified).to.be.true;
    });

    it("Should revert if verifying a non-existent record", async function () {
      const { registry, backend } = await loadFixture(deployMedicalRecordRegistryFixture);
      await expect(registry.connect(backend).verifyRecord(recordHash))
        .to.be.revertedWithCustomError(registry, "EntityNotFound");
    });

    it("Should allow updating a record version", async function () {
      const { registry, backend } = await loadFixture(deployMedicalRecordRegistryFixture);
      await registry.connect(backend).registerRecord(recordHash, patientHash);

      const newRecordHash = ethers.id("record1_v2");

      await expect(registry.connect(backend).updateVersion(recordHash, newRecordHash))
        .to.emit(registry, "RecordVersionUpdated")
        .withArgs(recordHash, newRecordHash, 2, (val: any) => val > 0);

      const newRecord = await registry.getRecord(newRecordHash);
      expect(newRecord.version).to.equal(2);
      expect(newRecord.patientHash).to.equal(patientHash);
      expect(newRecord.uploader).to.equal(backend.address);
      expect(newRecord.isVerified).to.be.false;
    });
  });
});
