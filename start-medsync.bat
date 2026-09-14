@echo off
setlocal

echo ==============================================
echo       Starting MedSync Integrated System      
echo ==============================================

echo [1/4] Starting Hardhat Node...
start "Hardhat Node" cmd /c "cd apps\blockchain && npx hardhat node"
timeout /t 5 /nobreak >nul

echo [2/4] Starting Backend Service (FastAPI on 8000)...
start "Backend API" cmd /c "cd apps\backend && venv\Scripts\activate && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [3/4] Starting Face Verification Service (FastAPI on 8001)...
start "Face Service" cmd /c "cd apps\face-service && venv\Scripts\activate && uvicorn main:app --host 127.0.0.1 --port 8001"

echo [4/4] Starting Next.js Frontend (Port 3000)...
start "Frontend Web" cmd /c "cd apps\web && npm run dev"

echo ==============================================
echo MedSync Services are starting up!
echo.
echo - Frontend running at: http://localhost:3000
echo - Backend API proxying through Next.js at: http://localhost:3000/api/v1
echo - Direct Backend access: http://127.0.0.1:8000
echo - Direct Face Service access: http://127.0.0.1:8001
echo.
echo To expose publicly, run ONE ngrok tunnel:
echo   ngrok http 3000
echo ==============================================

pause
