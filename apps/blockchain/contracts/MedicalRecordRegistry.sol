// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract MedicalRecordRegistry is AccessControl {
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");

    struct RecordMetadata {
        string recordId;
        string ipfsCID;
        string sha256Hash;
        string ownerId;
        uint256 version;
        uint256 timestamp;
    }

    // Mapping recordId -> version -> Metadata
    mapping(string => mapping(uint256 => RecordMetadata)) public records;
    mapping(string => uint256) public latestVersions;

    event MedicalRecordRegistered(string indexed recordId, string ipfsCID, string ownerId, uint256 version);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function registerRecordVersion(
        string memory recordId,
        string memory ipfsCID,
        string memory sha256Hash,
        string memory ownerId,
        uint256 version
    ) external onlyRole(BACKEND_ROLE) {
        require(bytes(records[recordId][version].ipfsCID).length == 0, "Version already exists");
        
        records[recordId][version] = RecordMetadata({
            recordId: recordId,
            ipfsCID: ipfsCID,
            sha256Hash: sha256Hash,
            ownerId: ownerId,
            version: version,
            timestamp: block.timestamp
        });

        if (version > latestVersions[recordId]) {
            latestVersions[recordId] = version;
        }

        emit MedicalRecordRegistered(recordId, ipfsCID, ownerId, version);
    }

    function verifyIntegrity(string memory recordId, uint256 version, string memory sha256HashToVerify) external view returns (bool) {
        RecordMetadata memory meta = records[recordId][version];
        require(bytes(meta.ipfsCID).length > 0, "Record not found");
        
        return keccak256(abi.encodePacked(meta.sha256Hash)) == keccak256(abi.encodePacked(sha256HashToVerify));
    }

    function retrieveMetadata(string memory recordId, uint256 version) external view returns (RecordMetadata memory) {
        return records[recordId][version];
    }
}
