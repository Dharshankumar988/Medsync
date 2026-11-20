[CmdletBinding()]
param (
    [string]$Mode = "Backend"
)

$ErrorActionPreference = "Stop"
$ScriptPath = $PSScriptRoot
Set-Location -LiteralPath $ScriptPath

Write-Host "Starting Ngrok Tunnel for $Mode..." -ForegroundColor Cyan

# 1. Check if ngrok is available (Prioritize local folder first)
$NgrokPath = ""
$LocalNgrokPath = Join-Path $ScriptPath "ngrok.exe"

if (Test-Path -LiteralPath $LocalNgrokPath) {
    $NgrokPath = $LocalNgrokPath
} elseif (Get-Command "ngrok" -ErrorAction SilentlyContinue) {
    $NgrokPath = (Get-Command "ngrok").Source
    if (-not $NgrokPath) { $NgrokPath = "ngrok" }
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
}

# Auto-download ngrok if not found on this system
if (-not $NgrokPath -or -not (Test-Path -LiteralPath $NgrokPath)) {
    Write-Host "ngrok binary not found. Automatically downloading latest ngrok v3 for Windows..." -ForegroundColor Cyan
    try {
        $tempNgrokZip = Join-Path $env:TEMP "ngrok-latest.zip"
        curl.exe -L -o "$tempNgrokZip" "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip"
        if (Test-Path $tempNgrokZip) {
            Expand-Archive -Path $tempNgrokZip -DestinationPath $ScriptPath -Force
            Remove-Item -Path $tempNgrokZip -Force -ErrorAction SilentlyContinue
        }
        if (Test-Path -LiteralPath $LocalNgrokPath) {
            $NgrokPath = $LocalNgrokPath
            Write-Host "ngrok v3 downloaded and installed into portable runner successfully." -ForegroundColor Green
        }
    } catch {
        Write-Host "Notice: Failed to auto-download ngrok." -ForegroundColor Yellow
    }
}

if (-not $NgrokPath) {
    Write-Host "ERROR: ngrok not found. Please install ngrok or place ngrok.exe in the portable_runner folder." -ForegroundColor Red
    exit 1
}

# Version check: ensure minimum version >= 3.30.0 for free tier compatibility
try {
    $verString = (& $NgrokPath version 2>&1 | Out-String).Trim()
    if ($verString -match "version\s+(\d+)\.(\d+)") {
        $maj = [int]$matches[1]
        $min = [int]$matches[2]
        if ($maj -lt 3 -or ($maj -eq 3 -and $min -lt 30)) {
            Write-Host "WARNING: Found outdated $verString (Minimum required is 3.30.0)." -ForegroundColor Yellow
            Write-Host "Upgrading to latest ngrok in $LocalNgrokPath..." -ForegroundColor Cyan
            $tempNgrokZip = Join-Path $env:TEMP "ngrok-latest.zip"
            curl.exe -L -o "$tempNgrokZip" "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip"
            if (Test-Path $tempNgrokZip) {
                Expand-Archive -Path $tempNgrokZip -DestinationPath $ScriptPath -Force
                Remove-Item -Path $tempNgrokZip -Force -ErrorAction SilentlyContinue
                $NgrokPath = $LocalNgrokPath
                $verString = (& $NgrokPath version 2>&1 | Out-String).Trim()
                Write-Host "ngrok upgraded to $verString." -ForegroundColor Green
            }
        }
    }
    Write-Host "Using: $verString ($NgrokPath)" -ForegroundColor Gray
} catch {}

# 2. Check for .env variables based on Mode
$EnvPath = Join-Path $ScriptPath ".env"
$AuthToken = ""
$Url = ""
$TargetPort = 8000

if (Test-Path -LiteralPath $EnvPath) {
    $envContent = Get-Content $EnvPath
    foreach ($line in $envContent) {
        $trimmed = $line.Trim()
        if ($trimmed -and -not $trimmed.StartsWith("#") -and $trimmed.Contains("=")) {
            $parts = $trimmed.Split("=", 2)
            $k = $parts[0].Trim()
            $v = $parts[1].Trim().Trim('"').Trim("'")
            if ($Mode -eq "Worker" -or $Mode -eq "AI") {
                if ($k -in @("AI_NGROK_AUTHTOKEN", "BACKEND_NGROK_AUTHTOKEN", "NGROK_AUTHTOKEN") -and -not $AuthToken) {
                    $AuthToken = $v
                }
                if ($k -in @("AI_NGROK_URL", "RAG_WORKER_NGROK_URL", "WORKER_NGROK_URL") -and -not $Url) {
                    $Url = $v
                }
            } else {
                if ($k -in @("BACKEND_NGROK_AUTHTOKEN", "NGROK_AUTHTOKEN") -and -not $AuthToken) {
                    $AuthToken = $v
                }
                if ($k -eq "BACKEND_NGROK_URL" -and -not $Url) {
                    $Url = $v
                }
            }
        }
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

# 4. Stop any existing ngrok process first to prevent port/domain session conflicts
Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 400

# 5. Build ngrok arguments
$ngrokArgs = @("http")
if ($Url) {
    # Strip any http://, https://, or trailing slash from domain
    $cleanUrl = ($Url -replace "^https?://", "").TrimEnd("/")
    $ngrokArgs += "--url=$cleanUrl"
    Write-Host "Routing traffic to local port $TargetPort using static domain: $cleanUrl ..." -ForegroundColor Cyan
} else {
    Write-Host "Routing traffic to local port $TargetPort using dynamically generated URL ..." -ForegroundColor Cyan
}
$ngrokArgs += "$TargetPort"

# Log output to diagnose if ngrok crashes
$ngrokLog = Join-Path $ScriptPath "ngrok.log"
$ngrokArgs += "--log=$ngrokLog"

# Start process minimized to prevent jarring flashing popups
$process = Start-Process -FilePath $NgrokPath -ArgumentList $ngrokArgs -PassThru -WindowStyle Minimized

$PidFile = Join-Path $ScriptPath ".runner_pids.txt"
if ($process -and $process.Id) {
    $process.Id | Out-File -FilePath $PidFile -Append -Encoding utf8
}

# 6. Verify local server readiness
Write-Host "Verifying local server responsiveness on port $TargetPort..."
$MaxRetries = 15
$RetryCount = 0
$IsHealthy = $false

while ($RetryCount -lt $MaxRetries) {
    try {
        if ($Mode -eq "Backend") {
            $response = Invoke-WebRequest -Uri "http://127.0.0.1:$TargetPort/health" -UseBasicParsing -ErrorAction Stop
        } else {
            $response = Invoke-WebRequest -Uri "http://127.0.0.1:$TargetPort/" -UseBasicParsing -ErrorAction Stop
        }
        if ($response.StatusCode -eq 200) {
            $IsHealthy = $true
            break
        }
    } catch {
        # Retry
    }
    Start-Sleep -Seconds 1
    $RetryCount++
}

if (-not $IsHealthy) {
    Write-Host "NOTE: Local backend on port $TargetPort is not responding." -ForegroundColor Yellow
    Write-Host "      If you want to start the Docker backend AND tunnel together, run: .\start-medsync.bat" -ForegroundColor Yellow
}

# 7. Query active tunnel URL
Write-Host "Waiting for ngrok to initialize..."
Start-Sleep -Seconds 2

# Check if ngrok died immediately
if ($process -and $process.HasExited) {
    Write-Host "ERROR: ngrok process terminated unexpectedly (ExitCode $($process.ExitCode))." -ForegroundColor Red
    if (Test-Path $ngrokLog) {
        Write-Host "Ngrok log output:" -ForegroundColor Yellow
        Get-Content $ngrokLog -Tail 10 | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    }
    exit 1
}

$ActiveUrl = ""
for ($attempt = 0; $attempt -lt 5; $attempt++) {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:4040/api/tunnels" -UseBasicParsing -ErrorAction Stop
        $data = $response.Content | ConvertFrom-Json
        if ($data.tunnels.Count -gt 0) {
            $ActiveUrl = $data.tunnels[0].public_url
            break
        }
    } catch {
        Start-Sleep -Seconds 1
    }
}

if ($ActiveUrl) {
    Write-Host "`n=== NGROK STATUS ===" -ForegroundColor Green
    Write-Host "Active $Mode Public URL: " -NoNewline
    Write-Host $ActiveUrl -ForegroundColor Cyan
    Write-Host "====================`n" -ForegroundColor Green
} else {
    Write-Host "WARNING: Could not connect to ngrok tunnel API on 127.0.0.1:4040." -ForegroundColor Yellow
    if (Test-Path $ngrokLog) {
        Write-Host "Recent ngrok log entries:" -ForegroundColor Yellow
        Get-Content $ngrokLog -Tail 10 | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    }
}
