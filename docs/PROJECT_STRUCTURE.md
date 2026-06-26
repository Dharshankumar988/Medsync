# Project Structure

MedSync is structured as a Monorepo to keep all interconnected services tightly versioned together.

```
medsync/
├── apps/
│   ├── backend/        # FastAPI Python API, AI Models, Blockchain Relayer
│   ├── web/            # Next.js 15 Web Portal (Patients, Doctors, Pharmacies)
│   ├── mobile/         # React Native Expo App (Patients, Doctors)
│   └── blockchain/     # Solidity Smart Contracts and Hardhat deployment
├── docs/               # System architecture, API docs, and Manuals
├── infrastructure/     # DevOps configurations
│   ├── nginx/          # Reverse proxy configurations
│   ├── scripts/        # Bash automation for Docker and Backups
│   └── docs/           # Deployment guides and checklists
├── .github/
│   └── workflows/      # CI/CD Pipelines (Frontend, Backend)
├── docker-compose.yml  # Root orchestration for local development
└── .env.example        # Master environment variables template
```

### Why a Monorepo?
It allows us to share TypeScript schemas (if abstracted into a `packages/` folder later), easily spin up the entire ecosystem via a single `docker-compose up`, and maintain synchronized CI/CD pipelines across the stack.
