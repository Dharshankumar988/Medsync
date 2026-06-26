@echo off
echo ============================================
echo    MedSync - Starting All Services
echo ============================================
echo.

REM Check for .env
if not exist .env (
    echo [SETUP] Creating .env from .env.example...
    copy .env.example .env
    echo [SETUP] Please update .env with your API keys before running again.
    pause
    exit /b
)

echo [1/4] Starting Docker services...
docker compose up -d db
timeout /t 5 /nobreak > nul

echo [2/4] Starting Backend...
cd apps\backend
start cmd /k "python -m venv venv 2>nul & venv\Scripts\activate & pip install -r requirements.txt -q & python seed.py & uvicorn app.main:app --reload --port 8000"
cd ..\..  

echo [3/4] Starting Frontend...
cd apps\web
start cmd /k "npm install & npm run dev"
cd ..\..  

echo.
echo ============================================
echo    MedSync is starting!
echo    Backend:  http://localhost:8000
echo    Frontend: http://localhost:3000
echo    API Docs: http://localhost:8000/docs
echo ============================================
echo.
echo Demo Accounts:
echo   Patient:  patient@demo.com  / Demo@1234
echo   Doctor:   doctor@demo.com   / Demo@1234
echo   Pharmacy: pharmacy@demo.com / Demo@1234
echo   Admin:    admin@demo.com    / Admin@1234
echo.
pause
