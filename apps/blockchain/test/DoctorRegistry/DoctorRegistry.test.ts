import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("DoctorRegistry", function () {
  async function deployDoctorRegistryFixture() {
    const [owner, backend, unauthorized, doctorWallet] = await ethers.getSigners();

    const DoctorRegistry = await ethers.getContractFactory("DoctorRegistry");
    const registry = await DoctorRegistry.deploy();

    const BACKEND_ROLE = ethers.id("BACKEND_ROLE");
    await registry.grantRole(BACKEND_ROLE, backend.address);

    return { registry, owner, backend, unauthorized, doctorWallet, BACKEND_ROLE };
  }

  describe("Core Functions", function () {
    const doctorHash = ethers.id("doctor1");
    const licenseHash = ethers.id("license1");
    const hospitalHash = ethers.id("hospital1");

    it("Should allow BACKEND_ROLE to register a doctor", async function () {
      const { registry, backend, doctorWallet } = await loadFixture(deployDoctorRegistryFixture);

      await expect(registry.connect(backend).registerDoctor(doctorHash, licenseHash, hospitalHash, doctorWallet.address))
        .to.emit(registry, "DoctorRegistered")
        .withArgs(doctorHash, licenseHash, doctorWallet.address, (val: any) => val > 0);

      const doctor = await registry.getDoctor(doctorHash);
      expect(doctor.wallet).to.equal(doctorWallet.address);
      expect(doctor.licenseHash).to.equal(licenseHash);
      expect(doctor.hospitalHash).to.equal(hospitalHash);
      expect(doctor.isVerified).to.be.false;
      expect(doctor.isActive).to.be.true;
    });

    it("Should not allow unauthorized users to register a doctor", async function () {
      const { registry, unauthorized, doctorWallet } = await loadFixture(deployDoctorRegistryFixture);

      await expect(registry.connect(unauthorized).registerDoctor(doctorHash, licenseHash, hospitalHash, doctorWallet.address))
        .to.be.revertedWithCustomError(registry, "Unauthorized");
    });

    it("Should allow verifying a doctor", async function () {
      const { registry, backend, doctorWallet } = await loadFixture(deployDoctorRegistryFixture);
      await registry.connect(backend).registerDoctor(doctorHash, licenseHash, hospitalHash, doctorWallet.address);

      await expect(registry.connect(backend).verifyDoctor(doctorHash))
        .to.emit(registry, "DoctorVerified")
        .withArgs(doctorHash, (val: any) => val > 0);

      const doctor = await registry.getDoctor(doctorHash);
      expect(doctor.isVerified).to.be.true;
    });

    it("Should revert when verifying a non-existent doctor", async function () {
      const { registry, backend } = await loadFixture(deployDoctorRegistryFixture);
      await expect(registry.connect(backend).verifyDoctor(doctorHash))
        .to.be.revertedWithCustomError(registry, "EntityNotFound");
    });

    it("Should revert when verifying an already verified doctor", async function () {
      const { registry, backend, doctorWallet } = await loadFixture(deployDoctorRegistryFixture);
      await registry.connect(backend).registerDoctor(doctorHash, licenseHash, hospitalHash, doctorWallet.address);
      await registry.connect(backend).verifyDoctor(doctorHash);

      await expect(registry.connect(backend).verifyDoctor(doctorHash))
        .to.be.revertedWithCustomError(registry, "EntityAlreadyVerified");
    });

    it("Should allow suspending and reactivating a doctor", async function () {
      const { registry, backend, doctorWallet } = await loadFixture(deployDoctorRegistryFixture);
      await registry.connect(backend).registerDoctor(doctorHash, licenseHash, hospitalHash, doctorWallet.address);

      await expect(registry.connect(backend).suspendDoctor(doctorHash))
        .to.emit(registry, "DoctorSuspended");
      
      let doctor = await registry.getDoctor(doctorHash);
      expect(doctor.isActive).to.be.false;

      await expect(registry.connect(backend).reactivateDoctor(doctorHash))
        .to.emit(registry, "DoctorReactivated");
      
      doctor = await registry.getDoctor(doctorHash);
      expect(doctor.isActive).to.be.true;
    });

    it("Should allow updating hospital affiliation", async function () {
      const { registry, backend, doctorWallet } = await loadFixture(deployDoctorRegistryFixture);
      await registry.connect(backend).registerDoctor(doctorHash, licenseHash, hospitalHash, doctorWallet.address);

      const newHospitalHash = ethers.id("hospital_new");
      await expect(registry.connect(backend).updateAffiliation(doctorHash, newHospitalHash))
        .to.emit(registry, "DoctorAffiliationUpdated")
        .withArgs(doctorHash, newHospitalHash, (val: any) => val > 0);

      const doctor = await registry.getDoctor(doctorHash);
      expect(doctor.hospitalHash).to.equal(newHospitalHash);
    });
  });
});
