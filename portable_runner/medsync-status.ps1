# MedSync Backend Status Script (PowerShell)
$CONTAINER_NAME = "medsync-backend"
$PORT = 8000

Write-Host "=== MedSync Status ===" -ForegroundColor Cyan

# Docker status
try {
    $null = docker info 2>&1
    Write-Host "Docker:           READY"
} catch {
    Write-Host "Docker:           NOT RUNNING" -ForegroundColor Red
    exit 1
}

# Container status
$status = docker inspect -f '{{.State.Status}}' $CONTAINER_NAME 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Container:        $status".ToUpper()
} else {
    Write-Host "Container:        NOT FOUND" -ForegroundColor Yellow
    exit 1
}

# Image version
$image = docker inspect -f '{{.Config.Image}}' $CONTAINER_NAME 2>&1
Write-Host "Image version:    $image"
Write-Host "Port:             $PORT"

# Health status
try {
    $response = Invoke-WebRequest -Uri "http://localhost:${PORT}/health" -UseBasicParsing -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "Backend:          READY" -ForegroundColor Green
        Write-Host "Health endpoint:  HTTP 200"
    } else {
        Write-Host "Backend:          UNHEALTHY" -ForegroundColor Red
        Write-Host "Health endpoint:  HTTP $($response.StatusCode)"
    }
} catch {
    Write-Host "Backend:          UNREACHABLE" -ForegroundColor Red
    Write-Host "Health endpoint:  FAILED"
}

Write-Host "`n--- Recent Logs ---" -ForegroundColor Cyan
docker logs --tail 15 $CONTAINER_NAME
