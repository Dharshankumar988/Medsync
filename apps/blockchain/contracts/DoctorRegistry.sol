// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract DoctorRegistry is AccessControl {
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");

    struct Doctor {
        string doctorId; // UUID from PostgreSQL
        address wallet;
        string licenseHash;
        bool isVerified;
        bool isSuspended;
        uint256 approvalTimestamp;
    }

    mapping(string => Doctor) public doctors;

    event DoctorRegistered(string indexed doctorId, address indexed wallet, string licenseHash);
    event DoctorApproved(string indexed doctorId, uint256 timestamp);
    event DoctorSuspended(string indexed doctorId);
    event DoctorReactivated(string indexed doctorId);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function registerDoctor(string memory doctorId, address wallet, string memory licenseHash) external onlyRole(BACKEND_ROLE) {
        require(doctors[doctorId].wallet == address(0), "Doctor already registered");
        
        doctors[doctorId] = Doctor({
            doctorId: doctorId,
            wallet: wallet,
            licenseHash: licenseHash,
            isVerified: false,
            isSuspended: false,
            approvalTimestamp: 0
        });

        emit DoctorRegistered(doctorId, wallet, licenseHash);
    }

    function approveDoctor(string memory doctorId) external onlyRole(BACKEND_ROLE) {
        require(doctors[doctorId].wallet != address(0), "Doctor not found");
        doctors[doctorId].isVerified = true;
        doctors[doctorId].approvalTimestamp = block.timestamp;
        
        emit DoctorApproved(doctorId, block.timestamp);
    }

    function suspendDoctor(string memory doctorId) external onlyRole(BACKEND_ROLE) {
        require(doctors[doctorId].wallet != address(0), "Doctor not found");
        doctors[doctorId].isSuspended = true;
        
        emit DoctorSuspended(doctorId);
    }

    function reactivateDoctor(string memory doctorId) external onlyRole(BACKEND_ROLE) {
        require(doctors[doctorId].wallet != address(0), "Doctor not found");
        doctors[doctorId].isSuspended = false;
        
        emit DoctorReactivated(doctorId);
    }

    function verifyDoctorStatus(string memory doctorId) external view returns (bool isVerified, bool isSuspended) {
        Doctor memory doc = doctors[doctorId];
        return (doc.isVerified, doc.isSuspended);
    }
}
