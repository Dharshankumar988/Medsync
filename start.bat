@echo off
setlocal EnableDelayedExpansion
echo ============================================
echo    MedSync - Starting Services
echo ============================================
echo.

echo [1/2] Starting FastAPI Backend...
start "MedSync Backend" cmd /k "wsl -d Ubuntu bash apps/backend/start_backend.sh"

echo [2/2] Starting Next.js Web App and Expo Mobile App...
start "MedSync Web & Mobile" cmd /k "pnpm dev"

echo.
echo ============================================
echo    All Services Started Successfully!
echo ============================================
echo Backend API: http://localhost:8000
echo Web UI:      http://localhost:3000
echo Mobile:      Check the "MedSync Web & Mobile" terminal for the Expo QR Code
echo.
echo Note: Two new terminal windows have been opened.
echo You can close this window now.
pause
exit /b 0
