@echo off
echo ============================================
echo    MedSync - Starting WSL Native Services
echo ============================================
echo.

echo [1/2] Starting FastAPI Backend ^(Background^)...
start "MedSync Backend (WSL)" wsl -d Ubuntu -e bash -c "cd '/mnt/c/IMP PROJECTS/Medsync/apps/backend' && source venv_linux/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo.
echo [2/2] Starting Next.js Frontend ^(Background^)...
start "MedSync Frontend (WSL)" wsl -d Ubuntu -e bash -c "cd '/mnt/c/IMP PROJECTS/Medsync/apps/web' && npm run dev"

echo.
echo ============================================
echo    All Services Started in WSL!
echo ============================================
echo Backend API: http://localhost:8000
echo Web UI:      http://localhost:3000
echo.
echo Note: New terminal windows have been opened for the services.
echo You can close this window now.
pause
