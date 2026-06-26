# Installation & Local Setup

## Prerequisites
- **Node.js**: v18+ (for Web, Mobile, and Blockchain)
- **Python**: v3.12+ (for Backend)
- **Docker & Docker Compose**: (for Local Database and Nginx)
- **Expo CLI**: (for Mobile)

## 1. Quick Start (Docker)
The easiest way to run the project is via Docker Compose. This will spin up the database, backend, frontend, and reverse proxy.
```bash
cp .env.example .env
# Fill in the required API keys in .env
./infrastructure/scripts/start.sh
```

## 2. Manual Developer Setup

### Database
Start just the database using Docker:
```bash
docker-compose up db -d
```

### Backend
```bash
cd apps/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend Web
```bash
cd apps/web
npm install
npm run dev
```

### Frontend Mobile
```bash
cd apps/mobile
npm install
npx expo start
```

### Blockchain (Optional - Local Node)
```bash
cd apps/blockchain
npm install
npx hardhat node
npx hardhat run scripts/deploy.ts --network localhost
```
