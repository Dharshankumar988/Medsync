// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MedicalRecordRegistry {
    // Event emitted when a new record is registered
    event RecordRegistered(
        string indexed recordId,
        string storageType,
        string storageReference,
        string sha256Hash,
        string ownerId,
        uint256 version,
        uint256 timestamp
    );

    struct Record {
        string storageType;      // e.g., "PostgreSQL", "IPFS", "Arweave"
        string storageReference; // e.g., db URI, CID, or just "DB_ID"
        string sha256Hash;       // Deterministic hash of the record data
        string ownerId;          // Patient ID
        uint256 version;
        uint256 timestamp;
    }

    // Mapping from recordId to Record details
    mapping(string => Record) public records;

    /**
     * @dev Register a new version of a medical record.
     * Overwrites any existing record with the same ID, bumping the version logically.
     * The blockchain acts purely as a tamper-proof audit log. No medical data is stored here.
     */
    function registerRecordVersion(
        string memory _recordId,
        string memory _storageType,
        string memory _storageReference,
        string memory _sha256Hash,
        string memory _ownerId,
        uint256 _version
    ) public {
        records[_recordId] = Record({
            storageType: _storageType,
            storageReference: _storageReference,
            sha256Hash: _sha256Hash,
            ownerId: _ownerId,
            version: _version,
            timestamp: block.timestamp
        });

        emit RecordRegistered(
            _recordId,
            _storageType,
            _storageReference,
            _sha256Hash,
            _ownerId,
            _version,
            block.timestamp
        );
    }

    /**
     * @dev Retrieve record audit details.
     */
    function getRecord(string memory _recordId) public view returns (Record memory) {
        return records[_recordId];
    }
}
