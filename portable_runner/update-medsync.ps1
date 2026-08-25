# MedSync Backend Update Script (PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "Updating MedSync backend..." -ForegroundColor Cyan

# 1. Pull latest image
$IMAGE_NAME = "ghcr.io/dharshankumar988/medsync-backend:latest"
Write-Host "Pulling latest image: $IMAGE_NAME..."
docker pull $IMAGE_NAME

# 2. Restart using start script
Write-Host "Restarting container..."
& .\start-medsync.ps1

Write-Host "Update complete!" -ForegroundColor Green
