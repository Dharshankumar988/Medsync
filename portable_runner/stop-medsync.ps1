# Stop MedSync Backend and Face Service (PowerShell)
$ErrorActionPreference = "Stop"
$ScriptPath = $PSScriptRoot
Set-Location -LiteralPath $ScriptPath

Write-Host "Stopping MedSync services..." -ForegroundColor Cyan

$ContainersFile = Join-Path $ScriptPath ".runner_containers.txt"
if (Test-Path $ContainersFile) {
    $containers = Get-Content $ContainersFile | Where-Object { $_ -match "\S" } | Select-Object -Unique
    foreach ($c in $containers) {
        $existing = docker ps -a -q -f "name=^/${c}$"
        if ($existing) {
            Write-Host "Stopping and removing container $c..."
            docker rm -f $c > $null
        }
    }
    Remove-Item -Path $ContainersFile -Force
} else {
    Write-Host "No containers were tracked for this session." -ForegroundColor Yellow
}

$PidsFile = Join-Path $ScriptPath ".runner_pids.txt"
if (Test-Path $PidsFile) {
    $pids = Get-Content $PidsFile | Where-Object { $_ -match "\S" } | Select-Object -Unique
    foreach ($p in $pids) {
        try {
            $process = Get-Process -Id $p -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "Stopping tracked process (PID $p)..."
                Stop-Process -Id $p -Force
            }
        } catch {}
    }
    Remove-Item -Path $PidsFile -Force
} else {
    Write-Host "No extra processes were tracked for this session." -ForegroundColor Yellow
}

Write-Host "Clean shutdown complete." -ForegroundColor Green

