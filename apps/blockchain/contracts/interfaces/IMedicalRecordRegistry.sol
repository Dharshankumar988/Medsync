// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMedicalRecordRegistry {
    struct MedicalRecord {
        bytes32 patientHash;
        address uploader;
        uint40 timestamp;
        uint32 version;
        bool isVerified;
    }

    event RecordRegistered(bytes32 indexed recordHash, bytes32 indexed patientHash, address indexed uploader, uint32 version, uint256 timestamp);
    event RecordVerified(bytes32 indexed recordHash, uint256 timestamp);
    event RecordVersionUpdated(bytes32 indexed oldRecordHash, bytes32 indexed newRecordHash, uint32 newVersion, uint256 timestamp);

    function registerRecord(bytes32 recordHash, bytes32 patientHash) external;
    function verifyRecord(bytes32 recordHash) external;
    function updateVersion(bytes32 oldRecordHash, bytes32 newRecordHash) external;
    function getRecord(bytes32 recordHash) external view returns (MedicalRecord memory);
}
