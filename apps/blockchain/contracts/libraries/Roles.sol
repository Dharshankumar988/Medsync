// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Roles
 * @dev Centralized role definitions for the MedSync smart contract ecosystem.
 */
library Roles {
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");
}
