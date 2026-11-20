# Stop MedSync Backend (PowerShell)
$ErrorActionPreference = "Stop"
$ScriptPath = $PSScriptRoot
Set-Location -LiteralPath $ScriptPath

Write-Host "Stopping MedSync services..." -ForegroundColor Cyan

$ContainersFile = Join-Path $ScriptPath ".runner_containers.txt"
if (Test-Path $ContainersFile) {
    $containers = Get-Content $ContainersFile -ErrorAction SilentlyContinue | Where-Object { $_ -match "\S" } | Select-Object -Unique
    foreach ($c in $containers) {
        $existing = docker ps -a -q -f "name=^/${c}$" 2>$null
        if ($existing) {
            Write-Host "Stopping and removing container $c..."
            docker rm -f $c > $null 2>&1
        }
    }
    Remove-Item -Path $ContainersFile -Force -ErrorAction SilentlyContinue
}

# Explicitly guarantee default container is removed
$defaultBackend = docker ps -a -q -f "name=^/medsync-backend$" 2>$null
if ($defaultBackend) {
    Write-Host "Stopping container medsync-backend..."
    docker rm -f medsync-backend > $null 2>&1
}

$PidsFile = Join-Path $ScriptPath ".runner_pids.txt"
if (Test-Path $PidsFile) {
    $pids = Get-Content $PidsFile -ErrorAction SilentlyContinue | Where-Object { $_ -match "\S" } | Select-Object -Unique
    foreach ($p in $pids) {
        try {
            $process = Get-Process -Id $p -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "Stopping tracked process (PID $p)..."
                Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
            }
        } catch {}
    }
    Remove-Item -Path $PidsFile -Force -ErrorAction SilentlyContinue
}

# Also stop any running ngrok
$ngroks = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
if ($ngroks) {
    Write-Host "Stopping ngrok tunnel processes..."
    $ngroks | Stop-Process -Force -ErrorAction SilentlyContinue
}

Write-Host "Clean shutdown complete. Docker containers and tunnels stopped." -ForegroundColor Green
