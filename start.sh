#!/bin/bash
echo "============================================"
echo "   MedSync - Starting All Services"
echo "============================================"

# Check for .env
if [ ! -f .env ]; then
    echo "[SETUP] Creating .env from .env.example..."
    cp .env.example .env
    echo "[SETUP] Please update .env with your API keys, then run again."
    exit 1
fi

echo "[1/4] Starting Docker database..."
docker compose up -d db
sleep 5

echo "[2/4] Starting Backend..."
cd apps/backend
python -m venv venv 2>/dev/null
source venv/bin/activate
pip install -r requirements.txt -q
python seed.py
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
cd ../..

echo "[3/4] Starting Frontend..."
cd apps/web
npm install --silent
npm run dev &
FRONTEND_PID=$!
cd ../..

echo ""
echo "============================================"
echo "   MedSync is running!"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:3000"
echo "   API Docs: http://localhost:8000/docs"
echo "============================================"
echo ""
echo "Demo Accounts:"
echo "  Patient:  patient@demo.com  / Demo@1234"
echo "  Doctor:   doctor@demo.com   / Demo@1234"
echo "  Pharmacy: pharmacy@demo.com / Demo@1234"
echo "  Admin:    admin@demo.com    / Admin@1234"
echo ""
echo "Press Ctrl+C to stop all services."
wait
