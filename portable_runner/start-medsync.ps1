# MedSync Portable Runner (PowerShell)
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
Write-Host "           MEDSYNC PORTABLE RUNNER      " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "What would you like to run?"
Write-Host "1. Backend only"
Write-Host "2. Backend + Face Service"
Write-Host "3. Face Service only"
Write-Host ""
$choice = Read-Host "Enter your choice"

if ($choice -notmatch "^[1-3]$") {
    Write-Host "Invalid choice. Exiting." -ForegroundColor Red
    exit 1
}

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
$BACKEND_PORT = 8000

$FACE_REGISTRY_IMAGE = "ghcr.io/dharshankumar988/medsync-face-service:latest"
$FACE_LOCAL_IMAGE = "medsync-face-service:local"
$FACE_CONTAINER = "medsync-face-service"
$FACE_PORT = 8080

function Start-FaceService {
    Write-Host "`n--- Starting Face Service ---" -ForegroundColor Cyan
    
    # Try pulling pre-built image from GHCR first
    $FACE_IMAGE = $null
    Write-Host "Pulling Face Service image from registry..." -ForegroundColor Cyan
    cmd /c "docker pull $FACE_REGISTRY_IMAGE" 2>&1
    if ($LASTEXITCODE -eq 0) {
        $FACE_IMAGE = $FACE_REGISTRY_IMAGE
        Write-Host "Using registry image: $FACE_IMAGE" -ForegroundColor Green
    } else {
        Write-Host "Registry pull failed. Building from source..." -ForegroundColor Yellow
        $RepoRoot = Resolve-Path (Join-Path $ScriptPath "..")
        $FaceDockerfile = Join-Path $RepoRoot "apps" "face-service" "Dockerfile"
        if (-not (Test-Path $FaceDockerfile)) {
            Write-Host "ERROR: Face Service Dockerfile not found and registry image unavailable." -ForegroundColor Red
            exit 1
        }
        docker build -t $FACE_LOCAL_IMAGE -f "$FaceDockerfile" "$RepoRoot\apps\face-service"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Failed to build face service image." -ForegroundColor Red
            exit 1
        }
        $FACE_IMAGE = $FACE_LOCAL_IMAGE
        Write-Host "Using locally built image: $FACE_IMAGE" -ForegroundColor Green
    }

    $existing = docker ps -a -q -f "name=^/${FACE_CONTAINER}$"
    if ($existing) {
        docker rm -f $FACE_CONTAINER > $null
    }

    docker run -d --name $FACE_CONTAINER -p "${FACE_PORT}:${FACE_PORT}" $FACE_IMAGE | Out-Null
    $FACE_CONTAINER | Out-File -FilePath $ContainersFile -Append -Encoding utf8

    Write-Host "Waiting for Face Service to become healthy (HTTP 200)..."
    $healthy = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 2
        try {
            $response = Invoke-WebRequest -Uri "http://127.0.0.1:${FACE_PORT}/health" -UseBasicParsing -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $healthy = $true
                break
            }
        } catch {}
    }
    
    if (-not $healthy) {
        Write-Host "ERROR: Face Service failed health check." -ForegroundColor Red
        docker logs --tail 30 $FACE_CONTAINER
        exit 1
    }
    Write-Host "Face Service: HEALTHY" -ForegroundColor Green
}

function Start-Backend {
    param ([string]$EnvOverride = "")
    Write-Host "`n--- Starting Backend ---" -ForegroundColor Cyan
    
    # Try pulling pre-built image from GHCR first
    $BACKEND_IMAGE = $null
    Write-Host "Pulling Backend image from registry..." -ForegroundColor Cyan
    cmd /c "docker pull $BACKEND_REGISTRY_IMAGE" 2>&1
    if ($LASTEXITCODE -eq 0) {
        $BACKEND_IMAGE = $BACKEND_REGISTRY_IMAGE
        Write-Host "Using registry image: $BACKEND_IMAGE" -ForegroundColor Green
    } else {
        Write-Host "Registry pull failed. Building from source..." -ForegroundColor Yellow
        $RepoRoot = Resolve-Path (Join-Path $ScriptPath "..")
        docker build -t $BACKEND_LOCAL_IMAGE -f "$RepoRoot\apps\backend\Dockerfile" "$RepoRoot"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Failed to build backend image." -ForegroundColor Red
            exit 1
        }
        $BACKEND_IMAGE = $BACKEND_LOCAL_IMAGE
        Write-Host "Using locally built image: $BACKEND_IMAGE" -ForegroundColor Green
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
}

function Verify-Docker-Networking {
    Write-Host "Verifying backend can reach Face Service via host.docker.internal..."
    $result = docker exec $BACKEND_CONTAINER curl -s -f http://host.docker.internal:8080/health
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Backend cannot reach host.docker.internal:8080. This usually means Docker Desktop's host networking is disabled or misconfigured." -ForegroundColor Red
        exit 1
    }
    Write-Host "Network Verification: OK" -ForegroundColor Green
}


# ==========================================
# MODE EXECUTION
# ==========================================

if ($choice -eq "1") {
    Start-Backend
    
    if (Test-Path ".\start-ngrok.ps1") {
        .\start-ngrok.ps1 -Mode Backend
    }
    
    Write-Host "`n========================================" -ForegroundColor Magenta
    Write-Host " BACKEND ONLY" -ForegroundColor Magenta
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host "Backend:"
    Write-Host "http://127.0.0.1:$BACKEND_PORT"
    Write-Host "`nFace Service:"
    Write-Host "NOT RUNNING"
}
elseif ($choice -eq "2") {
    Start-FaceService
    
    # Mode 2 overrides FACE_VERIFICATION_URL dynamically
    Start-Backend -EnvOverride "-e FACE_VERIFICATION_URL=http://host.docker.internal:8080"
    
    Verify-Docker-Networking
    
    if (Test-Path ".\start-ngrok.ps1") {
        .\start-ngrok.ps1 -Mode Backend
    }
    
    Write-Host "`n========================================" -ForegroundColor Magenta
    Write-Host " BACKEND + FACE SERVICE" -ForegroundColor Magenta
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host "Backend:"
    Write-Host "http://127.0.0.1:$BACKEND_PORT"
    Write-Host "`nFace Service:"
    Write-Host "http://127.0.0.1:$FACE_PORT"
    Write-Host "`nPublic Face Service URL:"
    Write-Host "NOT USED"
}
elseif ($choice -eq "3") {
    Start-FaceService
    
    if (Test-Path ".\start-ngrok.ps1") {
        .\start-ngrok.ps1 -Mode FaceService
    }
    
    Write-Host "`n========================================" -ForegroundColor Magenta
    Write-Host " FACE SERVICE ONLY" -ForegroundColor Magenta
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host "Face Service:"
    Write-Host "http://127.0.0.1:$FACE_PORT"
    Write-Host "`nBackend:"
    Write-Host "NOT RUNNING"
}

Write-Host "`nPress Ctrl+C to stop services or run .\stop-medsync.ps1 in another terminal." -ForegroundColor Yellow
while ($true) { Start-Sleep -Seconds 3600 }

