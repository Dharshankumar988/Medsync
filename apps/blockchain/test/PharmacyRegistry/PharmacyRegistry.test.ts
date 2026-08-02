import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("PharmacyRegistry", function () {
  async function deployPharmacyRegistryFixture() {
    const [owner, backend, unauthorized, pharmacyOwner] = await ethers.getSigners();

    const PharmacyRegistry = await ethers.getContractFactory("PharmacyRegistry");
    const registry = await PharmacyRegistry.deploy();

    const BACKEND_ROLE = ethers.id("BACKEND_ROLE");
    await registry.grantRole(BACKEND_ROLE, backend.address);

    return { registry, owner, backend, unauthorized, pharmacyOwner, BACKEND_ROLE };
  }

  describe("Core Functions", function () {
    const pharmacyHash = ethers.id("pharmacy1");
    const licenseHash = ethers.id("license1");

    it("Should allow BACKEND_ROLE to register a pharmacy", async function () {
      const { registry, backend, pharmacyOwner } = await loadFixture(deployPharmacyRegistryFixture);

      await expect(registry.connect(backend).registerPharmacy(pharmacyHash, licenseHash, pharmacyOwner.address))
        .to.emit(registry, "PharmacyRegistered")
        .withArgs(pharmacyHash, licenseHash, pharmacyOwner.address, (val: any) => val > 0);

      const pharmacy = await registry.getPharmacy(pharmacyHash);
      expect(pharmacy.owner).to.equal(pharmacyOwner.address);
      expect(pharmacy.licenseHash).to.equal(licenseHash);
      expect(pharmacy.isVerified).to.be.false;
      expect(pharmacy.isSuspended).to.be.false;
    });

    it("Should revert if pharmacy already exists", async function () {
      const { registry, backend, pharmacyOwner } = await loadFixture(deployPharmacyRegistryFixture);
      await registry.connect(backend).registerPharmacy(pharmacyHash, licenseHash, pharmacyOwner.address);

      await expect(registry.connect(backend).registerPharmacy(pharmacyHash, licenseHash, pharmacyOwner.address))
        .to.be.revertedWithCustomError(registry, "EntityAlreadyExists");
    });

    it("Should allow verifying a pharmacy", async function () {
      const { registry, backend, pharmacyOwner } = await loadFixture(deployPharmacyRegistryFixture);
      await registry.connect(backend).registerPharmacy(pharmacyHash, licenseHash, pharmacyOwner.address);

      await expect(registry.connect(backend).verifyPharmacy(pharmacyHash))
        .to.emit(registry, "PharmacyVerified");

      const pharmacy = await registry.getPharmacy(pharmacyHash);
      expect(pharmacy.isVerified).to.be.true;
    });

    it("Should allow suspending and reactivating a pharmacy", async function () {
      const { registry, backend, pharmacyOwner } = await loadFixture(deployPharmacyRegistryFixture);
      await registry.connect(backend).registerPharmacy(pharmacyHash, licenseHash, pharmacyOwner.address);

      await expect(registry.connect(backend).suspendPharmacy(pharmacyHash))
        .to.emit(registry, "PharmacySuspended");
      
      let pharmacy = await registry.getPharmacy(pharmacyHash);
      expect(pharmacy.isSuspended).to.be.true;

      await expect(registry.connect(backend).reactivatePharmacy(pharmacyHash))
        .to.emit(registry, "PharmacyReactivated");
      
      pharmacy = await registry.getPharmacy(pharmacyHash);
      expect(pharmacy.isSuspended).to.be.false;
    });
  });
});
