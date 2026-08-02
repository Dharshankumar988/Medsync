// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPharmacyRegistry {
    struct Pharmacy {
        bytes32 licenseHash;
        address owner;
        uint40 createdTimestamp;
        uint40 updatedTimestamp;
        bool isVerified;
        bool isSuspended;
    }

    event PharmacyRegistered(bytes32 indexed pharmacyHash, bytes32 licenseHash, address indexed owner, uint256 timestamp);
    event PharmacyVerified(bytes32 indexed pharmacyHash, uint256 timestamp);
    event PharmacySuspended(bytes32 indexed pharmacyHash, uint256 timestamp);
    event PharmacyReactivated(bytes32 indexed pharmacyHash, uint256 timestamp);

    function registerPharmacy(bytes32 pharmacyHash, bytes32 licenseHash, address owner) external;
    function verifyPharmacy(bytes32 pharmacyHash) external;
    function suspendPharmacy(bytes32 pharmacyHash) external;
    function reactivatePharmacy(bytes32 pharmacyHash) external;
    function getPharmacy(bytes32 pharmacyHash) external view returns (Pharmacy memory);
}
