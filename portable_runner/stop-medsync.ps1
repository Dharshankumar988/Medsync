# Stop MedSync Backend Script (PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "Stopping MedSync backend..." -ForegroundColor Cyan

$CONTAINER_NAME = "medsync-backend"

$existing = docker ps -a -q -f "name=^/${CONTAINER_NAME}$"
if ($existing) {
    Write-Host "Stopping and removing container $CONTAINER_NAME..."
    docker rm -f $CONTAINER_NAME > $null
    Write-Host "MedSync backend stopped cleanly." -ForegroundColor Green
} else {
    Write-Host "MedSync backend is not running." -ForegroundColor Yellow
}
