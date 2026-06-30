@echo off
setlocal EnableDelayedExpansion
echo ============================================
echo    MedSync - Starting All Services
echo ============================================
echo.

:: 1. Verify Environment Files
echo [1/3] Verifying Environment...
if not exist .env (
    echo [SETUP] Creating .env from .env.example...
    if exist .env.example (
        copy .env.example .env
    ) else (
        echo [ERROR] .env.example is missing. Cannot create .env automatically.
        pause
        exit /b 1
    )
    echo [SETUP] Please update .env with your API keys before running again if necessary.
)
echo [OK] Environment verified.
echo.

:: 2. Determine Deployment Mode (Docker vs Local MSVC Fallback)
echo [2/3] Checking Docker installation...
where docker >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Docker is installed. Proceeding with Docker Compose Deployment.
    echo.
    echo [3/3] Starting MedSync via Docker Compose...
    docker compose down
    docker compose up --build -d
    
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Docker Compose failed to start services.
        pause
        exit /b 1
    )
    echo.
    echo ============================================
    echo    MedSync is running in Docker!
    echo    Frontend: http://localhost:80 ^(Nginx^) or http://localhost:3000
    echo    Backend:  http://localhost:8000
    echo ============================================
    echo.
    echo To view logs, run: docker compose logs -f
    pause
    exit /b 0
) else (
    echo [WARNING] Docker Desktop is not installed or not in PATH!
    echo [INFO] Falling back to Local MSVC Native Deployment...
    echo.
    echo ============================================
    echo    MedSync - Local Native Fallback Mode
    echo ============================================
    
    echo [1/3] Setting up Backend and running Migrations...
    cd apps\backend
    if not exist "venv" (
        echo Creating virtual environment...
        python -m venv venv
    )
    call venv\Scripts\activate.bat
    echo Installing backend dependencies ^(MSVC required^)...
    pip install -r requirements.txt
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Pip install failed! Ensure Visual Studio C++ Build Tools are installed.
        pause
        exit /b 1
    )
    echo Running Database Migrations...
    alembic upgrade head
    echo Running Database Seeder...
    python seed.py
    echo Starting FastAPI Backend ^(Background^)...
    start "MedSync Backend" cmd /c "call venv\Scripts\activate.bat && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
    cd ..\..

    echo.
    echo [2/3] Setting up Web Frontend...
    cd apps\web
    echo Installing frontend dependencies...
    call npm install
    echo Starting Next.js Frontend ^(Background^)...
    start "MedSync Frontend" cmd /c "npm run dev"
    cd ..\..
    
    echo.
    echo [3/3] Mobile App Notice...
    echo If you wish to run the Expo Mobile App, open a new terminal in 'apps\mobile' and run:
    echo   npm install
    echo   npx expo start
    
    echo.
    echo ============================================
    echo    All Native Services Started Successfully!
    echo ============================================
    echo Backend API: http://localhost:8000
    echo Web UI:      http://localhost:3000
    echo.
    echo Note: New terminal windows have been opened for the services.
    echo You can close this window now.
    pause
    exit /b 0
)
