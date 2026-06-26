// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract AuditLogger is AccessControl {
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");

    event AuditEvent(string indexed action, string indexed entityId, string details, uint256 timestamp);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function logEvent(string memory action, string memory entityId, string memory details) external onlyRole(BACKEND_ROLE) {
        emit AuditEvent(action, entityId, details, block.timestamp);
    }
}
