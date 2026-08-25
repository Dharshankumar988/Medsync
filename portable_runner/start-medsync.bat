@echo off
setlocal

echo MedSync backend starting...

REM 1. Check if Docker is installed
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Docker is not installed or not in your PATH.
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    exit /b 1
)

REM 2. Check if Docker is running
docker info >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Docker daemon is not running.
    echo Please start Docker Desktop and try again.
    exit /b 1
)

REM 3. Check for medsync.env
if not exist "medsync.env" (
    echo ERROR: medsync.env file not found in the current directory.
    echo Please copy medsync.env.example to medsync.env and fill in your credentials.
    exit /b 1
)

set IMAGE_NAME=ghcr.io/dharshankumar988/medsync-backend:latest
set CONTAINER_NAME=medsync-backend
set PORT=8000

REM 4. Pull image
echo Pulling latest image: %IMAGE_NAME%...
docker pull %IMAGE_NAME%

REM 5. Stop existing container if running
FOR /F "tokens=*" %%i IN ('docker ps -a -q -f "name=^/%CONTAINER_NAME%$"') DO set existing=%%i
if defined existing (
    echo Stopping existing container...
    docker rm -f %CONTAINER_NAME% >nul
)

REM 6. Start container
echo Starting container %CONTAINER_NAME% on port %PORT%...
docker run -d --name %CONTAINER_NAME% -p %PORT%:8000 --env-file medsync.env %IMAGE_NAME%

REM 7. Wait for health check
echo Waiting for backend to become healthy...
set healthy=0
for /L %%A in (1,1,30) do (
    curl -s http://localhost:%PORT%/health >nul
    if not errorlevel 1 (
        set healthy=1
        goto done_waiting
    )
    timeout /t 2 /nobreak >nul
)

:done_waiting
if %healthy%==1 (
    echo.
    echo === STATUS ===
    echo Container:  %CONTAINER_NAME%
    echo Local API:  http://localhost:%PORT%
    echo Health:     http://localhost:%PORT%/health
    echo Status:     READY
    echo ================
    echo.
) else (
    echo.
    echo WARNING: Backend did not report healthy within 60 seconds.
    echo Check logs with: docker logs %CONTAINER_NAME%
)
