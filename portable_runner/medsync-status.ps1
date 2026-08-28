# MedSync Backend Status Script (PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "MedSync Portable Backend Status" -ForegroundColor Cyan
Write-Host "============================="

$CONTAINER_NAME = "medsync-backend"
$PORT = 8000
$ENV_FILE = ".env"

if (-not (Test-Path $ENV_FILE) -and (Test-Path "medsync.env")) {
    $ENV_FILE = "medsync.env"
}

# Docker Status
$dockerRunning = $false
try {
    $null = docker info 2>&1
    $dockerRunning = $true
} catch {
}

if (-not $dockerRunning) {
    Write-Host "Docker: NOT RUNNING" -ForegroundColor Red
    exit 1
} else {
    Write-Host "Docker: READY" -ForegroundColor Green
}

# Container Status
$container = docker ps -a --format "{{.Status}}" -f "name=^/${CONTAINER_NAME}$"
$image = docker ps -a --format "{{.Image}}" -f "name=^/${CONTAINER_NAME}$"

if (-not $container) {
    Write-Host "Container: NOT FOUND" -ForegroundColor Red
} else {
    if ($container -match "Up") {
        Write-Host "Container: RUNNING ($image)" -ForegroundColor Green
    } else {
        Write-Host "Container: STOPPED ($container)" -ForegroundColor Yellow
    }
}

# Local API Health
try {
    $response = Invoke-WebRequest -Uri "http://localhost:${PORT}/health" -UseBasicParsing -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "Local API: HEALTHY" -ForegroundColor Green
    } else {
        Write-Host "Local API: UNHEALTHY" -ForegroundColor Red
    }
} catch {
    Write-Host "Local API: UNREACHABLE" -ForegroundColor Red
}

# Ngrok Status
$ngrokProcess = Get-Process "ngrok" -ErrorAction SilentlyContinue

if ($ngrokProcess) {
    Write-Host "Ngrok Tunnel: CONNECTED" -ForegroundColor Green
} else {
    Write-Host "Ngrok Tunnel: NOT RUNNING" -ForegroundColor Yellow
}

# Public API Health
$hostname = ""
if (Test-Path $ENV_FILE) {
    $envContent = Get-Content $ENV_FILE
    foreach ($line in $envContent) {
        if ($line -match "^MEDSYNC_API_HOSTNAME=(.*)$") {
            $hostname = $matches[1].Trim()
        }
    }
}

if ($hostname) {
    Write-Host "API URL: https://${hostname}/api/v1" -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri "https://${hostname}/health" -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "Public API: HEALTHY" -ForegroundColor Green
        } else {
            Write-Host "Public API: UNHEALTHY" -ForegroundColor Red
        }
    } catch {
        Write-Host "Public API: UNREACHABLE" -ForegroundColor Red
    }
} else {
    Write-Host "Public API URL: Not Configured" -ForegroundColor Yellow
}

Write-Host "============================="
