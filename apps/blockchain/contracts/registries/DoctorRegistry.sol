// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../core/BaseRegistry.sol";
import "../interfaces/IDoctorRegistry.sol";

/**
 * @title DoctorRegistry
 * @dev Maintains blockchain identities and verification for doctors.
 */
contract DoctorRegistry is BaseRegistry, IDoctorRegistry {
    mapping(bytes32 => Doctor) public doctors;

    function registerDoctor(bytes32 doctorHash, bytes32 licenseHash, bytes32 hospitalHash, address wallet) external onlyBackend whenNotPaused nonReentrant {
        if (doctorHash == bytes32(0) || licenseHash == bytes32(0) || hospitalHash == bytes32(0)) revert Errors.InvalidHash();
        if (wallet == address(0)) revert Errors.ZeroAddress();
        if (doctors[doctorHash].createdTimestamp != 0) revert Errors.EntityAlreadyExists(doctorHash);

        doctors[doctorHash] = Doctor({
            licenseHash: licenseHash,
            hospitalHash: hospitalHash,
            wallet: wallet,
            createdTimestamp: uint40(block.timestamp),
            updatedTimestamp: uint40(block.timestamp),
            isVerified: false,
            isActive: true
        });

        emit DoctorRegistered(doctorHash, licenseHash, wallet, block.timestamp);
    }

    function verifyDoctor(bytes32 doctorHash) external onlyBackend whenNotPaused nonReentrant {
        if (doctors[doctorHash].createdTimestamp == 0) revert Errors.EntityNotFound(doctorHash);
        if (doctors[doctorHash].isVerified) revert Errors.EntityAlreadyVerified(doctorHash);

        doctors[doctorHash].isVerified = true;
        doctors[doctorHash].updatedTimestamp = uint40(block.timestamp);

        emit DoctorVerified(doctorHash, block.timestamp);
    }

    function suspendDoctor(bytes32 doctorHash) external onlyBackend whenNotPaused nonReentrant {
        if (doctors[doctorHash].createdTimestamp == 0) revert Errors.EntityNotFound(doctorHash);
        if (!doctors[doctorHash].isActive) revert Errors.EntityNotActive(doctorHash);

        doctors[doctorHash].isActive = false;
        doctors[doctorHash].updatedTimestamp = uint40(block.timestamp);

        emit DoctorSuspended(doctorHash, block.timestamp);
    }

    function reactivateDoctor(bytes32 doctorHash) external onlyBackend whenNotPaused nonReentrant {
        if (doctors[doctorHash].createdTimestamp == 0) revert Errors.EntityNotFound(doctorHash);
        if (doctors[doctorHash].isActive) revert Errors.EntityAlreadyExists(doctorHash);

        doctors[doctorHash].isActive = true;
        doctors[doctorHash].updatedTimestamp = uint40(block.timestamp);

        emit DoctorReactivated(doctorHash, block.timestamp);
    }

    function updateAffiliation(bytes32 doctorHash, bytes32 newHospitalHash) external onlyBackend whenNotPaused nonReentrant {
        if (newHospitalHash == bytes32(0)) revert Errors.InvalidHash();
        if (doctors[doctorHash].createdTimestamp == 0) revert Errors.EntityNotFound(doctorHash);

        doctors[doctorHash].hospitalHash = newHospitalHash;
        doctors[doctorHash].updatedTimestamp = uint40(block.timestamp);

        emit DoctorAffiliationUpdated(doctorHash, newHospitalHash, block.timestamp);
    }

    function getDoctor(bytes32 doctorHash) external view returns (Doctor memory) {
        if (doctors[doctorHash].createdTimestamp == 0) revert Errors.EntityNotFound(doctorHash);
        return doctors[doctorHash];
    }
}
