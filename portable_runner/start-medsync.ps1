# MedSync Backend Startup Script (PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "MedSync backend starting..." -ForegroundColor Cyan

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

# 3. Check for medsync.env
if (-not (Test-Path "medsync.env")) {
    Write-Host "ERROR: medsync.env file not found in the current directory." -ForegroundColor Red
    Write-Host "Please copy medsync.env.example to medsync.env and fill in your credentials."
    exit 1
}

# 4. Image configuration
$IMAGE_NAME = "ghcr.io/dharshankumar988/medsync-backend:latest"
$CONTAINER_NAME = "medsync-backend"
$PORT = 8000

# 5. Pull image
Write-Host "Pulling latest image: $IMAGE_NAME..."
docker pull $IMAGE_NAME

# 6. Stop existing container if running
$existing = docker ps -a -q -f "name=^/${CONTAINER_NAME}$"
if ($existing) {
    Write-Host "Stopping existing container..."
    docker rm -f $CONTAINER_NAME > $null
}

# 7. Start container
Write-Host "Starting container $CONTAINER_NAME on port $PORT..."
docker run -d --name $CONTAINER_NAME -p "${PORT}:8000" --env-file medsync.env $IMAGE_NAME

# 8. Wait for health check
Write-Host "Waiting for backend to become healthy..."
$healthy = $false
for ($i = 0; $i -lt 30; $i++) {
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
    Write-Host "`n=== STATUS ===" -ForegroundColor Green
    Write-Host "Container:  $CONTAINER_NAME"
    Write-Host "Local API:  http://localhost:${PORT}"
    Write-Host "Health:     http://localhost:${PORT}/health"
    Write-Host "Status:     READY" -ForegroundColor Green
    Write-Host "================`n"
} else {
    Write-Host "`nWARNING: Backend did not report healthy within 60 seconds." -ForegroundColor Yellow
    Write-Host "Check logs with: docker logs $CONTAINER_NAME"
}
