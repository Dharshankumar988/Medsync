# MedSync Blockchain (Solidity / Hardhat)

This directory contains the Smart Contracts that form the immutable backbone of MedSync. Deployed to the **Polygon Amoy Testnet**, these contracts ensure that medical records, prescriptions, and consent logs are cryptographically verifiable.

## 🏗️ Technology Stack

- **Language**: Solidity (^0.8.20)
- **Framework**: Hardhat
- **Standards**: OpenZeppelin (AccessControl, Pausable, Upgradable)
- **Network**: Polygon Amoy Testnet

## 📜 Core Contracts

1. **`AccessControl.sol`**: Centralized RBAC. Grants the `BACKEND_ROLE` to the FastAPI server, preventing direct unauthorized writes from external wallets.
2. **`DoctorRegistry.sol` & `PharmacyRegistry.sol`**: Verifies medical licenses and institutional identities on-chain.
3. **`MedicalRecordRegistry.sol`**: Stores IPFS CIDs and SHA-256 hashes of medical files. It does *not* store the files themselves (ensuring GDPR/HIPAA compliance).
4. **`ConsentManager.sol`**: Tracks cryptographic proof of a patient granting a doctor access to their records.

## 🚀 Deployment

1. Create an `.env` file in `apps/blockchain`:
   ```env
   POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology/
   PRIVATE_KEY=your_metamask_private_key
   ```
2. Install and deploy:
   ```bash
   cd apps/blockchain
   npm install
   npx hardhat compile
   npm run deploy:amoy
   ```
3. Copy the resulting contract addresses into your Backend `.env` file.
