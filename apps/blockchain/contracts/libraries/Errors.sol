// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Errors
 * @dev Shared custom errors for MedSync smart contracts.
 */
library Errors {
    // Access Control Errors
    error Unauthorized(bytes32 role, address account);
    
    // Registry Errors
    error EntityAlreadyExists(bytes32 entityHash);
    error EntityNotFound(bytes32 entityHash);
    error EntitySuspended(bytes32 entityHash);
    error EntityNotActive(bytes32 entityHash);
    error EntityAlreadyVerified(bytes32 entityHash);
    error EntityNotVerified(bytes32 entityHash);
    
    // Integrity Errors
    error InvalidHash();
    error VersionAlreadyExists(bytes32 entityHash, uint32 version);
    error ZeroAddress();
    
    // State Errors
    error IsRevoked(bytes32 entityHash);
}
