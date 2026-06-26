// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract PharmacyRegistry is AccessControl {
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");

    struct Pharmacy {
        string pharmacyId; // UUID from PostgreSQL
        address wallet;
        string licenseHash;
        string gstHash;
        bool isVerified;
        bool isSuspended;
    }

    mapping(string => Pharmacy) public pharmacies;

    event PharmacyRegistered(string indexed pharmacyId, address indexed wallet);
    event PharmacyApproved(string indexed pharmacyId);
    event PharmacySuspended(string indexed pharmacyId);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function registerPharmacy(string memory pharmacyId, address wallet, string memory licenseHash, string memory gstHash) external onlyRole(BACKEND_ROLE) {
        require(pharmacies[pharmacyId].wallet == address(0), "Pharmacy already registered");
        
        pharmacies[pharmacyId] = Pharmacy({
            pharmacyId: pharmacyId,
            wallet: wallet,
            licenseHash: licenseHash,
            gstHash: gstHash,
            isVerified: false,
            isSuspended: false
        });

        emit PharmacyRegistered(pharmacyId, wallet);
    }

    function approvePharmacy(string memory pharmacyId) external onlyRole(BACKEND_ROLE) {
        require(pharmacies[pharmacyId].wallet != address(0), "Pharmacy not found");
        pharmacies[pharmacyId].isVerified = true;
        
        emit PharmacyApproved(pharmacyId);
    }

    function suspendPharmacy(string memory pharmacyId) external onlyRole(BACKEND_ROLE) {
        require(pharmacies[pharmacyId].wallet != address(0), "Pharmacy not found");
        pharmacies[pharmacyId].isSuspended = true;
        
        emit PharmacySuspended(pharmacyId);
    }

    function verifyPharmacyStatus(string memory pharmacyId) external view returns (bool isVerified, bool isSuspended) {
        Pharmacy memory pharm = pharmacies[pharmacyId];
        return (pharm.isVerified, pharm.isSuspended);
    }
}
