import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("AuditTrail", function () {
  async function deployAuditTrailFixture() {
    const [owner, backend, unauthorized] = await ethers.getSigners();

    const AuditTrail = await ethers.getContractFactory("AuditTrail");
    const registry = await AuditTrail.deploy();

    const BACKEND_ROLE = ethers.id("BACKEND_ROLE");
    await registry.grantRole(BACKEND_ROLE, backend.address);

    return { registry, owner, backend, unauthorized, BACKEND_ROLE };
  }

  describe("Core Functions", function () {
    const eventType = ethers.id("USER_REGISTERED");
    const entityHash = ethers.id("entity1");

    it("Should allow BACKEND_ROLE to log an event", async function () {
      const { registry, backend } = await loadFixture(deployAuditTrailFixture);

      await expect(registry.connect(backend).logEvent(eventType, entityHash))
        .to.emit(registry, "AuditEventLogged")
        .withArgs(eventType, entityHash, backend.address, (val: any) => val > 0);
    });

    it("Should revert if unauthorized user logs an event", async function () {
      const { registry, unauthorized } = await loadFixture(deployAuditTrailFixture);

      await expect(registry.connect(unauthorized).logEvent(eventType, entityHash))
        .to.be.revertedWithCustomError(registry, "Unauthorized");
    });

    it("Should revert if invalid hash is provided", async function () {
      const { registry, backend } = await loadFixture(deployAuditTrailFixture);

      await expect(registry.connect(backend).logEvent(eventType, ethers.ZeroHash))
        .to.be.revertedWithCustomError(registry, "InvalidHash");
    });
  });
});
