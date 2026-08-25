# MedSync Backend Update Script (PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "Updating MedSync backend..." -ForegroundColor Cyan

# Check for .env
$ScriptPath = $PSScriptRoot
Set-Location -LiteralPath $ScriptPath

$ENV_FILE = Join-Path $ScriptPath ".env"
if (-not (Test-Path -LiteralPath $ENV_FILE)) {
    $legacyEnv = Join-Path $ScriptPath "medsync.env"
    if (Test-Path -LiteralPath $legacyEnv) {
        $ENV_FILE = $legacyEnv
    } else {
        $ENV_FILE = ".env" # Fallback to local
    }
}

# Image configuration
$IMAGE_NAME = "ghcr.io/dharshankumar988/medsync-backend:latest"
$CONTAINER_NAME = "medsync-backend"
$PORT = 8000

# ARM Check
$PLATFORM = ""
$ARCHITECTURE = (Get-CimInstance Win32_OperatingSystem).OSArchitecture
if ($ARCHITECTURE -match "ARM") {
    $PLATFORM = "--platform linux/amd64"
}

# Pull latest image
Write-Host "Pulling latest image: $IMAGE_NAME..."
if ($PLATFORM) {
    docker pull --platform linux/amd64 $IMAGE_NAME
} else {
    docker pull $IMAGE_NAME
}

# Stop and remove existing container
$existing = docker ps -a -q -f "name=^/${CONTAINER_NAME}$"
if ($existing) {
    Write-Host "Stopping existing container..."
    docker rm -f $CONTAINER_NAME > $null
}

# Start new container
Write-Host "Starting container $CONTAINER_NAME on port $PORT..."

# Ensure volume exists
docker volume create medsync-model-cache > $null

if ($PLATFORM) {
    docker run -d $PLATFORM --name $CONTAINER_NAME -p "${PORT}:8000" -v medsync-model-cache:/models --env-file $ENV_FILE $IMAGE_NAME
} else {
    docker run -d --name $CONTAINER_NAME -p "${PORT}:8000" -v medsync-model-cache:/models --env-file $ENV_FILE $IMAGE_NAME
}

# Wait for health check
Write-Host "Waiting for backend to become healthy..."
$healthy = $false
for ($i = 0; $i -lt 150; $i++) {
    Start-Sleep -Seconds 2
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:${PORT}/health" -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $healthy = $true
            break
        }
    } catch {
        # ignore errors while waiting
    }
}

if ($healthy) {
    Write-Host "Update successful! Backend is HEALTHY." -ForegroundColor Green
    
    # Check Tailscale Funnel
    if (Test-Path ".\start-tailscale-funnel.ps1") {
        Write-Host "Checking Tailscale Funnel..."
        .\start-tailscale-funnel.ps1
    }
} else {
    Write-Host "WARNING: Backend failed health check after update." -ForegroundColor Red
}
