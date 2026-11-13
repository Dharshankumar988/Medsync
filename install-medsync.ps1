# ========================================
# MedSync Portable Runner Installer
# ========================================
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " MedSync Portable Runner Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Enter the folder where MedSync should be installed."
Write-Host ""
Write-Host "Examples:"
Write-Host "  C:\MedSync"
Write-Host "  D:\Apps\MedSync"
Write-Host "  E:\Projects\MedSync"
Write-Host ""

$installPath = Read-Host "Installation location (Press ENTER for `$HOME\MedSync`)"
if ([string]::IsNullOrWhiteSpace($installPath)) {
    $installPath = Join-Path $HOME "MedSync"
}

# 1. Validate and resolve path
# Expand environment variables if any
$installPath = [System.Environment]::ExpandEnvironmentVariables($installPath)
$installPath = [System.IO.Path]::GetFullPath($installPath)

if (-not (Test-Path $installPath)) {
    try {
        New-Item -ItemType Directory -Path $installPath -Force | Out-Null
    } catch {
        Write-Host "ERROR: Could not create directory '$installPath'. Check permissions." -ForegroundColor Red
        exit 1
    }
}

# Verify writable by creating a test file
$testFile = Join-Path $installPath ".medsync-test-write"
try {
    New-Item -ItemType File -Path $testFile -Force | Out-Null
    Remove-Item $testFile -Force
} catch {
    Write-Host "ERROR: Directory '$installPath' is not writable." -ForegroundColor Red
    exit 1
}

Write-Host "Using installation directory: $installPath" -ForegroundColor Green

# 2. Download ZIP using curl.exe
# We append a random GUID to bypass GitHub's aggressive 5-minute raw content cache
$cacheBuster = [guid]::NewGuid().ToString()
$zipUrl = "https://raw.githubusercontent.com/dharshankumar988/Medsync/main/portable_runner.zip?v=$cacheBuster"
$zipPath = Join-Path $installPath "medsync-portable-runner.zip"

Write-Host "Downloading portable runner..."
try {
    # Using curl.exe natively as it works perfectly with raw.githubusercontent.com
    & curl.exe -L --fail --retry 3 -o "$zipPath" "$zipUrl"
    if ($LASTEXITCODE -ne 0) {
        throw "curl exited with code $LASTEXITCODE"
    }
} catch {
    Write-Host "ERROR: curl.exe failed to download the archive." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $zipPath)) {
    Write-Host "ERROR: Download failed. ZIP file not found at $zipPath." -ForegroundColor Red
    exit 1
}

$fileInfo = Get-Item $zipPath
if ($fileInfo.Length -eq 0) {
    Write-Host "ERROR: Download failed. ZIP file is empty." -ForegroundColor Red
    Remove-Item $zipPath -Force
    exit 1
}

# 3. Extract ZIP
Write-Host "Extracting archive..."
$portableRunnerPath = Join-Path $installPath "portable_runner"
try {
    if (-not (Test-Path $portableRunnerPath)) {
        New-Item -ItemType Directory -Path $portableRunnerPath -Force | Out-Null
    }
    Expand-Archive -Path $zipPath -DestinationPath $portableRunnerPath -Force
} catch {
    Write-Host "ERROR: Failed to extract ZIP." -ForegroundColor Red
    exit 1
}

# 4. Verify extraction
if (-not (Test-Path (Join-Path $portableRunnerPath "start-medsync.ps1"))) {
    $nested = Join-Path $portableRunnerPath "portable_runner"
    if (Test-Path (Join-Path $nested "start-medsync.ps1")) {
        Get-ChildItem -Path $nested | Move-Item -Destination $portableRunnerPath -Force
        Remove-Item $nested -Recurse -Force -ErrorAction SilentlyContinue
    }
}
if (-not (Test-Path (Join-Path $portableRunnerPath "start-medsync.ps1"))) {
    Write-Host "ERROR: start-medsync.ps1 was not found in the downloaded archive." -ForegroundColor Red
    exit 1
}

# 5. Clean up ZIP
Write-Host "Downloaded archive removed after successful extraction."
Remove-Item $zipPath -Force

# 6. Enter the directory
Set-Location -LiteralPath $portableRunnerPath
Write-Host "`nPortable runner installed at:`n$portableRunnerPath" -ForegroundColor Green

# 7. Do not lose existing .env
$envPath = Join-Path $portableRunnerPath ".env"
$envExamplePath = Join-Path $portableRunnerPath ".env.example"

if (Test-Path -LiteralPath $envPath) {
    Write-Host "Existing .env preserved." -ForegroundColor Yellow
} else {
    if (Test-Path -LiteralPath $envExamplePath) {
        Copy-Item -LiteralPath $envExamplePath -Destination $envPath
        Write-Host ".env has been created from .env.example." -ForegroundColor Green
        Write-Host "Open it and configure your required MedSync secrets before starting the backend." -ForegroundColor Yellow
    }
}

$openEnv = Read-Host "Would you like to open .env now to configure your settings? [Y/N]"
if ($openEnv -match "^[yY]") {
    notepad "$envPath"
}

# 8. Check Docker Prerequisites & Offer Assistance
Write-Host "`nChecking container prerequisites..." -ForegroundColor Cyan
$dockerFound = Get-Command "docker" -ErrorAction SilentlyContinue

if (-not $dockerFound) {
    Write-Host "WARNING: Docker is not installed or not in your system PATH." -ForegroundColor Yellow
    Write-Host "Docker Desktop is required to run the MedSync container on Windows." -ForegroundColor Yellow
    $getDocker = Read-Host "Would you like to open the Docker Desktop download page in your browser? [Y/N] (Default: Y)"
    if ($getDocker -notmatch "^[nN]") {
        Start-Process "https://www.docker.com/products/docker-desktop/"
        Write-Host "Please complete Docker Desktop installation and start it before launching MedSync." -ForegroundColor Yellow
    }
} else {
    try {
        $null = docker info 2>&1
        Write-Host "Docker is installed and running." -ForegroundColor Green
    } catch {
        Write-Host "NOTICE: Docker is installed, but the Docker daemon is not running." -ForegroundColor Yellow
        $dockerApp = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        if (Test-Path $dockerApp) {
            Write-Host "Attempting to launch Docker Desktop..." -ForegroundColor Cyan
            Start-Process $dockerApp
            Write-Host "Docker Desktop is starting up. Please allow it a moment to initialize." -ForegroundColor Yellow
        } else {
            Write-Host "Please start Docker Desktop manually before launching MedSync." -ForegroundColor Yellow
        }
    }
}

# 9. Final Install Output & Auto-Launch
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " MedSync Installation Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Installation directory: $installPath"
Write-Host "Portable runner:       $portableRunnerPath"
Write-Host "Configuration file:    $envPath"
Write-Host ""

$launchNow = Read-Host "Would you like to start MedSync Portable Runner now? [Y/N] (Default: Y)"
if ($launchNow -notmatch "^[nN]") {
    Write-Host "`nSelect Runner Mode:" -ForegroundColor Cyan
    Write-Host "  1. Desktop Runner (Interactive with live tunnel status) [Default]"
    Write-Host "  2. Remote / Headless Server Mode (-Remote -Headless)"
    $modeChoice = Read-Host "Enter option [1 or 2] (Default: 1)"

    Set-Location -LiteralPath $portableRunnerPath
    if ($modeChoice -eq "2") {
        Write-Host "Starting MedSync in Remote Server Mode..." -ForegroundColor Magenta
        powershell.exe -ExecutionPolicy Bypass -File ".\start-medsync.ps1" -Remote -Headless
    } else {
        Write-Host "Starting MedSync Desktop Runner..." -ForegroundColor Green
        & ".\start-medsync.bat"
    }
} else {
    Write-Host ""
    Write-Host "To start MedSync at any time later, run:" -ForegroundColor Yellow
    Write-Host "   cd `"$portableRunnerPath`""
    Write-Host "   .\start-medsync.bat"
    Write-Host ""
}
Write-Host "========================================" -ForegroundColor Cyan
