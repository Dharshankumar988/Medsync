# MedSync Backend Stop Script (PowerShell)
$CONTAINER_NAME = "medsync-backend"

Write-Host "Stopping MedSync backend..." -ForegroundColor Cyan

$existing = docker ps -a -q -f "name=^/${CONTAINER_NAME}$"
if ($existing) {
    docker stop $CONTAINER_NAME > $null
    Write-Host "Container stopped successfully." -ForegroundColor Green
    Write-Host "Note: Your environment configuration and persistent data have not been deleted."
} else {
    Write-Host "No MedSync backend container is currently running." -ForegroundColor Yellow
}
