# Start Tailscale Funnel to securely expose MedSync to the internet
$ErrorActionPreference = "Stop"

Write-Host "Starting Tailscale Funnel for MedSync..." -ForegroundColor Cyan

# Check if tailscale is installed
try {
    $tsStatus = tailscale status
} catch {
    Write-Host "ERROR: Tailscale is not installed or not running." -ForegroundColor Red
    Write-Host "Please install Tailscale from https://tailscale.com/download/windows" -ForegroundColor Yellow
    exit 1
}

Write-Host "Routing traffic to local port 8000..."

# Start funnel in the foreground
try {
    tailscale funnel 8000
} catch {
    Write-Host "ERROR: Failed to start Tailscale Funnel." -ForegroundColor Red
    Write-Host "Did you enable Funnel in your Tailscale Admin Console? https://login.tailscale.com/admin/acls/funnel" -ForegroundColor Yellow
    exit 1
}
