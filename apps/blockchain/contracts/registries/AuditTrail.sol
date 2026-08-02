// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../core/BaseRegistry.sol";
import "../interfaces/IAuditTrail.sol";

/**
 * @title AuditTrail
 * @dev Stores immutable audit metadata on the blockchain.
 */
contract AuditTrail is BaseRegistry, IAuditTrail {

    function logEvent(bytes32 eventType, bytes32 entityHash) external onlyBackend whenNotPaused {
        if (entityHash == bytes32(0)) revert Errors.InvalidHash();
        
        emit AuditEventLogged(eventType, entityHash, msg.sender, block.timestamp);
    }
}
