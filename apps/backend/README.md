# MedSync Backend (FastAPI)

The backend powers the entire MedSync ecosystem. Built on **FastAPI** and **Python 3.12**, it acts as the central orchestrator routing requests between the Postgres Database, IPFS, Polygon Blockchain, and our Groq AI models.

## 🏗️ Architecture

- **Framework**: FastAPI
- **ORM**: SQLAlchemy 2.0 (Async)
- **Database**: PostgreSQL
- **Blockchain Interface**: `web3.py`
- **Authentication**: JWT (JSON Web Tokens) with Role-Based Access Control (RBAC)

## 📂 Folder Structure

```
apps/backend/
├── alembic/              # Database migration scripts
├── app/
│   ├── api/v1/           # API Routers (auth, patients, doctors, ai, etc.)
│   ├── core/             # Configuration, security, dependencies
│   ├── models/           # SQLAlchemy ORM models
│   ├── schemas/          # Pydantic validation schemas
│   ├── services/         # Business logic (IPFS, Blockchain, AI)
│   └── main.py           # FastAPI application entrypoint
├── tests/                # Pytest suite
├── Dockerfile            # Production Docker configuration
└── requirements.txt      # Python dependencies
```

## 🔒 Authentication & RBAC

All endpoints (except login/register) require a valid JWT Bearer token. 
The system enforces strict RBAC via `RoleChecker` dependencies. For example, a Patient cannot access the `/api/v1/pharmacy/` routes.

## 🤖 AI & Blockchain Integrations

- **AI (`app/services/ai_models/`)**: Uses `ModelManager` to lazy-load lightweight ML models (EfficientNet/YOLO) for X-Ray analysis, and calls the Groq API for RAG-based LLM chat.
- **Blockchain (`app/blockchain/web3_client.py`)**: The backend acts as a relayer. Users do not need MetaMask. The backend signs transactions using a secure server wallet and pushes state changes to Polygon Amoy.

## 🚀 Running Locally (Standalone)

```bash
cd apps/backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
