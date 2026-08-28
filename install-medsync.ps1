# ========================================
# MedSync Portable Runner Installer
# ========================================
$ErrorActionPreference = "Stop"

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
$zipUrl = "https://github.com/dharshankumar988/Medsync/archive/refs/heads/main.zip"
$zipPath = Join-Path $installPath "medsync-portable-runner.zip"

Write-Host "Downloading portable runner..."
try {
    # Using curl.exe natively
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
try {
    Expand-Archive -Path $zipPath -DestinationPath $installPath -Force
} catch {
    Write-Host "ERROR: Failed to extract ZIP." -ForegroundColor Red
    exit 1
}

# 4. Handle ZIP directory structure robustly
$portableRunnerPath = Join-Path $installPath "portable_runner"
if (-not (Test-Path $portableRunnerPath)) {
    # Check if it was nested
    $nestedDirs = Get-ChildItem -Path $installPath -Directory -Recurse | Where-Object { $_.Name -eq "portable_runner" }
    
    if ($nestedDirs.Count -eq 0) {
        Write-Host "ERROR: portable_runner was not found in the downloaded archive." -ForegroundColor Red
        exit 1
    } elseif ($nestedDirs.Count -gt 1) {
        Write-Host "ERROR: Multiple portable_runner directories found. Cannot determine the correct one." -ForegroundColor Red
        exit 1
    } else {
        # Move the nested portable_runner out
        Move-Item -Path $nestedDirs[0].FullName -Destination $installPath -Force
        $portableRunnerPath = Join-Path $installPath "portable_runner"
        
        # Cleanup the rest of the extracted repository
        $nestedParent = $nestedDirs[0].Parent.FullName
        Remove-Item -Path $nestedParent -Force -Recurse
    }
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
        
        $openEnv = Read-Host "Would you like to open .env now? [Y/N]"
        if ($openEnv -match "^[yY]") {
            notepad "$envPath"
        }
    }
}

# 8. Final Install Output
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " MedSync Installation Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Installation directory:"
Write-Host $installPath
Write-Host ""
Write-Host "Portable runner:"
Write-Host $portableRunnerPath
Write-Host ""
Write-Host "Configuration:"
Write-Host $envPath
Write-Host ""
Write-Host "Next steps:"
Write-Host ""
Write-Host "1. Configure .env:"
Write-Host ""
Write-Host "   notepad `"$envPath`""
Write-Host ""
Write-Host "2. Start MedSync:"
Write-Host ""
Write-Host "   cd `"$portableRunnerPath`""
Write-Host "   .\start-medsync.ps1"
Write-Host ""
Write-Host "3. Or use:"
Write-Host ""
Write-Host "   `"$portableRunnerPath\start-medsync.bat`""
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
