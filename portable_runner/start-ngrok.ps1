# Start Ngrok Tunnel to securely expose MedSync to the internet
$ErrorActionPreference = "Stop"
$ScriptPath = $PSScriptRoot
Set-Location -LiteralPath $ScriptPath

Write-Host "Starting Ngrok Tunnel for MedSync..." -ForegroundColor Cyan

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
        # Check common system locations in case it's installed but not in PATH
        $CommonLocations = @(
            "$env:LOCALAPPDATA\Microsoft\WindowsApps\ngrok.exe", # Microsoft Store version
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
            Write-Host "ngrok not found on the system. Automatically downloading portable ngrok..." -ForegroundColor Yellow
            $ZipPath = Join-Path $ScriptPath "ngrok.zip"
            try {
                Invoke-WebRequest -Uri "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip" -OutFile $ZipPath -UseBasicParsing
                Write-Host "Extracting ngrok..." -ForegroundColor Cyan
                Expand-Archive -Path $ZipPath -DestinationPath $ScriptPath -Force
                Remove-Item -Path $ZipPath -Force
                $NgrokPath = Join-Path $ScriptPath "ngrok.exe"
                Write-Host "ngrok successfully downloaded and extracted." -ForegroundColor Green
            } catch {
                Write-Host "ERROR: Failed to automatically download ngrok." -ForegroundColor Red
                Write-Host "Please either:" -ForegroundColor Yellow
                Write-Host "1. Install ngrok globally (e.g., winget install ngrok)" -ForegroundColor Yellow
                Write-Host "2. Download the Ngrok Windows ZIP manually from https://ngrok.com/download" -ForegroundColor Yellow
                Write-Host "   Extract ngrok.exe and place it in this folder ($ScriptPath)." -ForegroundColor Yellow
                exit 1
            }
        }
    }
}

# 2. Check for .env variables
$EnvPath = Join-Path $ScriptPath ".env"
$AuthToken = ""
$Url = ""

if (Test-Path -LiteralPath $EnvPath) {
    $envContent = Get-Content $EnvPath
    foreach ($line in $envContent) {
        if ($line -match "^NGROK_AUTHTOKEN=(.*)") {
            $AuthToken = $matches[1].Trim()
        }
        if ($line -match "^NGROK_URL=(.*)") {
            $Url = $matches[1].Trim()
        }
    }
}

if (-not $AuthToken -or -not $Url) {
    Write-Host "`nWARNING: Missing Ngrok configuration in .env!" -ForegroundColor Yellow
    Write-Host "You must provide NGROK_AUTHTOKEN and NGROK_URL."
    Write-Host "You can get these from your Ngrok Dashboard (https://dashboard.ngrok.com/)"
    Write-Host ""
    $AuthToken = Read-Host "Please enter your NGROK_AUTHTOKEN (or press Ctrl+C to abort)"
    $Url = Read-Host "Please enter your NGROK_URL (e.g., https://your-domain.ngrok-free.dev)"
    
    if (-not $AuthToken -or -not $Url) {
        Write-Host "Aborting. Missing credentials." -ForegroundColor Red
        exit 1
    }
}

# 3. Authenticate
Write-Host "Authenticating Ngrok..."
try {
    & $NgrokPath config add-authtoken $AuthToken
} catch {
    Write-Host "ERROR: Failed to add Ngrok authtoken." -ForegroundColor Red
    exit 1
}

# 4. Start Tunnel
Write-Host "Routing traffic to local port 8000 using static URL: $Url ..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the tunnel." -ForegroundColor Yellow

try {
    & $NgrokPath http --url=$Url 8000
} catch {
    Write-Host "`nERROR: Ngrok failed to start or crashed." -ForegroundColor Red
    Write-Host "Make sure the URL ($Url) is correct and belongs to your account." -ForegroundColor Yellow
    exit 1
}
