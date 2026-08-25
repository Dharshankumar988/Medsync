@echo off
title MedSync Startup Service
color 0F

echo ============================================================
echo           MEDSYNC STARTUP PROCEDURE
echo ============================================================
echo.

echo Starting FastAPI Backend...
start "MedSync Backend" cmd /k "call apps\backend\venv_dev\Scripts\activate.bat && cd apps\backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

echo Starting Next.js Frontend...
start "MedSync Frontend" cmd /k "cd apps\web && set PORT=3000 && pnpm run dev"

echo.
echo ============================================================
echo AVAILABLE LINKS
echo ===============
echo Frontend: http://127.0.0.1:3000
echo Backend:  http://127.0.0.1:8000
echo Swagger:  http://127.0.0.1:8000/docs
echo ============================================================
echo.
echo MedSync is starting up in new windows.
pause
