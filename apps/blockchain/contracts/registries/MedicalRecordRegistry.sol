// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../core/BaseRegistry.sol";
import "../interfaces/IMedicalRecordRegistry.sol";

/**
 * @title MedicalRecordRegistry
 * @dev Maintains hashes for medical reports, imaging, lab reports.
 */
contract MedicalRecordRegistry is BaseRegistry, IMedicalRecordRegistry {
    mapping(bytes32 => MedicalRecord) public records;
    mapping(bytes32 => mapping(bytes32 => bool)) public accessGrants; // recordHash => doctorHash => hasAccess

    event AccessGranted(bytes32 indexed recordHash, bytes32 indexed doctorHash, uint256 timestamp);
    event AccessRevoked(bytes32 indexed recordHash, bytes32 indexed doctorHash, uint256 timestamp);

    function registerRecord(bytes32 recordHash, bytes32 patientHash) external onlyBackend whenNotPaused nonReentrant {
        if (recordHash == bytes32(0) || patientHash == bytes32(0)) revert Errors.InvalidHash();
        if (records[recordHash].timestamp != 0) revert Errors.EntityAlreadyExists(recordHash);

        records[recordHash] = MedicalRecord({
            patientHash: patientHash,
            uploader: msg.sender,
            timestamp: uint40(block.timestamp),
            version: 1,
            isVerified: false
        });

        emit RecordRegistered(recordHash, patientHash, msg.sender, 1, block.timestamp);
    }

    function verifyRecord(bytes32 recordHash) external onlyBackend whenNotPaused nonReentrant {
        if (records[recordHash].timestamp == 0) revert Errors.EntityNotFound(recordHash);
        if (records[recordHash].isVerified) revert Errors.EntityAlreadyVerified(recordHash);

        records[recordHash].isVerified = true;

        emit RecordVerified(recordHash, block.timestamp);
    }

    function updateVersion(bytes32 oldRecordHash, bytes32 newRecordHash) external onlyBackend whenNotPaused nonReentrant {
        if (records[oldRecordHash].timestamp == 0) revert Errors.EntityNotFound(oldRecordHash);
        if (records[newRecordHash].timestamp != 0) revert Errors.EntityAlreadyExists(newRecordHash);

        uint32 newVersion = records[oldRecordHash].version + 1;

        records[newRecordHash] = MedicalRecord({
            patientHash: records[oldRecordHash].patientHash,
            uploader: msg.sender,
            timestamp: uint40(block.timestamp),
            version: newVersion,
            isVerified: false
        });

        emit RecordVersionUpdated(oldRecordHash, newRecordHash, newVersion, block.timestamp);
    }

    function getRecord(bytes32 recordHash) external view returns (MedicalRecord memory) {
        if (records[recordHash].timestamp == 0) revert Errors.EntityNotFound(recordHash);
        return records[recordHash];
    }

    function grantAccess(bytes32 recordHash, bytes32 doctorHash) external onlyBackend whenNotPaused nonReentrant {
        if (records[recordHash].timestamp == 0) revert Errors.EntityNotFound(recordHash);
        accessGrants[recordHash][doctorHash] = true;
        emit AccessGranted(recordHash, doctorHash, block.timestamp);
    }

    function revokeAccess(bytes32 recordHash, bytes32 doctorHash) external onlyBackend whenNotPaused nonReentrant {
        if (records[recordHash].timestamp == 0) revert Errors.EntityNotFound(recordHash);
        accessGrants[recordHash][doctorHash] = false;
        emit AccessRevoked(recordHash, doctorHash, block.timestamp);
    }

    function hasAccess(bytes32 recordHash, bytes32 doctorHash) external view returns (bool) {
        if (records[recordHash].timestamp == 0) return false;
        return accessGrants[recordHash][doctorHash];
    }
}
