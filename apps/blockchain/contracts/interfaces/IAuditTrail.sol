// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAuditTrail {
    struct AuditRecord {
        bytes32 eventType;
        bytes32 entityHash;
        address caller;
        uint40 timestamp;
    }

    event AuditEventLogged(bytes32 indexed eventType, bytes32 indexed entityHash, address indexed caller, uint256 timestamp);

    function logEvent(bytes32 eventType, bytes32 entityHash) external;
}
