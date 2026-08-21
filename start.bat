@echo off
setlocal EnableDelayedExpansion

title MedSync Startup Service
color 0F

echo ============================================================
echo           MEDSYNC STARTUP PROCEDURE
echo ============================================================
echo.

if not exist logs mkdir logs

:: Initialize Status Variables
set "S_NODE=FAILED"
set "S_NPM=FAILED"
set "S_PYTHON=FAILED"
set "S_PIP=FAILED"
set "S_GIT=FAILED"
set "S_FRONTEND_DEPS=FAILED"
set "S_BACKEND_DEPS=FAILED"
set "S_FRONTEND=FAILED"
set "S_BACKEND=FAILED"
set "S_BONE=FAILED"
set "S_BRAIN=FAILED"
set "S_KIDNEY=FAILED"
set "S_SKIN=FAILED"
set "S_GROQ=FAILED"
set "S_DB=FAILED"
set "S_REDIS=SKIPPED"
set "S_CELERY=SKIPPED"
set "S_BLOCKCHAIN=FAILED"

set "R_DB="
set "R_BONE="
set "R_BRAIN="
set "R_KIDNEY="
set "R_SKIN="
set "R_GROQ="
set "R_BLOCKCHAIN="
set "R_BACKEND="
set "R_FRONTEND="
set "R_PYTHON="

:: -------------------------------------------------------------
:: 1. ENVIRONMENT CHECK
:: -------------------------------------------------------------
echo [1/11] Checking Environment...

node -v >nul 2>&1
if !ERRORLEVEL! EQU 0 (set "S_NODE=OK") else (
    set "S_NODE=MISSING"
    set "R_NODE=Node.js is not installed."
)

call pnpm -v >nul 2>&1
if !ERRORLEVEL! EQU 0 (set "S_NPM=OK") else (
    set "S_NPM=MISSING"
    set "R_NPM=pnpm is not installed."
)

python --version >nul 2>&1
if !ERRORLEVEL! EQU 0 (set "S_PYTHON=OK") else (
    set "S_PYTHON=MISSING"
    set "R_PYTHON=Python is not installed. Manual installation required."
)

call pip --version >nul 2>&1
if !ERRORLEVEL! EQU 0 (set "S_PIP=OK") else (set "S_PIP=MISSING")

git --version >nul 2>&1
if !ERRORLEVEL! EQU 0 (set "S_GIT=OK") else (set "S_GIT=MISSING")

:: -------------------------------------------------------------
:: 2. ENVIRONMENT CONFIG CHECK
:: -------------------------------------------------------------
echo [2/11] Checking Environment Config Files...
if not exist "apps\backend\.env" (
    if exist "apps\backend\.env.example" (
        echo       - Created apps\backend\.env from .env.example
        copy apps\backend\.env.example apps\backend\.env >nul
    ) else (
        echo       - [WARN] apps\backend\.env not found.
    )
) else (
    echo       - [OK] apps\backend\.env found.
)

:: -------------------------------------------------------------
:: 3. DEPENDENCY CHECK & INSTALL/REPAIR (IDEMPOTENT)
:: -------------------------------------------------------------
echo [3/11] Checking Dependencies...

if "!S_NPM!"=="OK" (
    if exist "apps\web\node_modules" (
        if exist "apps\web\node_modules\next" (
            echo       - [OK] Frontend dependencies already installed
            set "S_FRONTEND_DEPS=OK"
        ) else (
            echo       - [WARN] node_modules exists but is corrupted. Repairing...
            call pnpm install > logs\frontend_install.log 2>&1
            if !ERRORLEVEL! EQU 0 (set "S_FRONTEND_DEPS=OK") else (set "S_FRONTEND_DEPS=FAILED")
        )
    ) else (
        echo       - Installing frontend dependencies via pnpm...
        call pnpm install > logs\frontend_install.log 2>&1
        if !ERRORLEVEL! EQU 0 (set "S_FRONTEND_DEPS=OK") else (set "S_FRONTEND_DEPS=FAILED")
    )
) else (
    set "S_FRONTEND_DEPS=SKIPPED"
)

if "!S_PYTHON!"=="OK" (
    if not exist "apps\backend\venv_dev" (
        echo       - Creating Python virtual environment...
        python -m venv apps\backend\venv_dev > logs\backend_install.log 2>&1
    )
    
    :: Fast Dependency Check
    echo       - Checking Python dependencies...
    call apps\backend\venv_dev\Scripts\activate.bat
    python -c "import fastapi, uvicorn, sqlalchemy, groq" >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo       - [OK] Backend dependencies already installed
        set "S_BACKEND_DEPS=OK"
    ) else (
        echo       - Installing missing Python dependencies...
        call pip install -r apps\backend\requirements.txt > logs\backend_install.log 2>&1
        if !ERRORLEVEL! EQU 0 (set "S_BACKEND_DEPS=OK") else (set "S_BACKEND_DEPS=FAILED")
    )
    call apps\backend\venv_dev\Scripts\deactivate.bat
) else (
    set "S_BACKEND_DEPS=SKIPPED"
)

:: -------------------------------------------------------------
:: 4. DATABASE CHECK
:: -------------------------------------------------------------
echo [4/11] Checking Database...
set "DB_URL="
for /f "tokens=1,* delims==" %%A in (apps\backend\.env) do (
    if "%%A"=="SUPABASE_URL" set "DB_URL=%%B"
)
if "!DB_URL!"=="" (
    set "S_DB=MISSING"
    set "R_DB=SUPABASE_URL missing from apps\backend\.env"
) else (
    curl -s -m 5 !DB_URL! >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        set "S_DB=OK"
    ) else (
        set "S_DB=FAILED"
        set "R_DB=Could not connect to Supabase URL"
    )
)

:: -------------------------------------------------------------
:: 5. AI MODELS & GROQ CHECK
:: -------------------------------------------------------------
echo [5/11] Checking AI Models and Groq...
if not exist "medsync-ai\models" mkdir medsync-ai\models

:: Check Bone
if exist "medsync-ai\models\bone.pt" (
    echo       - [OK] Bone Fracture model present
    set "S_BONE=OK"
) else (
    echo       - Downloading Bone Fracture model...
    if "!S_PYTHON!"=="OK" (
        python medsync-ai\download_models.py > logs\model_download.log 2>&1
        if exist "medsync-ai\models\bone.pt" (set "S_BONE=OK") else (
            set "S_BONE=FAILED"
            set "R_BONE=Failed to download bone.pt"
        )
    ) else (
        set "S_BONE=SKIPPED"
        set "R_BONE=Python unavailable for download."
    )
)
:: Check Brain
if exist "medsync-ai\models\brain.pt" (
    echo       - [OK] Brain Tumor model present
    set "S_BRAIN=OK"
) else (
    if "!S_PYTHON!"=="OK" (
        python medsync-ai\download_models.py >> logs\model_download.log 2>&1
        if exist "medsync-ai\models\brain.pt" (set "S_BRAIN=OK") else (
            set "S_BRAIN=FAILED"
            set "R_BRAIN=Failed to download brain.pt"
        )
    ) else (
        set "S_BRAIN=SKIPPED"
    )
)
:: Check Kidney
if exist "medsync-ai\models\kidney.pt" (
    echo       - [OK] Kidney Stone model present
    set "S_KIDNEY=OK"
) else (
    if "!S_PYTHON!"=="OK" (
        python medsync-ai\download_models.py >> logs\model_download.log 2>&1
        if exist "medsync-ai\models\kidney.pt" (set "S_KIDNEY=OK") else (
            set "S_KIDNEY=FAILED"
            set "R_KIDNEY=Failed to download kidney.pt"
        )
    ) else (
        set "S_KIDNEY=SKIPPED"
    )
)
:: Check Skin
if exist "medsync-ai\models\skin_model.pt" (
    echo       - [OK] Skin Disease model present
    set "S_SKIN=OK"
) else (
    if "!S_PYTHON!"=="OK" (
        python medsync-ai\download_models.py >> logs\model_download.log 2>&1
        if exist "medsync-ai\models\skin_model.pt" (set "S_SKIN=OK") else (
            set "S_SKIN=FAILED"
            set "R_SKIN=Failed to download skin_model.pt"
        )
    ) else (
        set "S_SKIN=SKIPPED"
    )
)

:: Groq
set "GROQ_KEY="
for /f "tokens=1,* delims==" %%A in (apps\backend\.env) do (
    if "%%A"=="GROQ_API_KEY" set "GROQ_KEY=%%B"
)
if "!GROQ_KEY!"=="" (
    set "S_GROQ=MANUAL"
    set "R_GROQ=GROQ_API_KEY is not configured in .env"
) else (
    curl -s -m 5 -H "Authorization: Bearer !GROQ_KEY!" https://api.groq.com/openai/v1/models -o nul -w "%%{http_code}" > logs\groq_check.txt
    set /p GROQ_HTTP_CODE=<logs\groq_check.txt
    if "!GROQ_HTTP_CODE!"=="200" (
        set "S_GROQ=OK"
    ) else if "!GROQ_HTTP_CODE!"=="401" (
        set "S_GROQ=MANUAL"
        set "R_GROQ=GROQ_API_KEY is invalid"
    ) else if "!GROQ_HTTP_CODE!"=="429" (
        set "S_GROQ=WARN"
        set "R_GROQ=Groq API rate limited"
    ) else (
        set "S_GROQ=FAILED"
        set "R_GROQ=Groq API unreachable"
    )
    del logs\groq_check.txt
)

:: -------------------------------------------------------------
:: 6. BLOCKCHAIN CHECK
:: -------------------------------------------------------------
echo [6/11] Checking Blockchain...
set "RPC_URL="
for /f "tokens=1,* delims==" %%A in (apps\backend\.env) do (
    if "%%A"=="POLYGON_RPC_URL" set "RPC_URL=%%B"
)
if "!RPC_URL!"=="" (
    set "S_BLOCKCHAIN=MISSING"
    set "R_BLOCKCHAIN=POLYGON_RPC_URL missing from .env"
) else (
    curl -s -m 5 -X POST -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"params\":[],\"id\":1}" !RPC_URL! >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        set "S_BLOCKCHAIN=OK"
    ) else (
        set "S_BLOCKCHAIN=FAILED"
        set "R_BLOCKCHAIN=Could not connect to Polygon RPC"
    )
)

:: -------------------------------------------------------------
:: 7. REDIS / CELERY
:: -------------------------------------------------------------
echo [7/11] Checking Redis / Celery...
netstat -ano | findstr :6379 >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    set "S_REDIS=OK"
) else (
    set "S_REDIS=WARN"
    set "R_REDIS=Redis is unavailable - non-critical services may be limited."
)
set "S_CELERY=SKIPPED"

:: -------------------------------------------------------------
:: 8. START BACKEND
:: -------------------------------------------------------------
echo [8/11] Starting Backend...
if "!S_PYTHON!"=="OK" (
    netstat -ano | findstr LISTENING | findstr :8000 >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo       - Backend process found on port 8000.
        set "S_BACKEND=RUNNING_UNVERIFIED"
    ) else (
        echo       - Launching FastAPI Backend...
        start "MedSync Backend" cmd /c "call apps\backend\venv_dev\Scripts\activate.bat && cd apps\backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 > ..\..\logs\backend.log 2>&1"
        set "S_BACKEND=STARTING"
    )
) else (
    set "S_BACKEND=SKIPPED"
    set "R_BACKEND=Python unavailable."
)

:: -------------------------------------------------------------
:: 9. VERIFY BACKEND
:: -------------------------------------------------------------
echo [9/11] Verifying Backend Health...
if "!S_BACKEND!"=="RUNNING_UNVERIFIED" (
    curl -s -f -m 5 http://127.0.0.1:8000/health >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo       - [OK] Backend already healthy.
        set "S_BACKEND=OK"
    ) else (
        echo       - [FAILED] Backend process exists but health endpoint failed.
        set "S_BACKEND=FAILED"
        set "R_BACKEND=Port 8000 is occupied by another process, or backend crashed."
    )
) else if "!S_BACKEND!"=="STARTING" (
    set /a retries=15
    :PollBackend
    curl -s -f -m 5 http://127.0.0.1:8000/health >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo       - [OK] FastAPI Server is healthy.
        set "S_BACKEND=OK"
    ) else (
        set /a retries-=1
        if !retries! GTR 0 (
            ping -n 3 127.0.0.1 >nul
            goto PollBackend
        )
        set "S_BACKEND=FAILED"
        set "R_BACKEND=Backend /health did not respond within 30 seconds. Check logs\backend.log"
    )
)

:: -------------------------------------------------------------
:: 10. START FRONTEND
:: -------------------------------------------------------------
echo [10/11] Starting Frontend...
if "!S_NPM!"=="OK" (
    netstat -ano | findstr LISTENING | findstr :3000 >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo       - Frontend process found on port 3000.
        set "S_FRONTEND=RUNNING_UNVERIFIED"
    ) else (
        echo       - Cleaning stale build cache...
        if exist "apps\web\.next" rmdir /s /q "apps\web\.next"
        echo       - Launching Next.js Frontend...
        start "MedSync Frontend" cmd /c "cd apps\web && set PORT=3000 && call pnpm run dev > ..\..\logs\frontend.log 2>&1"
        set "S_FRONTEND=STARTING"
    )
) else (
    set "S_FRONTEND=SKIPPED"
    set "R_FRONTEND=pnpm/node unavailable."
)

:: -------------------------------------------------------------
:: 11. VERIFY FRONTEND
:: -------------------------------------------------------------
echo [11/11] Verifying Frontend Health...
set /a fretries=30
:PollFrontendHealth
curl -s -f -m 5 http://127.0.0.1:3000/api/health >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo       - [OK] Next.js API is ready.
    goto VerifyLanding
) else (
    set /a fretries-=1
    if !fretries! GTR 0 (
        ping -n 4 127.0.0.1 >nul
        goto PollFrontendHealth
    )
    set "S_FRONTEND=FAILED"
    set "R_FRONTEND=Frontend /api/health did not respond within 90 seconds. Port conflict or Next.js crashed."
    goto EndFrontendVerify
)

:VerifyLanding
echo       - Warming up landing page (may take 30s to compile on first run)...
curl -s -f -m 60 http://127.0.0.1:3000 >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo       - [OK] Landing page rendered successfully.
    set "S_FRONTEND=OK"
) else (
    set "S_FRONTEND=FAILED"
    set "R_FRONTEND=Landing page failed to render or timed out after 60s."
)

:EndFrontendVerify

:: -------------------------------------------------------------
:: BROWSER OPEN
:: -------------------------------------------------------------
if "!S_FRONTEND!"=="OK" (
    echo       - Opening browser to http://127.0.0.1:3000
    start http://127.0.0.1:3000
) else (
    echo       - [FAILED] Browser launch skipped
    echo       - Reason: Frontend did not respond.
)


:: -------------------------------------------------------------
:: FINAL REPORT
:: -------------------------------------------------------------
echo.
echo ============================================================
echo                 MEDSYNC STARTUP CHECKLIST
echo ============================================================

set /a C_OK=0
set /a C_READY=0
set /a C_WARN=0
set /a C_FAIL=0
set /a C_SKIP=0
set /a C_MISS=0
set /a C_MANUAL=0

for %%S in (!S_NODE! !S_NPM! !S_PYTHON! !S_PIP! !S_GIT! !S_FRONTEND_DEPS! !S_BACKEND_DEPS! !S_FRONTEND! !S_BACKEND! !S_DB! !S_BONE! !S_BRAIN! !S_KIDNEY! !S_SKIN! !S_GROQ! !S_BLOCKCHAIN! !S_REDIS! !S_CELERY!) do (
    if "%%S"=="OK" set /a C_OK+=1
    if "%%S"=="READY" set /a C_READY+=1
    if "%%S"=="WARN" set /a C_WARN+=1
    if "%%S"=="FAILED" set /a C_FAIL+=1
    if "%%S"=="SKIPPED" set /a C_SKIP+=1
    if "%%S"=="MISSING" set /a C_MISS+=1
    if "%%S"=="MANUAL" set /a C_MANUAL+=1
)

echo.
echo ## ENVIRONMENT
echo [!S_NODE!]      Node.js
echo [!S_NPM!]      npm/pnpm
echo [!S_PYTHON!]      Python
echo [!S_PIP!]      pip
echo [!S_GIT!]      Git

echo.
echo ## DEPENDENCIES
echo [!S_FRONTEND_DEPS!]      Frontend dependencies
echo [!S_BACKEND_DEPS!]      Backend dependencies

echo.
echo ## APPLICATION
echo [!S_BACKEND!]      FastAPI Server
echo [!S_BACKEND!]      FastAPI /health
echo [!S_FRONTEND!]      Next.js Server

echo.
echo ## DATABASE
echo [!S_DB!]      Supabase Connection

echo.
echo ## AI
echo [!S_BONE!]      Bone Fracture Model
echo [!S_BRAIN!]      Brain Tumor Model
echo [!S_KIDNEY!]      Kidney Stone Model
echo [!S_SKIN!]      Skin Disease Model
echo [!S_GROQ!]      Groq API

echo.
echo ## BLOCKCHAIN
echo [!S_BLOCKCHAIN!]      Polygon RPC
echo [!S_BLOCKCHAIN!]      Smart Contract

echo.
echo ## SERVICES
echo [!S_REDIS!]      Redis
echo [!S_CELERY!]      Celery Worker

echo.
echo ============================================================
echo AVAILABLE LINKS
echo ===============
if "!S_FRONTEND!"=="OK" echo Frontend: http://127.0.0.1:3000
if "!S_BACKEND!"=="OK" (
    echo Backend:  http://127.0.0.1:8000
    echo Health:   http://127.0.0.1:8000/health
    echo AI Health: http://127.0.0.1:8000/health/ai
    echo Swagger:  http://127.0.0.1:8000/docs
)
echo ============================================================
echo SUMMARY
echo =======
echo READY/OK:  !C_OK!
echo WARNING:   !C_WARN!
echo FAILED:    !C_FAIL!
echo SKIPPED:   !C_SKIP!
echo MISSING:   !C_MISS!
echo MANUAL:    !C_MANUAL!
echo.
echo ============================================================

set "HAS_ISSUES=0"

if !C_FAIL! GTR 0 set "HAS_ISSUES=1"
if !C_MISS! GTR 0 set "HAS_ISSUES=1"
if !C_MANUAL! GTR 0 set "HAS_ISSUES=1"

if "!HAS_ISSUES!"=="1" (
    echo FAILED / DEGRADED
    echo =================
    if "!S_NODE!"=="MISSING" echo Component: Node.js & echo Status: MISSING & echo Actual reason: !R_NODE! & echo Recommended action: Install Node.js & echo.
    if "!S_NPM!"=="MISSING" echo Component: pnpm & echo Status: MISSING & echo Actual reason: !R_NPM! & echo Recommended action: Install pnpm & echo.
    if "!S_PYTHON!"=="MISSING" echo Component: Python & echo Status: MISSING & echo Actual reason: !R_PYTHON! & echo Recommended action: Install Python & echo.
    
    if "!S_DB!"=="MISSING" echo Component: Supabase & echo Status: MISSING & echo Actual reason: !R_DB! & echo Recommended action: Check .env & echo.
    if "!S_DB!"=="FAILED" echo Component: Supabase & echo Status: FAILED & echo Actual reason: !R_DB! & echo Recommended action: Check internet/URL & echo.
    
    if "!S_BLOCKCHAIN!"=="MISSING" echo Component: Blockchain & echo Status: MISSING & echo Actual reason: !R_BLOCKCHAIN! & echo Recommended action: Check .env & echo.
    if "!S_BLOCKCHAIN!"=="FAILED" echo Component: Blockchain & echo Status: FAILED & echo Actual reason: !R_BLOCKCHAIN! & echo Recommended action: Check RPC URL & echo.
    
    if "!S_BONE!"=="FAILED" echo Component: AI Bone & echo Status: FAILED & echo Actual reason: !R_BONE! & echo Recommended action: Check logs\model_download.log & echo.
    if "!S_BRAIN!"=="FAILED" echo Component: AI Brain & echo Status: FAILED & echo Actual reason: !R_BRAIN! & echo Recommended action: Check logs\model_download.log & echo.
    if "!S_KIDNEY!"=="FAILED" echo Component: AI Kidney & echo Status: FAILED & echo Actual reason: !R_KIDNEY! & echo Recommended action: Check logs\model_download.log & echo.
    if "!S_SKIN!"=="FAILED" echo Component: AI Skin & echo Status: FAILED & echo Actual reason: !R_SKIN! & echo Recommended action: Check logs\model_download.log & echo.
    
    if "!S_GROQ!"=="MANUAL" echo Component: Groq & echo Status: MANUAL & echo Actual reason: !R_GROQ! & echo Recommended action: Add GROQ_API_KEY to .env & echo.
    if "!S_GROQ!"=="WARN" echo Component: Groq & echo Status: WARN & echo Actual reason: !R_GROQ! & echo Recommended action: Wait for rate limit reset & echo.
    if "!S_GROQ!"=="FAILED" echo Component: Groq & echo Status: FAILED & echo Actual reason: !R_GROQ! & echo Recommended action: Check internet connection & echo.
    
    if "!S_BACKEND!"=="FAILED" echo Component: Backend & echo Status: FAILED & echo Actual reason: !R_BACKEND! & echo Relevant log: logs\backend.log & echo Recommended action: Review backend logs & echo.
    if "!S_FRONTEND!"=="FAILED" echo Component: Frontend & echo Status: FAILED & echo Actual reason: !R_FRONTEND! & echo Relevant log: logs\frontend.log & echo Recommended action: Review frontend logs & echo.
) else (
    echo No manual action required.
)

echo.
echo ============================================================
echo MedSync is running.
echo # Press CTRL+C to stop the startup session.
echo ============================================================
pause
goto :EOF
