// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../core/BaseRegistry.sol";
import "../interfaces/IPatientRegistry.sol";

/**
 * @title PatientRegistry
 * @dev Maintains blockchain identities for patients.
 */
contract PatientRegistry is BaseRegistry, IPatientRegistry {
    mapping(bytes32 => Patient) public patients;

    function registerPatient(bytes32 patientHash, address wallet) external onlyBackend whenNotPaused nonReentrant {
        if (patientHash == bytes32(0)) revert Errors.InvalidHash();
        if (wallet == address(0)) revert Errors.ZeroAddress();
        if (patients[patientHash].createdTimestamp != 0) revert Errors.EntityAlreadyExists(patientHash);

        patients[patientHash] = Patient({
            wallet: wallet,
            createdTimestamp: uint40(block.timestamp),
            updatedTimestamp: uint40(block.timestamp),
            isVerified: false,
            isActive: true
        });

        emit PatientRegistered(patientHash, wallet, block.timestamp);
    }

    function verifyPatient(bytes32 patientHash) external onlyBackend whenNotPaused nonReentrant {
        if (patients[patientHash].createdTimestamp == 0) revert Errors.EntityNotFound(patientHash);
        if (patients[patientHash].isVerified) revert Errors.EntityAlreadyVerified(patientHash);

        patients[patientHash].isVerified = true;
        patients[patientHash].updatedTimestamp = uint40(block.timestamp);

        emit PatientVerified(patientHash, block.timestamp);
    }

    function deactivatePatient(bytes32 patientHash) external onlyBackend whenNotPaused nonReentrant {
        if (patients[patientHash].createdTimestamp == 0) revert Errors.EntityNotFound(patientHash);
        if (!patients[patientHash].isActive) revert Errors.EntityNotActive(patientHash);

        patients[patientHash].isActive = false;
        patients[patientHash].updatedTimestamp = uint40(block.timestamp);

        emit PatientDeactivated(patientHash, block.timestamp);
    }

    function reactivatePatient(bytes32 patientHash) external onlyBackend whenNotPaused nonReentrant {
        if (patients[patientHash].createdTimestamp == 0) revert Errors.EntityNotFound(patientHash);
        if (patients[patientHash].isActive) revert Errors.EntityAlreadyExists(patientHash); // Used as "Already Active"

        patients[patientHash].isActive = true;
        patients[patientHash].updatedTimestamp = uint40(block.timestamp);

        emit PatientReactivated(patientHash, block.timestamp);
    }

    function updateWallet(bytes32 patientHash, address newWallet) external onlyBackend whenNotPaused nonReentrant {
        if (newWallet == address(0)) revert Errors.ZeroAddress();
        if (patients[patientHash].createdTimestamp == 0) revert Errors.EntityNotFound(patientHash);

        patients[patientHash].wallet = newWallet;
        patients[patientHash].updatedTimestamp = uint40(block.timestamp);

        emit PatientWalletUpdated(patientHash, newWallet, block.timestamp);
    }

    function getPatient(bytes32 patientHash) external view returns (Patient memory) {
        if (patients[patientHash].createdTimestamp == 0) revert Errors.EntityNotFound(patientHash);
        return patients[patientHash];
    }
}
