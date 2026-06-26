// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract ConsentManager is AccessControl {
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");

    // recordId -> (doctorId -> hasAccess)
    mapping(string => mapping(string => bool)) public recordConsents;

    event ConsentGranted(string indexed recordId, string indexed doctorId, string patientId, uint256 timestamp);
    event ConsentRevoked(string indexed recordId, string indexed doctorId, string patientId, uint256 timestamp);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function grantAccess(string memory recordId, string memory doctorId, string memory patientId) external onlyRole(BACKEND_ROLE) {
        recordConsents[recordId][doctorId] = true;
        emit ConsentGranted(recordId, doctorId, patientId, block.timestamp);
    }

    function revokeAccess(string memory recordId, string memory doctorId, string memory patientId) external onlyRole(BACKEND_ROLE) {
        recordConsents[recordId][doctorId] = false;
        emit ConsentRevoked(recordId, doctorId, patientId, block.timestamp);
    }

    function checkAccess(string memory recordId, string memory doctorId) external view returns (bool) {
        return recordConsents[recordId][doctorId];
    }
}
