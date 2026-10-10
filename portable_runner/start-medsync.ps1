# MedSync Portable Runner (PowerShell)
[CmdletBinding()]
param (
    [string]$Mode = "",
    [switch]$Remote,
    [switch]$Headless,
    [switch]$NoNgrok,
    [string]$Port = "",
    [switch]$FollowLogs,
    [switch]$Daemon
)

$ErrorActionPreference = "Stop"
$ScriptPath = $PSScriptRoot
Set-Location -LiteralPath $ScriptPath

# Initialize tracking files
$ContainersFile = Join-Path $ScriptPath ".runner_containers.txt"
$PidsFile = Join-Path $ScriptPath ".runner_pids.txt"
if (-not (Test-Path $ContainersFile)) { New-Item $ContainersFile -ItemType File -Force | Out-Null }
if (-not (Test-Path $PidsFile)) { New-Item $PidsFile -ItemType File -Force | Out-Null }

# Get version
$VERSION = "1.0.0"
if (Test-Path "VERSION") {
    $VERSION = (Get-Content "VERSION" -Raw).Trim()
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       MEDSYNC PORTABLE RUNNER (v$VERSION)       " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Interactive Selection if not specified
if (-not $Mode -and -not $Remote -and -not $Headless) {
    Write-Host "`nChoose what you would like to run:" -ForegroundColor Yellow
    Write-Host "  [1] Option A: Full Backend (Runs complete API, Database & Services locally)" -ForegroundColor Cyan
    Write-Host "  [2] Option B: AI & RAG Worker Only (Runs heavy AI models & RAG embeddings locally)" -ForegroundColor Green
    $selection = Read-Host "`nEnter choice [1 or 2] (Default: 2)"
    if ($selection -eq "1" -or $selection -eq "A" -or $selection -eq "a") {
        $Mode = "Full"
    } else {
        $Mode = "Worker"
    }
} elseif (-not $Mode) {
    $Mode = "Full"
}

if ($Mode -eq "Worker" -or $Mode -eq "2") {
    Write-Host "`nTarget: [Option B] AI & RAG Worker Microservice" -ForegroundColor Green
} else {
    Write-Host "`nTarget: [Option A] Full MedSync Backend" -ForegroundColor Cyan
}

if ($Remote -or $Headless) {
    Write-Host "Execution Mode: Remote / Headless Server" -ForegroundColor Magenta
} else {
    Write-Host "Execution Mode: Interactive Desktop Runner" -ForegroundColor White
}
Write-Host ""

# 2. Check if Docker is installed and running
if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Docker is not installed or not in your PATH." -ForegroundColor Red
    exit 1
}
try {
    $null = docker info 2>&1
} catch {
    Write-Host "ERROR: Docker daemon is not running." -ForegroundColor Red
    exit 1
}

# 3. Check for .env
$ENV_FILE = Join-Path $ScriptPath ".env"
if (-not (Test-Path -LiteralPath $ENV_FILE)) {
    $legacyEnv = Join-Path $ScriptPath "medsync.env"
    if (Test-Path -LiteralPath $legacyEnv) {
        $ENV_FILE = $legacyEnv
    } elseif (Test-Path -LiteralPath (Join-Path $ScriptPath ".env.example")) {
        Copy-Item (Join-Path $ScriptPath ".env.example") $ENV_FILE
        Write-Host "IMPORTANT: A new .env file was created. Please edit it to add your configuration if needed." -ForegroundColor Red
    } else {
        Write-Host "ERROR: .env file not found." -ForegroundColor Red
        exit 1
    }
}

# Configuration
$BACKEND_REGISTRY_IMAGE = "ghcr.io/dharshankumar988/medsync-backend:latest"
$BACKEND_LOCAL_IMAGE = "medsync-backend:local"
$BACKEND_CONTAINER = "medsync-backend"
$BACKEND_PORT = if ($Port) { [int]$Port } elseif ($env:PORT) { [int]$env:PORT } else { 8000 }

$WORKER_REGISTRY_IMAGE = "ghcr.io/dharshankumar988/medsync-ai:latest"
$WORKER_LOCAL_IMAGE = "medsync-ai:local"
$WORKER_CONTAINER = "medsync-ai-worker"
$WORKER_PORT = if ($Port) { [int]$Port } elseif ($env:WORKER_PORT) { [int]$env:WORKER_PORT } else { 7860 }


# ==========================================
# FUNCTION: Start-Backend (Option A)
# ==========================================
function Start-Backend {
    param ([string]$EnvOverride = "")
    Write-Host "`n--- Starting Full Backend ---" -ForegroundColor Cyan
    
    $BACKEND_IMAGE = $null
    Write-Host "Checking for existing Backend image..." -ForegroundColor Cyan
    $localReg = docker images -q $BACKEND_REGISTRY_IMAGE
    $localBlt = docker images -q $BACKEND_LOCAL_IMAGE
    
    if ($localReg) {
        $BACKEND_IMAGE = $BACKEND_REGISTRY_IMAGE
        Write-Host "Found registry image locally: $BACKEND_IMAGE" -ForegroundColor Green
    } elseif ($localBlt) {
        $BACKEND_IMAGE = $BACKEND_LOCAL_IMAGE
        Write-Host "Found locally built image: $BACKEND_IMAGE" -ForegroundColor Green
    } else {
        Write-Host "Pulling Backend image from registry..." -ForegroundColor Cyan
        $pullArgs = "pull $BACKEND_REGISTRY_IMAGE"
        $pullProcess = Start-Process -FilePath "docker" -ArgumentList $pullArgs -NoNewWindow -Wait -PassThru
        if ($pullProcess.ExitCode -eq 0) {
            $BACKEND_IMAGE = $BACKEND_REGISTRY_IMAGE
            Write-Host "`nUsing registry image: $BACKEND_IMAGE" -ForegroundColor Green
        } else {
            Write-Host "`nRegistry pull failed. Building from source..." -ForegroundColor Yellow
            $RepoRoot = Resolve-Path (Join-Path $ScriptPath "..")
            $df = if (Test-Path "$RepoRoot\apps\backend\Dockerfile.full") { "$RepoRoot\apps\backend\Dockerfile.full" } else { "$RepoRoot\apps\backend\Dockerfile" }
            docker build -t $BACKEND_LOCAL_IMAGE -f "$df" "$RepoRoot"
            if ($LASTEXITCODE -ne 0) {
                Write-Host "ERROR: Failed to build backend image." -ForegroundColor Red
                exit 1
            }
            $BACKEND_IMAGE = $BACKEND_LOCAL_IMAGE
            Write-Host "Using locally built image: $BACKEND_IMAGE" -ForegroundColor Green
        }
    }

    $existing = docker ps -a -q -f "name=^/${BACKEND_CONTAINER}$"
    if ($existing) {
        docker rm -f $BACKEND_CONTAINER > $null
    }

    docker volume create medsync-model-cache > $null

    $runCmd = "docker run -d --name $BACKEND_CONTAINER -p `"${BACKEND_PORT}:8000`" -v medsync-model-cache:/models --env-file `"$ENV_FILE`""
    if ($EnvOverride) {
        $runCmd += " $EnvOverride"
    }
    $runCmd += " $BACKEND_IMAGE"
    
    Invoke-Expression $runCmd | Out-Null
    $BACKEND_CONTAINER | Out-File -FilePath $ContainersFile -Append -Encoding utf8

    Write-Host "Waiting for backend to become healthy (HTTP 200)..."
    $healthy = $false
    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Seconds 2
        try {
            $response = Invoke-WebRequest -Uri "http://127.0.0.1:${BACKEND_PORT}/health" -UseBasicParsing -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $healthy = $true
                break
            }
        } catch {}
    }
    
    if (-not $healthy) {
        Write-Host "ERROR: Backend failed health check." -ForegroundColor Red
        docker logs --tail 30 $BACKEND_CONTAINER
        exit 1
    }
    Write-Host "Backend: HEALTHY (Port $BACKEND_PORT)" -ForegroundColor Green

    if ($FollowLogs) {
        Write-Host "`nStreaming backend logs (Ctrl+C to exit log stream)..." -ForegroundColor Cyan
        docker logs -f $BACKEND_CONTAINER
    }
}


# ==========================================
# FUNCTION: Start-AIWorker (Option B)
# ==========================================
function Start-AIWorker {
    Write-Host "`n--- Starting AI & RAG Worker Microservice ---" -ForegroundColor Cyan
    
    $WORKER_IMAGE = $null
    Write-Host "Checking for existing AI Worker image..." -ForegroundColor Cyan
    $localReg = docker images -q $WORKER_REGISTRY_IMAGE
    $localBlt = docker images -q $WORKER_LOCAL_IMAGE
    
    if ($localReg) {
        $WORKER_IMAGE = $WORKER_REGISTRY_IMAGE
        Write-Host "Found registry image locally: $WORKER_IMAGE" -ForegroundColor Green
    } elseif ($localBlt) {
        $WORKER_IMAGE = $WORKER_LOCAL_IMAGE
        Write-Host "Found locally built image: $WORKER_IMAGE" -ForegroundColor Green
    } else {
        Write-Host "Pulling AI Worker image from registry..." -ForegroundColor Cyan
        $pullArgs = "pull $WORKER_REGISTRY_IMAGE"
        $pullProcess = Start-Process -FilePath "docker" -ArgumentList $pullArgs -NoNewWindow -Wait -PassThru
        if ($pullProcess.ExitCode -eq 0) {
            $WORKER_IMAGE = $WORKER_REGISTRY_IMAGE
            Write-Host "`nUsing registry image: $WORKER_IMAGE" -ForegroundColor Green
        } else {
            Write-Host "`nRegistry pull failed. Building from local source..." -ForegroundColor Yellow
            $RepoRoot = Resolve-Path (Join-Path $ScriptPath "..")
            $aiDir = Join-Path $RepoRoot "medsync-ai"
            if (Test-Path "$aiDir\Dockerfile") {
                docker build -t $WORKER_LOCAL_IMAGE -f "$aiDir\Dockerfile" "$aiDir"
                if ($LASTEXITCODE -ne 0) {
                    Write-Host "ERROR: Failed to build AI worker image." -ForegroundColor Red
                    exit 1
                }
                $WORKER_IMAGE = $WORKER_LOCAL_IMAGE
                Write-Host "Using locally built image: $WORKER_IMAGE" -ForegroundColor Green
            } else {
                Write-Host "ERROR: medsync-ai/Dockerfile not found to build locally." -ForegroundColor Red
                exit 1
            }
        }
    }

    $existing = docker ps -a -q -f "name=^/${WORKER_CONTAINER}$"
    if ($existing) {
        docker rm -f $WORKER_CONTAINER > $null
    }

    docker volume create medsync-ai-model-cache > $null

    $runCmd = "docker run -d --name $WORKER_CONTAINER -p `"${WORKER_PORT}:7860`" -v medsync-ai-model-cache:/home/user/app/models/cache --env-file `"$ENV_FILE`" $WORKER_IMAGE"
    Invoke-Expression $runCmd | Out-Null
    $WORKER_CONTAINER | Out-File -FilePath $ContainersFile -Append -Encoding utf8

    Write-Host "Waiting for AI & RAG Worker to become operational (HTTP 200)..."
    $healthy = $false
    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Seconds 2
        try {
            $response = Invoke-WebRequest -Uri "http://127.0.0.1:${WORKER_PORT}/health" -UseBasicParsing -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $healthy = $true
                break
            }
        } catch {}
    }
    
    if (-not $healthy) {
        Write-Host "ERROR: AI Worker failed health check." -ForegroundColor Red
        docker logs --tail 30 $WORKER_CONTAINER
        exit 1
    }
    Write-Host "AI & RAG Worker: HEALTHY (Port $WORKER_PORT)" -ForegroundColor Green

    Write-Host "`nActive Endpoints on Worker:" -ForegroundColor Cyan
    Write-Host "  • Diagnostics (Bone, Brain, Kidney, Skin): http://localhost:${WORKER_PORT}/predict" -ForegroundColor White
    Write-Host "  • RAG Embeddings (all-MiniLM-L6-v2):       http://localhost:${WORKER_PORT}/embed" -ForegroundColor White

    if ($FollowLogs) {
        Write-Host "`nStreaming AI worker logs (Ctrl+C to exit log stream)..." -ForegroundColor Cyan
        docker logs -f $WORKER_CONTAINER
    }
}


# ==========================================
# EXECUTION
# ==========================================

if ($Mode -eq "Worker" -or $Mode -eq "2") {
    Start-AIWorker

    if (-not $NoNgrok -and -not $Remote -and (Test-Path ".\start-ngrok.ps1")) {
        .\start-ngrok.ps1 -Mode Worker
    }

    Write-Host "`n========================================================" -ForegroundColor Magenta
    Write-Host "       MEDSYNC AI & RAG WORKER IS RUNNING              " -ForegroundColor Magenta
    Write-Host "========================================================" -ForegroundColor Magenta
    Write-Host "Local Endpoint: http://127.0.0.1:$WORKER_PORT"
    Write-Host "`n[CONNECTING TO YOUR RENDER BACKEND]" -ForegroundColor Yellow
    Write-Host "1. Core services (Auth, Database, Prescriptions) run 24/7 on your online Render backend." -ForegroundColor White
    Write-Host "2. Copy the public tunnel URL provided by Ngrok/Cloudflare above." -ForegroundColor White
    Write-Host "3. In your Render environment settings, set:" -ForegroundColor Cyan
    Write-Host "     RAG_WORKER_URL=https://<your-tunnel-url>" -ForegroundColor Cyan
    Write-Host "   (Your Render backend will now delegate heavy embeddings to this worker!)" -ForegroundColor White

} else {
    Start-Backend

    if (-not $NoNgrok -and -not $Remote -and (Test-Path ".\start-ngrok.ps1")) {
        .\start-ngrok.ps1 -Mode Backend
    }

    Write-Host "`n========================================================" -ForegroundColor Magenta
    Write-Host "          MEDSYNC FULL BACKEND READY                   " -ForegroundColor Magenta
    Write-Host "========================================================" -ForegroundColor Magenta
    Write-Host "Local / Server Endpoint: http://127.0.0.1:$BACKEND_PORT"
}

if ($Daemon) {
    Write-Host "`nService is running in background (Daemon mode). Exiting starter process." -ForegroundColor Green
    exit 0
}

Write-Host "`nPress Ctrl+C to stop services or run .\stop-medsync.ps1 in another terminal." -ForegroundColor Yellow
while ($true) { Start-Sleep -Seconds 3600 }
