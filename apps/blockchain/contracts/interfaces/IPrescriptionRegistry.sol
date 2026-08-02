// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPrescriptionRegistry {
    struct Prescription {
        bytes32 patientHash;
        bytes32 doctorHash;
        address creator;
        uint40 timestamp;
        uint32 version;
        bool isRevoked;
        bool isVerified;
    }

    event PrescriptionCreated(bytes32 indexed prescriptionHash, bytes32 indexed patientHash, bytes32 indexed doctorHash, uint32 version, uint256 timestamp);
    event PrescriptionVerified(bytes32 indexed prescriptionHash, uint256 timestamp);
    event PrescriptionRevoked(bytes32 indexed prescriptionHash, uint256 timestamp);
    event PrescriptionVersionUpdated(bytes32 indexed oldPrescriptionHash, bytes32 indexed newPrescriptionHash, uint32 newVersion, uint256 timestamp);

    function createPrescription(bytes32 prescriptionHash, bytes32 patientHash, bytes32 doctorHash) external;
    function verifyPrescription(bytes32 prescriptionHash) external;
    function revokePrescription(bytes32 prescriptionHash) external;
    function updateVersion(bytes32 oldPrescriptionHash, bytes32 newPrescriptionHash) external;
    function getPrescription(bytes32 prescriptionHash) external view returns (Prescription memory);
}
