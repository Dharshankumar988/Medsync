# MedSync Portable Runner (PowerShell)
[CmdletBinding()]
param (
    [string]$Mode = "",
    [switch]$Remote,
    [switch]$Headless,
    [switch]$NoNgrok,
    [string]$Port = "",
    [switch]$FollowLogs,
    [switch]$Daemon,
    [string]$Image = "",
    [switch]$Update,
    [switch]$Help
)

if ($Help) {
    Write-Host ""
    Write-Host "========================================================================" -ForegroundColor Cyan
    Write-Host "               MEDSYNC PORTABLE RUNNER — COMMAND GUIDE                  " -ForegroundColor Cyan
    Write-Host "========================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  .\start-medsync.bat           Start Backend & Ngrok Tunnel (Interactive)" -ForegroundColor Green
    Write-Host "  .\stop-medsync.bat            Stop all services & clean Docker container" -ForegroundColor Yellow
    Write-Host "  .\medsync-status.bat          Check backend health & active ngrok URL" -ForegroundColor White
    Write-Host "  .\start-ngrok.bat             Start / Restart Ngrok tunnel only" -ForegroundColor White
    Write-Host "  .\update-medsync.bat          Update runner scripts & pull latest image" -ForegroundColor White
    Write-Host "  notepad .env                  Edit configuration & API keys" -ForegroundColor White
    Write-Host "  docker logs -f medsync-backend Stream live backend logs" -ForegroundColor Gray
    Write-Host "  docker rm -f medsync-backend   Force remove leftover container" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Flags for start-medsync.ps1:" -ForegroundColor White
    Write-Host "  -FollowLogs                   Stream live logs directly in current window" -ForegroundColor Gray
    Write-Host "  -Daemon                       Run backend in background without waiting" -ForegroundColor Gray
    Write-Host "  -Port 8080                    Run backend on custom port" -ForegroundColor Gray
    Write-Host "  -NoNgrok                      Skip starting the ngrok tunnel" -ForegroundColor Gray
    Write-Host "  -Remote                       Run in remote/headless mode" -ForegroundColor Gray
    Write-Host "========================================================================" -ForegroundColor Cyan
    Write-Host ""
    exit 0
}

$ErrorActionPreference = "Stop"
$ScriptPath = $PSScriptRoot
Set-Location -LiteralPath $ScriptPath

# Initialize tracking files
$ContainersFile = Join-Path $ScriptPath ".runner_containers.txt"
$PidsFile = Join-Path $ScriptPath ".runner_pids.txt"
if (-not (Test-Path $ContainersFile)) { New-Item $ContainersFile -ItemType File -Force | Out-Null }
if (-not (Test-Path $PidsFile)) { New-Item $PidsFile -ItemType File -Force | Out-Null }

# Get version
$VERSION = "1.0.8"
if (Test-Path "VERSION") {
    $VERSION = (Get-Content "VERSION" -Raw).Trim()
}

$Script:KeepRunning = $false

function Stop-MedSyncServices {
    param([string]$Reason = "Shutdown")
    if ($Script:KeepRunning) { return }

    Write-Host "`nStopping MedSync services ($Reason)..." -ForegroundColor Yellow

    # Stop tracked PIDs (ngrok)
    if (Test-Path $PidsFile) {
        $pids = Get-Content $PidsFile -ErrorAction SilentlyContinue | Where-Object { $_ -match "\S" } | Select-Object -Unique
        foreach ($p in $pids) {
            try {
                $process = Get-Process -Id $p -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Host "Stopping process PID $p..." -ForegroundColor Gray
                    Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
                }
            } catch {}
        }
        Remove-Item -Path $PidsFile -Force -ErrorAction SilentlyContinue
    }

    # Stop any running ngrok
    Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

    # Stop tracked containers
    if (Test-Path $ContainersFile) {
        $containers = Get-Content $ContainersFile -ErrorAction SilentlyContinue | Where-Object { $_ -match "\S" } | Select-Object -Unique
        foreach ($c in $containers) {
            Write-Host "Stopping and removing container $c..." -ForegroundColor Gray
            docker rm -f $c 2>&1 | Out-Null
        }
        Remove-Item -Path $ContainersFile -Force -ErrorAction SilentlyContinue
    }

    # Explicit fallback for backend container
    $existing = docker ps -a -q -f "name=^/${BACKEND_CONTAINER}$" 2>$null
    if ($existing) {
        Write-Host "Stopping and removing container $BACKEND_CONTAINER..." -ForegroundColor Gray
        docker rm -f $BACKEND_CONTAINER 2>&1 | Out-Null
    }

    Write-Host "MedSync services stopped cleanly. Containers removed." -ForegroundColor Green
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       MEDSYNC PORTABLE RUNNER (v$VERSION)       " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Execution Target
$Mode = "Full"
Write-Host "`nTarget: Full MedSync Backend" -ForegroundColor Cyan

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
$BACKEND_REGISTRY_IMAGE = if ($Image) { $Image } elseif ($env:BACKEND_IMAGE) { $env:BACKEND_IMAGE } else { "ghcr.io/dharshankumar988/medsync-backend:latest" }
$BACKEND_LOCAL_IMAGE = "medsync-backend:local"
$BACKEND_CONTAINER = "medsync-backend"
$BACKEND_PORT = if ($Port) { [int]$Port } elseif ($env:PORT) { [int]$env:PORT } else { 8000 }


# ==========================================
# FUNCTION: Start-Backend
# ==========================================
function Start-Backend {
    param ([string]$EnvOverride = "")
    Write-Host "`n--- Starting Full Backend ---" -ForegroundColor Cyan
    
    $BACKEND_IMAGE = $null
    Write-Host "Target Image: $BACKEND_REGISTRY_IMAGE" -ForegroundColor Cyan
    $localReg = if (-not $Update) { docker images -q $BACKEND_REGISTRY_IMAGE } else { $null }
    $localBlt = if (-not $Update) { docker images -q $BACKEND_LOCAL_IMAGE } else { $null }
    
    if ($localReg -and -not $Update) {
        $BACKEND_IMAGE = $BACKEND_REGISTRY_IMAGE
        Write-Host "Found registry image locally: $BACKEND_IMAGE" -ForegroundColor Green
    } elseif ($localBlt -and -not $Update) {
        $BACKEND_IMAGE = $BACKEND_LOCAL_IMAGE
        Write-Host "Found locally built image: $BACKEND_IMAGE" -ForegroundColor Green
    } else {
        Write-Host "Pulling Backend image from registry..." -ForegroundColor Cyan
        $pullArgs = "pull --platform linux/amd64 $BACKEND_REGISTRY_IMAGE"
        $pullProcess = Start-Process -FilePath "docker" -ArgumentList $pullArgs -NoNewWindow -Wait -PassThru
        if ($pullProcess.ExitCode -eq 0) {
            $BACKEND_IMAGE = $BACKEND_REGISTRY_IMAGE
            Write-Host "`nUsing registry image: $BACKEND_IMAGE" -ForegroundColor Green
        } else {
            # Stale Docker desktop credentials for ghcr.io often cause 'error from registry: denied' on public images.
            # Attempt an unauthenticated pull by logging out of ghcr.io.
            Write-Host "`nInitial pull failed. Clearing stale ghcr.io credentials and retrying unauthenticated..." -ForegroundColor Yellow
            & docker logout ghcr.io 2>&1 | Out-Null
            $retryProcess = Start-Process -FilePath "docker" -ArgumentList $pullArgs -NoNewWindow -Wait -PassThru
            if ($retryProcess.ExitCode -eq 0) {
                $BACKEND_IMAGE = $BACKEND_REGISTRY_IMAGE
                Write-Host "`nUsing registry image: $BACKEND_IMAGE" -ForegroundColor Green
            } else {
                Write-Host "`nRegistry pull failed. Checking for local source build..." -ForegroundColor Yellow
                $RepoRoot = Resolve-Path (Join-Path $ScriptPath "..")
                $df = if (Test-Path "$RepoRoot\apps\backend\Dockerfile.full") { 
                    "$RepoRoot\apps\backend\Dockerfile.full" 
                } elseif (Test-Path "$RepoRoot\apps\backend\Dockerfile") { 
                    "$RepoRoot\apps\backend\Dockerfile" 
                } else { 
                    $null 
                }

                if ($df -and (Test-Path -Path $df) -and (Test-Path -Path "$RepoRoot\apps\backend")) {
                    Write-Host "Building from source: $df..." -ForegroundColor Cyan
                    docker build -t $BACKEND_LOCAL_IMAGE -f "$df" "$RepoRoot"
                    if ($LASTEXITCODE -ne 0) {
                        Write-Host "ERROR: Failed to build backend image." -ForegroundColor Red
                        exit 1
                    }
                    $BACKEND_IMAGE = $BACKEND_LOCAL_IMAGE
                    Write-Host "Using locally built image: $BACKEND_IMAGE" -ForegroundColor Green
                } else {
                    Write-Host "`nERROR: Unable to pull backend image and local source code is not available." -ForegroundColor Red
                    Write-Host "Troubleshooting suggestions:" -ForegroundColor Yellow
                    Write-Host "  1. If running the portable runner, check your network/internet connection." -ForegroundColor Yellow
                    Write-Host "  2. If Docker has stale GitHub tokens, run: docker logout ghcr.io" -ForegroundColor Yellow
                    Write-Host "  3. To build from source, run from within the full MedSync cloned repository." -ForegroundColor Yellow
                    exit 1
                }
            }
        }
    }

    $existing = docker ps -a -q -f "name=^/${BACKEND_CONTAINER}$"
    if ($existing) {
        docker rm -f $BACKEND_CONTAINER > $null
    }

    docker volume create medsync-model-cache > $null

    $runCmd = "docker run --platform linux/amd64 -d --name $BACKEND_CONTAINER -p `"${BACKEND_PORT}:8000`" -v medsync-model-cache:/models --env-file `"$ENV_FILE`""
    if ($EnvOverride) {
        $runCmd += " $EnvOverride"
    }
    $runCmd += " $BACKEND_IMAGE"
    
    Invoke-Expression $runCmd | Out-Null
    $BACKEND_CONTAINER | Out-File -FilePath $ContainersFile -Append -Encoding utf8

    Write-Host "`nWaiting for backend to become healthy (HTTP 200)..." -ForegroundColor Cyan
    $healthy = $false
    $maxIterations = 150
    $barWidth = 26
    $elapsedSec = 0

    for ($i = 0; $i -lt $maxIterations; $i++) {
        $elapsedSec = ($i + 1) * 2

        $statusText = if ($elapsedSec -lt 12) {
            "Starting container runtime..."
        } elseif ($elapsedSec -lt 26) {
            "Running database migrations..."
        } elseif ($elapsedSec -lt 40) {
            "Verifying schema & database..."
        } else {
            "Warming up API & Uvicorn..."
        }

        # Progress bar percentage (advances smoothly toward ~95% until server returns 200 OK)
        $pct = [math]::Min(95, [int](($elapsedSec / 45) * 88))
        if ($elapsedSec -gt 45) {
            $pct = [math]::Min(98, 88 + [int]((($elapsedSec - 45) / 255) * 10))
        }

        $filled = [math]::Floor(($pct / 100) * $barWidth)
        $empty = [math]::Max(0, $barWidth - $filled)
        $bar = ("#" * [int]$filled) + ("-" * [int]$empty)

        $progressLine = "`r  [$bar] {0,3}% | {1,-32} ({2}s)" -f $pct, $statusText, $elapsedSec
        Write-Host -NoNewline $progressLine -ForegroundColor Cyan

        try {
            Write-Progress -Activity "Starting MedSync Backend" -Status "$statusText ($elapsedSec s)" -PercentComplete $pct
        } catch {}

        Start-Sleep -Seconds 2
        try {
            $response = Invoke-WebRequest -Uri "http://127.0.0.1:${BACKEND_PORT}/health" -UseBasicParsing -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $healthy = $true
                break
            }
        } catch {}
    }

    try { Write-Progress -Activity "Starting MedSync Backend" -Completed } catch {}

    if ($healthy) {
        $fullBar = "#" * $barWidth
        $completeLine = "`r  [$fullBar] 100% | Backend ready and responsive!      ({0}s)`n" -f $elapsedSec
        Write-Host -NoNewline $completeLine -ForegroundColor Green
        Write-Host "Backend: HEALTHY (Port $BACKEND_PORT)" -ForegroundColor Green
    } else {
        Write-Host "`n"
        Write-Host "ERROR: Backend failed health check after $elapsedSec seconds." -ForegroundColor Red
        docker logs --tail 30 $BACKEND_CONTAINER
        exit 1
    }
}


# ==========================================
# EXECUTION (Wrapped for Ctrl+C Auto-Cleanup)
# ==========================================
try {
    Start-Backend

    if (-not $NoNgrok -and -not $Remote -and (Test-Path ".\start-ngrok.ps1")) {
        .\start-ngrok.ps1 -Mode Backend
    }

    Write-Host "`n========================================================" -ForegroundColor Magenta
    Write-Host "          MEDSYNC FULL BACKEND READY                   " -ForegroundColor Magenta
    Write-Host "========================================================" -ForegroundColor Magenta
    Write-Host "Local Server Endpoint:  http://127.0.0.1:$BACKEND_PORT" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Quick Commands (run in another terminal):" -ForegroundColor White
    Write-Host "  .\stop-medsync.bat           Stop backend & clean Docker container" -ForegroundColor Gray
    Write-Host "  .\medsync-status.bat         Check backend health & active ngrok URL" -ForegroundColor Gray
    Write-Host "  .\start-ngrok.bat            Start / restart ngrok tunnel only" -ForegroundColor Gray
    Write-Host "  docker logs -f $BACKEND_CONTAINER Stream live backend logs" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Tip: Press Ctrl+C in this window anytime to cleanly stop services." -ForegroundColor Yellow

    if ($FollowLogs) {
        Write-Host "`nStreaming backend logs (Ctrl+C to stop services)..." -ForegroundColor Cyan
        docker logs -f $BACKEND_CONTAINER
        exit 0
    }

    if ($Daemon) {
        Write-Host "`nService is running in background (Daemon mode). Exiting starter process." -ForegroundColor Green
        $Script:KeepRunning = $true
        exit 0
    }

    while ($true) {
        Start-Sleep -Seconds 1
    }
}
finally {
    if (-not $Script:KeepRunning) {
        Stop-MedSyncServices -Reason "Interrupted / Ctrl+C"
    }
}
