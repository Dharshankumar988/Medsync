// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IDoctorRegistry {
    struct Doctor {
        bytes32 licenseHash;
        bytes32 hospitalHash;
        address wallet;
        uint40 createdTimestamp;
        uint40 updatedTimestamp;
        bool isVerified;
        bool isActive;
    }

    event DoctorRegistered(bytes32 indexed doctorHash, bytes32 licenseHash, address indexed wallet, uint256 timestamp);
    event DoctorVerified(bytes32 indexed doctorHash, uint256 timestamp);
    event DoctorSuspended(bytes32 indexed doctorHash, uint256 timestamp);
    event DoctorReactivated(bytes32 indexed doctorHash, uint256 timestamp);
    event DoctorAffiliationUpdated(bytes32 indexed doctorHash, bytes32 newHospitalHash, uint256 timestamp);

    function registerDoctor(bytes32 doctorHash, bytes32 licenseHash, bytes32 hospitalHash, address wallet) external;
    function verifyDoctor(bytes32 doctorHash) external;
    function suspendDoctor(bytes32 doctorHash) external;
    function reactivateDoctor(bytes32 doctorHash) external;
    function updateAffiliation(bytes32 doctorHash, bytes32 newHospitalHash) external;
    function getDoctor(bytes32 doctorHash) external view returns (Doctor memory);
}
