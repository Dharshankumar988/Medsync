[CmdletBinding()]
param (
    [string]$Mode = "Backend"
)

$ErrorActionPreference = "Stop"
$ScriptPath = $PSScriptRoot
Set-Location -LiteralPath $ScriptPath

Write-Host "Starting Ngrok Tunnel for $Mode..." -ForegroundColor Cyan

# 1. Check if ngrok is available
$NgrokPath = ""
if (Get-Command "ngrok" -ErrorAction SilentlyContinue) {
    $NgrokPath = (Get-Command "ngrok").Source
    if (-not $NgrokPath) { $NgrokPath = "ngrok" }
} else {
    $LocalNgrokPath = Join-Path $ScriptPath "ngrok.exe"
    if (Test-Path -LiteralPath $LocalNgrokPath) {
        $NgrokPath = $LocalNgrokPath
    } else {
        $CommonLocations = @(
            "$env:LOCALAPPDATA\Microsoft\WindowsApps\ngrok.exe",
            "$env:ProgramFiles\ngrok\ngrok.exe",
            "${env:ProgramFiles(x86)}\ngrok\ngrok.exe",
            "$env:LOCALAPPDATA\ngrok\ngrok.exe",
            "$env:LOCALAPPDATA\Microsoft\WinGet\Links\ngrok.exe",
            "$env:ProgramData\chocolatey\bin\ngrok.exe",
            "$env:USERPROFILE\scoop\shims\ngrok.exe",
            "$env:USERPROFILE\Downloads\ngrok.exe"
        )
        
        foreach ($loc in $CommonLocations) {
            if (Test-Path -LiteralPath $loc) {
                $NgrokPath = $loc
                break
            }
        }

        if (-not $NgrokPath) {
            Write-Host "ngrok not found. Please install ngrok or place ngrok.exe in the portable_runner folder." -ForegroundColor Red
            exit 1
        }
    }
}

# 2. Check for .env variables based on Mode
$EnvPath = Join-Path $ScriptPath ".env"
$AuthToken = ""
$Url = ""
$TargetPort = 8000

if ($Mode -eq "FaceService") {
    $TokenVar = "^FACE_SERVICE_NGROK_AUTHTOKEN=(.*)"
    $UrlVar = "^FACE_SERVICE_NGROK_URL=(.*)"
    $TargetPort = 8080
} else {
    $TokenVar = "^BACKEND_NGROK_AUTHTOKEN=(.*)"
    $UrlVar = "^BACKEND_NGROK_URL=(.*)"
    $TargetPort = 8000
}

if (Test-Path -LiteralPath $EnvPath) {
    $envContent = Get-Content $EnvPath
    foreach ($line in $envContent) {
        if ($line -match $TokenVar) { $AuthToken = $matches[1].Trim() }
        if ($line -match $UrlVar) { $Url = $matches[1].Trim() }
    }
}

if (-not $AuthToken) {
    Write-Host "`nWARNING: Missing Ngrok Auth Token in .env for $Mode!" -ForegroundColor Yellow
    $AuthToken = Read-Host "Please enter your Ngrok Authtoken"
    if (-not $AuthToken) {
        Write-Host "Aborting. Missing credentials." -ForegroundColor Red
        exit 1
    }
}

# 3. Authenticate
try {
    & $NgrokPath config add-authtoken $AuthToken *>&1 | Out-Null
} catch {
    Write-Host "ERROR: Failed to add Ngrok authtoken." -ForegroundColor Red
    exit 1
}

# 4. Start Tunnel
$ngrokArgs = @("http")
if ($Url) {
    $ngrokArgs += "--url=$Url"
    Write-Host "Routing traffic to local port $TargetPort using static URL: $Url ..." -ForegroundColor Cyan
} else {
    Write-Host "Routing traffic to local port $TargetPort using dynamically generated URL ..." -ForegroundColor Cyan
}
$ngrokArgs += "$TargetPort"

# We must start ngrok in a separate process so we can track its PID and query its API for dynamic URLs
$process = Start-Process -FilePath $NgrokPath -ArgumentList $ngrokArgs -PassThru -WindowStyle Minimized

$PidFile = Join-Path $ScriptPath ".runner_pids.txt"
$process.Id | Out-File -FilePath $PidFile -Append -Encoding utf8

# 5. Query active URL
Write-Host "Waiting for ngrok to initialize..."
Start-Sleep -Seconds 3

$ActiveUrl = ""
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:4040/api/tunnels" -UseBasicParsing -ErrorAction Stop
    $data = $response.Content | ConvertFrom-Json
    if ($data.tunnels.Count -gt 0) {
        $ActiveUrl = $data.tunnels[0].public_url
    }
} catch {
    # If API fails, fallback to user provided url if exists
    if ($Url) {
        $ActiveUrl = $Url
    }
}

if ($ActiveUrl) {
    Write-Host "`n=== NGROK STATUS ===" -ForegroundColor Green
    Write-Host "Active $Mode Public URL: " -NoNewline
    Write-Host $ActiveUrl -ForegroundColor Cyan
    Write-Host "====================`n" -ForegroundColor Green
} else {
    Write-Host "WARNING: Could not retrieve active tunnel URL. Tunnel may not be running correctly." -ForegroundColor Yellow
}
