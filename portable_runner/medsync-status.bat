@echo off
setlocal

set CONTAINER_NAME=medsync-backend
set PORT=8000

echo === MedSync Status ===

REM Docker status
docker info >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Docker:           NOT RUNNING
    exit /b 1
) else (
    echo Docker:           READY
)

REM Container status
docker inspect -f "{{.State.Status}}" %CONTAINER_NAME% >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Container:        NOT FOUND
    exit /b 1
) else (
    FOR /F "tokens=*" %%i IN ('docker inspect -f "{{.State.Status}}" %CONTAINER_NAME%') DO set STATUS=%%i
    echo Container:        %STATUS%
)

REM Image version
FOR /F "tokens=*" %%i IN ('docker inspect -f "{{.Config.Image}}" %CONTAINER_NAME%') DO set IMAGE=%%i
echo Image version:    %IMAGE%
echo Port:             %PORT%

REM Health status
curl -s -o nul -w "%%{http_code}" http://localhost:%PORT%/health > temp_health_code.txt
set /p HEALTH_CODE=<temp_health_code.txt
del temp_health_code.txt >nul 2>nul

if "%HEALTH_CODE%"=="200" (
    echo Backend:          READY
    echo Health endpoint:  HTTP 200
) else (
    echo Backend:          UNHEALTHY/UNREACHABLE
    echo Health endpoint:  HTTP %HEALTH_CODE%
)

echo.
echo --- Recent Logs ---
docker logs --tail 15 %CONTAINER_NAME%
