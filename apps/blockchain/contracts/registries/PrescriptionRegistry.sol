// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../core/BaseRegistry.sol";
import "../interfaces/IPrescriptionRegistry.sol";

/**
 * @title PrescriptionRegistry
 * @dev Maintains verified prescriptions on the blockchain.
 */
contract PrescriptionRegistry is BaseRegistry, IPrescriptionRegistry {
    mapping(bytes32 => Prescription) public prescriptions;

    function createPrescription(bytes32 prescriptionHash, bytes32 patientHash, bytes32 doctorHash) external onlyBackend whenNotPaused nonReentrant {
        if (prescriptionHash == bytes32(0) || patientHash == bytes32(0) || doctorHash == bytes32(0)) revert Errors.InvalidHash();
        if (prescriptions[prescriptionHash].timestamp != 0) revert Errors.EntityAlreadyExists(prescriptionHash);

        prescriptions[prescriptionHash] = Prescription({
            patientHash: patientHash,
            doctorHash: doctorHash,
            creator: msg.sender,
            timestamp: uint40(block.timestamp),
            version: 1,
            isRevoked: false,
            isVerified: false
        });

        emit PrescriptionCreated(prescriptionHash, patientHash, doctorHash, 1, block.timestamp);
    }

    function verifyPrescription(bytes32 prescriptionHash) external onlyBackend whenNotPaused nonReentrant {
        if (prescriptions[prescriptionHash].timestamp == 0) revert Errors.EntityNotFound(prescriptionHash);
        if (prescriptions[prescriptionHash].isRevoked) revert Errors.IsRevoked(prescriptionHash);
        if (prescriptions[prescriptionHash].isVerified) revert Errors.EntityAlreadyVerified(prescriptionHash);

        prescriptions[prescriptionHash].isVerified = true;

        emit PrescriptionVerified(prescriptionHash, block.timestamp);
    }

    function revokePrescription(bytes32 prescriptionHash) external onlyBackend whenNotPaused nonReentrant {
        if (prescriptions[prescriptionHash].timestamp == 0) revert Errors.EntityNotFound(prescriptionHash);
        if (prescriptions[prescriptionHash].isRevoked) revert Errors.IsRevoked(prescriptionHash);

        prescriptions[prescriptionHash].isRevoked = true;

        emit PrescriptionRevoked(prescriptionHash, block.timestamp);
    }

    function updateVersion(bytes32 oldPrescriptionHash, bytes32 newPrescriptionHash) external onlyBackend whenNotPaused nonReentrant {
        if (prescriptions[oldPrescriptionHash].timestamp == 0) revert Errors.EntityNotFound(oldPrescriptionHash);
        if (prescriptions[newPrescriptionHash].timestamp != 0) revert Errors.EntityAlreadyExists(newPrescriptionHash);
        if (prescriptions[oldPrescriptionHash].isRevoked) revert Errors.IsRevoked(oldPrescriptionHash);

        uint32 newVersion = prescriptions[oldPrescriptionHash].version + 1;

        // Clone metadata into new version
        prescriptions[newPrescriptionHash] = Prescription({
            patientHash: prescriptions[oldPrescriptionHash].patientHash,
            doctorHash: prescriptions[oldPrescriptionHash].doctorHash,
            creator: msg.sender,
            timestamp: uint40(block.timestamp),
            version: newVersion,
            isRevoked: false,
            isVerified: false
        });

        // Optionally revoke the old version to maintain strict linear history
        prescriptions[oldPrescriptionHash].isRevoked = true;

        emit PrescriptionVersionUpdated(oldPrescriptionHash, newPrescriptionHash, newVersion, block.timestamp);
    }

    function getPrescription(bytes32 prescriptionHash) external view returns (Prescription memory) {
        if (prescriptions[prescriptionHash].timestamp == 0) revert Errors.EntityNotFound(prescriptionHash);
        return prescriptions[prescriptionHash];
    }
}
