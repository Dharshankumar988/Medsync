// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../libraries/Roles.sol";
import "../libraries/Errors.sol";

/**
 * @title BaseRegistry
 * @dev Abstract core contract containing common registry functionality.
 * Incorporates AccessControl, Pausable, and ReentrancyGuard logic.
 */
abstract contract BaseRegistry is AccessControl, Pausable, ReentrancyGuard {
    
    /**
     * @dev Sets up initial default admin and backend roles for the deployer.
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(Roles.BACKEND_ROLE, msg.sender);
    }

    /**
     * @dev Modifier to restrict functions to backend role.
     */
    modifier onlyBackend() {
        if (!hasRole(Roles.BACKEND_ROLE, msg.sender)) {
            revert Errors.Unauthorized(Roles.BACKEND_ROLE, msg.sender);
        }
        _;
    }

    /**
     * @dev Emergency pause by Admin.
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause by Admin.
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
