// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ConsentManagement {
    struct Consent {
        address patient;
        address authorizedParty;
        bytes32 resourceHash;
        uint256 grantedAt;
        uint256 expiresAt;
        bool active;
    }

    mapping(bytes32 => Consent) private consents;

    mapping(address => mapping(address => mapping(bytes32 => bytes32)))
        private consentLookup;

    event ConsentGranted(
        bytes32 indexed consentId,
        address indexed patient,
        address indexed authorizedParty,
        bytes32 resourceHash,
        uint256 grantedAt,
        uint256 expiresAt
    );

    event ConsentRevoked(
        bytes32 indexed consentId,
        address indexed patient,
        address indexed authorizedParty,
        bytes32 resourceHash,
        uint256 revokedAt
    );

    error InvalidAddress();
    error InvalidResourceHash();
    error InvalidExpiry();
    error ConsentNotFound();
    error Unauthorized();
    error ConsentAlreadyActive();

    modifier onlyPatient(bytes32 consentId) {
        if (consents[consentId].patient == address(0)) {
            revert ConsentNotFound();
        }

        if (consents[consentId].patient != msg.sender) {
            revert Unauthorized();
        }

        _;
    }

    function grantConsent(
        address authorizedParty,
        bytes32 resourceHash,
        uint256 expiresAt
    ) external returns (bytes32 consentId) {
        if (authorizedParty == address(0)) {
            revert InvalidAddress();
        }

        if (resourceHash == bytes32(0)) {
            revert InvalidResourceHash();
        }

        if (expiresAt != 0 && expiresAt <= block.timestamp) {
            revert InvalidExpiry();
        }

        consentId = keccak256(
            abi.encodePacked(
                msg.sender,
                authorizedParty,
                resourceHash,
                block.timestamp
            )
        );

        bytes32 existingId =
            consentLookup[msg.sender][authorizedParty][resourceHash];

        if (
            existingId != bytes32(0) &&
            consents[existingId].active &&
            (
                consents[existingId].expiresAt == 0 ||
                consents[existingId].expiresAt > block.timestamp
            )
        ) {
            revert ConsentAlreadyActive();
        }

        consents[consentId] = Consent({
            patient: msg.sender,
            authorizedParty: authorizedParty,
            resourceHash: resourceHash,
            grantedAt: block.timestamp,
            expiresAt: expiresAt,
            active: true
        });

        consentLookup[msg.sender][authorizedParty][resourceHash] = consentId;

        emit ConsentGranted(
            consentId,
            msg.sender,
            authorizedParty,
            resourceHash,
            block.timestamp,
            expiresAt
        );
    }

    function revokeConsent(bytes32 consentId)
        external
        onlyPatient(consentId)
    {
        Consent storage consent = consents[consentId];

        if (!consent.active) {
            revert ConsentNotFound();
        }

        consent.active = false;

        emit ConsentRevoked(
            consentId,
            consent.patient,
            consent.authorizedParty,
            consent.resourceHash,
            block.timestamp
        );
    }

    function checkConsent(bytes32 consentId)
        external
        view
        returns (bool)
    {
        Consent storage consent = consents[consentId];

        if (!consent.active) {
            return false;
        }
        
        if (consent.expiresAt != 0 && consent.expiresAt < block.timestamp) {
            return false;
        }

        return true;
    }

    function getConsentId(
        address patient,
        address authorizedParty,
        bytes32 resourceHash
    ) external view returns (bytes32) {
        return consentLookup[patient][authorizedParty][resourceHash];
    }
}
