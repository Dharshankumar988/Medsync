# MedSync Backend Startup Script (PowerShell)
$ErrorActionPreference = "Stop"

# Get version
$VERSION = "Unknown"
if (Test-Path "VERSION") {
    $VERSION = Get-Content "VERSION" -Raw
    $VERSION = $VERSION.Trim()
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MedSync Portable Runner v$VERSION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Check if Docker is installed
if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Docker is not installed or not in your PATH." -ForegroundColor Red
    Write-Host "Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
}

# 2. Check if Docker is running
try {
    $null = docker info 2>&1
} catch {
    Write-Host "ERROR: Docker daemon is not running." -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again."
    exit 1
}

# 3. Check for .env
$ScriptPath = $PSScriptRoot
Set-Location -LiteralPath $ScriptPath

$ENV_FILE = Join-Path $ScriptPath ".env"
if (-not (Test-Path -LiteralPath $ENV_FILE)) {
    # Fallback to medsync.env for backward compatibility
    $legacyEnv = Join-Path $ScriptPath "medsync.env"
    if (Test-Path -LiteralPath $legacyEnv) {
        $ENV_FILE = $legacyEnv
        Write-Host "NOTE: Using old medsync.env file. Consider renaming it to .env." -ForegroundColor Yellow
    } else {
        Write-Host "ERROR: .env file not found in $ScriptPath" -ForegroundColor Red
        Write-Host "Please run: Copy-Item .env.example .env"
        Write-Host "And fill in your credentials."
        exit 1
    }
}

# Simple validation of .env
$envContent = Get-Content $ENV_FILE
if ($envContent -match "SUPABASE_URL=\s*$") {
    Write-Host "WARNING: SUPABASE_URL appears to be empty in $ENV_FILE" -ForegroundColor Yellow
}
if ($envContent -match "GROQ_API_KEY=\s*$") {
    Write-Host "WARNING: GROQ_API_KEY appears to be empty in $ENV_FILE" -ForegroundColor Yellow
}

# 4. ARM Check
$PLATFORM = ""
$ARCHITECTURE = (Get-CimInstance Win32_OperatingSystem).OSArchitecture
if ($ARCHITECTURE -match "ARM") {
    Write-Host "NOTE: ARM architecture detected. Using built-in emulation (--platform linux/amd64)." -ForegroundColor Yellow
    $PLATFORM = "--platform linux/amd64"
}

# 5. Image configuration
$IMAGE_NAME = "ghcr.io/dharshankumar988/medsync-backend:latest"
$CONTAINER_NAME = "medsync-backend"
$PORT = 8000

# 6. Pull image
Write-Host "Pulling image: $IMAGE_NAME..."
try {
    if ($PLATFORM) {
        docker pull --platform linux/amd64 $IMAGE_NAME
    } else {
        docker pull $IMAGE_NAME
    }
} catch {
    Write-Host "`nERROR: Failed to pull image $IMAGE_NAME" -ForegroundColor Red
    Write-Host "Possible causes:"
    Write-Host "- The image does not exist yet."
    Write-Host "- The repository/package is private and you need to log in."
    Write-Host "  If private, run: docker login ghcr.io -u <your-github-username>"
    Write-Host "- Network problem."
    exit 1
}

# 7. Stop existing container if running
$existing = docker ps -a -q -f "name=^/${CONTAINER_NAME}$"
if ($existing) {
    Write-Host "Stopping and removing existing container..."
    docker rm -f $CONTAINER_NAME > $null
}

# 8. Start container
Write-Host "Starting container $CONTAINER_NAME on port $PORT..."

# Ensure volume exists
docker volume create medsync-model-cache > $null

if ($PLATFORM) {
    docker run -d --platform linux/amd64 --name $CONTAINER_NAME -p "${PORT}:8000" -v medsync-model-cache:/models --env-file $ENV_FILE $IMAGE_NAME
} else {
    docker run -d --name $CONTAINER_NAME -p "${PORT}:8000" -v medsync-model-cache:/models --env-file $ENV_FILE $IMAGE_NAME
}

# 9. Wait for local health check
Write-Host "Waiting for backend to become healthy (HTTP 200)..."
Write-Host "NOTE: First startup may take 2-5 minutes to download AI model caches." -ForegroundColor Yellow
$healthy = $false
for ($i = 0; $i -lt 150; $i++) {
    # Use an indeterminate progress bar since we cannot parse the Docker logs for exact byte percentage
    Write-Progress -Activity "Starting MedSync Backend" -Status "Waiting for AI models to download and server to start..." -PercentComplete -1
    
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
Write-Progress -Activity "Starting MedSync Backend" -Completed

if (-not $healthy) {
    Write-Host "`nWARNING: Backend did not report healthy within 5 minutes." -ForegroundColor Red
    Write-Host "Docker container status:"
    docker ps -f "name=^/${CONTAINER_NAME}$"
    Write-Host "`nRecent logs:"
    docker logs --tail 20 $CONTAINER_NAME
    Write-Host "`nTroubleshooting:"
    Write-Host "- Verify your .env variables (especially Database connection)."
    Write-Host "- Ensure port 8000 is not blocked or in use by another app."
    exit 1
}

Write-Host "Backend: HEALTHY" -ForegroundColor Green

# 10. Start Ngrok Tunnel if present
if (Test-Path ".\start-ngrok.ps1") {
    .\start-ngrok.ps1
} else {
    Write-Host "`n=== STATUS ===" -ForegroundColor Green
    Write-Host "Docker: READY"
    Write-Host "Image:  READY"
    Write-Host "Container: RUNNING"
    Write-Host "Health: OK"
    Write-Host "MedSync backend is READY on http://localhost:${PORT}." -ForegroundColor Green
    Write-Host "================`n"
}
