// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPatientRegistry {
    struct Patient {
        address wallet;
        uint40 createdTimestamp;
        uint40 updatedTimestamp;
        bool isVerified;
        bool isActive;
    }

    event PatientRegistered(bytes32 indexed patientHash, address indexed wallet, uint256 timestamp);
    event PatientVerified(bytes32 indexed patientHash, uint256 timestamp);
    event PatientDeactivated(bytes32 indexed patientHash, uint256 timestamp);
    event PatientReactivated(bytes32 indexed patientHash, uint256 timestamp);
    event PatientWalletUpdated(bytes32 indexed patientHash, address indexed newWallet, uint256 timestamp);

    function registerPatient(bytes32 patientHash, address wallet) external;
    function verifyPatient(bytes32 patientHash) external;
    function deactivatePatient(bytes32 patientHash) external;
    function reactivatePatient(bytes32 patientHash) external;
    function updateWallet(bytes32 patientHash, address newWallet) external;
    function getPatient(bytes32 patientHash) external view returns (Patient memory);
}
