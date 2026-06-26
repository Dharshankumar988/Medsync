@echo off
echo Stopping MedSync services...
docker compose down
taskkill /F /IM uvicorn.exe 2>nul
taskkill /F /IM node.exe 2>nul
echo MedSync stopped.
pause
