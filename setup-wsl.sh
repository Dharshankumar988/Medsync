#!/bin/bash
set -e

echo "============================================"
echo "   MedSync - WSL Native Setup"
echo "============================================"
echo ""

echo "[1/4] Installing Linux Dependencies (Node.js, Python3 venv)..."
echo "You may be asked for your Linux password."
sudo apt-get update
sudo apt-get install -y python3-venv python3-pip nodejs npm

echo ""
echo "[2/4] Verifying Environment Files..."
if [ ! -f .env ]; then
    echo "[SETUP] Creating .env from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "[SETUP] Please update .env with your API keys if necessary."
    else
        echo "[ERROR] .env.example is missing."
        exit 1
    fi
fi
echo "[OK] Environment verified."
echo ""

echo "[3/4] Setting up Backend..."
cd apps/backend
if [ ! -d "venv_linux" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv_linux
fi

echo "Activating virtual environment and installing dependencies..."
source venv_linux/bin/activate
pip install -r requirements.txt
echo "Running database migrations..."
alembic upgrade head
echo "Running database seeder..."
python3 seed.py
deactivate
cd ../..

echo ""
echo "[4/4] Setting up Web Frontend..."
cd apps/web
echo "Installing Node dependencies..."
npm install
cd ../..

echo ""
echo "============================================"
echo "   WSL Setup Complete!"
echo "============================================"
echo "You can now run 'start-wsl.bat' from Windows to start the services."
