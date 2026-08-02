// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../core/BaseRegistry.sol";
import "../interfaces/IPharmacyRegistry.sol";

/**
 * @title PharmacyRegistry
 * @dev Maintains verified pharmacies.
 */
contract PharmacyRegistry is BaseRegistry, IPharmacyRegistry {
    mapping(bytes32 => Pharmacy) public pharmacies;

    function registerPharmacy(bytes32 pharmacyHash, bytes32 licenseHash, address owner) external onlyBackend whenNotPaused nonReentrant {
        if (pharmacyHash == bytes32(0)) revert Errors.InvalidHash();
        if (pharmacies[pharmacyHash].createdTimestamp != 0) revert Errors.EntityAlreadyExists(pharmacyHash);

        pharmacies[pharmacyHash] = Pharmacy({
            licenseHash: licenseHash,
            owner: owner,
            createdTimestamp: uint40(block.timestamp),
            updatedTimestamp: uint40(block.timestamp),
            isVerified: false,
            isSuspended: false
        });

        emit PharmacyRegistered(pharmacyHash, licenseHash, owner, block.timestamp);
    }

    function verifyPharmacy(bytes32 pharmacyHash) external onlyBackend whenNotPaused nonReentrant {
        if (pharmacies[pharmacyHash].createdTimestamp == 0) revert Errors.EntityNotFound(pharmacyHash);
        if (pharmacies[pharmacyHash].isVerified) revert Errors.EntityAlreadyVerified(pharmacyHash);

        pharmacies[pharmacyHash].isVerified = true;
        pharmacies[pharmacyHash].updatedTimestamp = uint40(block.timestamp);

        emit PharmacyVerified(pharmacyHash, block.timestamp);
    }

    function suspendPharmacy(bytes32 pharmacyHash) external onlyBackend whenNotPaused nonReentrant {
        if (pharmacies[pharmacyHash].createdTimestamp == 0) revert Errors.EntityNotFound(pharmacyHash);
        if (pharmacies[pharmacyHash].isSuspended) revert Errors.EntitySuspended(pharmacyHash);

        pharmacies[pharmacyHash].isSuspended = true;
        pharmacies[pharmacyHash].updatedTimestamp = uint40(block.timestamp);

        emit PharmacySuspended(pharmacyHash, block.timestamp);
    }

    function reactivatePharmacy(bytes32 pharmacyHash) external onlyBackend whenNotPaused nonReentrant {
        if (pharmacies[pharmacyHash].createdTimestamp == 0) revert Errors.EntityNotFound(pharmacyHash);
        if (!pharmacies[pharmacyHash].isSuspended) revert Errors.EntityAlreadyExists(pharmacyHash); // Means it's active

        pharmacies[pharmacyHash].isSuspended = false;
        pharmacies[pharmacyHash].updatedTimestamp = uint40(block.timestamp);

        emit PharmacyReactivated(pharmacyHash, block.timestamp);
    }

    function getPharmacy(bytes32 pharmacyHash) external view returns (Pharmacy memory) {
        if (pharmacies[pharmacyHash].createdTimestamp == 0) revert Errors.EntityNotFound(pharmacyHash);
        return pharmacies[pharmacyHash];
    }
}
