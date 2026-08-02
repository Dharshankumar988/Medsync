# MedSync Blockchain Deployment Guide

This document describes how to deploy, verify, and manage MedSync smart contracts.

## Folder Structure

- `deploy/deploy.ts`: Orchestrates the deployment of all contracts in the correct order.
- `deploy/utils/`: Contains utilities for metadata generation, ABI exporting, and verification.
- `tasks/`: Custom Hardhat tasks (`medsync:deploy`, `medsync:verify`, `medsync:show-contracts`, `medsync:export-abis`).
- `deployments/<network>/`: Contains the deployment history, contract addresses, and metadata for each network.
- `abis/`: Contains exported contract ABIs.

## Environment Setup

Create a `.env` file in the `apps/blockchain` directory based on the following variables:

```env
POLYGON_AMOY_RPC_URL="https://rpc-amoy.polygon.technology/"
POLYGON_RPC_URL="https://polygon-rpc.com"
BACKEND_PRIVATE_KEY="YOUR_DEPLOYER_PRIVATE_KEY"
POLYGONSCAN_API_KEY="YOUR_POLYGONSCAN_API_KEY"
REPORT_GAS="true"
```

## Commands

### 1. Compile Contracts
Compiles all contracts and prepares typechain definitions.
```bash
npm run compile
```

### 2. Deploy Locally
Deploys contracts to the local Hardhat network for testing.
```bash
npm run deploy:local
```

### 3. Deploy to Amoy Testnet
Deploys contracts to the Polygon Amoy Testnet and automatically verifies them on PolygonScan.
```bash
npm run deploy:amoy
```

### 4. Deploy to Polygon Mainnet
Deploys contracts to the Polygon Mainnet and automatically verifies them on PolygonScan.
```bash
npm run deploy:mainnet
```

### 5. Verify Contracts Manually
If auto-verification fails (e.g. network timeout), run this manually:
```bash
npm run verify:amoy
```

### 6. Export ABIs
ABIs are automatically exported after deployment. To manually re-export:
```bash
npm run export-abis
```

### 7. Show Deployed Contracts
View a summary table of deployed contracts for a network.
```bash
npx hardhat medsync:show-contracts --network amoy
```

### 8. Clean Build Outputs
Removes artifacts, cache, and deployment metadata:
```bash
npm run clean
```

## Troubleshooting & Recovery

**1. Verification Failed (Already Verified)**
- You can safely ignore this. The contract bytecode matches an existing verified contract on PolygonScan.

**2. Missing Environment Variables**
- The deployment script runs an initial check. Ensure `.env` is fully populated.

**3. Incomplete Deployments**
- If a deployment aborts halfway, delete the specific contract JSON from `deployments/<network>` if you want to retry the deployment entirely, or resume by checking `contract-addresses.json`. Currently, the orchestrator script runs linearly. If you need to restart, you may want to clean deployments or comment out already-deployed contracts in `deploy.ts`.
