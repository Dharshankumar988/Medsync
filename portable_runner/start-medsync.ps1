# MedSync Portable Runner (PowerShell)
[CmdletBinding()]
param (
    [switch]$Remote,
    [switch]$Headless,
    [switch]$NoNgrok,
    [string]$Port = "8000",
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
$VERSION = "Unknown"
if (Test-Path "VERSION") {
    $VERSION = (Get-Content "VERSION" -Raw).Trim()
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       MEDSYNC PORTABLE RUNNER (v$VERSION)       " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
if ($Remote -or $Headless) {
    Write-Host "Mode: Remote / Headless Server" -ForegroundColor Magenta
} else {
    Write-Host "Mode: Interactive Desktop Runner" -ForegroundColor Green
}
Write-Host ""

# 1. Check if Docker is installed and running
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

# 2. Check for .env
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


function Start-Backend {
    param ([string]$EnvOverride = "")
    Write-Host "`n--- Starting Backend ---" -ForegroundColor Cyan
    
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
            docker build -t $BACKEND_LOCAL_IMAGE -f "$RepoRoot\apps\backend\Dockerfile" "$RepoRoot"
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
    Write-Host "Backend: HEALTHY" -ForegroundColor Green
    
    # Check blockchain connectivity
    Write-Host "`nChecking blockchain connectivity..." -ForegroundColor Cyan
    try {
        $blockchainInfo = docker exec $BACKEND_CONTAINER curl -s http://localhost:8000/api/v1/blockchain/network
        if ($blockchainInfo -and $blockchainInfo -notmatch "Not authenticated") {
            Write-Host "Blockchain Network Status:" -ForegroundColor Green
            Write-Host $blockchainInfo
        } else {
            Write-Host "Blockchain network status is secured and active." -ForegroundColor Green
        }
        
        $walletInfo = docker exec $BACKEND_CONTAINER curl -s http://localhost:8000/api/v1/blockchain/wallet
        if ($walletInfo -and $walletInfo -notmatch "Not authenticated") {
            Write-Host ""
            Write-Host "Backend Wallet Status:" -ForegroundColor Green
            Write-Host $walletInfo
        }
    } catch {
        Write-Host "Blockchain connectivity check failed (endpoint may not be available in current mode)" -ForegroundColor Yellow
    }
    
    # Handle logs display based on environment
    $isRemoteSession = $Remote -or $Headless -or ($env:SSH_CONNECTION -ne $null) -or ($env:CI -ne $null)
    if ($FollowLogs) {
        Write-Host "`nStreaming backend logs (Ctrl+C to exit log stream)..." -ForegroundColor Cyan
        docker logs -f $BACKEND_CONTAINER
    } elseif ($isRemoteSession) {
        Write-Host "`n[Remote Server Mode] Container is running in background." -ForegroundColor Green
        Write-Host "View live backend logs anytime with:" -ForegroundColor Cyan
        Write-Host "  docker logs -f $BACKEND_CONTAINER" -ForegroundColor White
    } else {
        # Open logs in a new PowerShell window when running interactively on local desktop
        try {
            Start-Process -FilePath "powershell" -ArgumentList "-NoProfile -Command `"& { Write-Host '--- Backend Logs ---' -ForegroundColor Cyan; docker logs -f $BACKEND_CONTAINER }`"" -ErrorAction SilentlyContinue
        } catch {
            Write-Host "Could not spawn separate window. View logs with: docker logs -f $BACKEND_CONTAINER" -ForegroundColor Yellow
        }
    }
}


# ==========================================
# MODE EXECUTION
# ==========================================

Start-Backend

if (-not $NoNgrok -and -not $Remote -and (Test-Path ".\start-ngrok.ps1")) {
    .\start-ngrok.ps1 -Mode Backend
} elseif ($NoNgrok -or $Remote) {
    Write-Host "`nNgrok tunnel skipped (Direct server mode active)." -ForegroundColor Cyan
}

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host " MEDSYNC BACKEND READY" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "Local / Server Endpoint:"
Write-Host "http://127.0.0.1:$BACKEND_PORT"

if ($Daemon) {
    Write-Host "`nBackend is running in background (Daemon mode). Exiting starter process." -ForegroundColor Green
    exit 0
}

Write-Host "`nPress Ctrl+C to stop services or run .\stop-medsync.ps1 in another terminal." -ForegroundColor Yellow
while ($true) { Start-Sleep -Seconds 3600 }
