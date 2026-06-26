// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract PrescriptionRegistry is AccessControl {
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");

    struct Prescription {
        string prescriptionHash; // Hash of the prescription JSON
        string doctorId;
        string patientId;
        uint256 timestamp;
        bool isVerified;
    }

    mapping(string => Prescription) public prescriptions;

    event PrescriptionRegistered(string indexed prescriptionHash, string indexed doctorId, string indexed patientId);
    event PrescriptionVerified(string indexed prescriptionHash);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function registerPrescription(string memory prescriptionHash, string memory doctorId, string memory patientId) external onlyRole(BACKEND_ROLE) {
        require(prescriptions[prescriptionHash].timestamp == 0, "Prescription already exists");
        
        prescriptions[prescriptionHash] = Prescription({
            prescriptionHash: prescriptionHash,
            doctorId: doctorId,
            patientId: patientId,
            timestamp: block.timestamp,
            isVerified: false
        });

        emit PrescriptionRegistered(prescriptionHash, doctorId, patientId);
    }

    function verifyPrescription(string memory prescriptionHash) external onlyRole(BACKEND_ROLE) {
        require(prescriptions[prescriptionHash].timestamp != 0, "Prescription not found");
        prescriptions[prescriptionHash].isVerified = true;
        
        emit PrescriptionVerified(prescriptionHash);
    }
}
