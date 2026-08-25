<#
.SYNOPSIS
Deploys the 4 MedSync AI models to a single unified Hugging Face Space.

.DESCRIPTION
This script configures a unified Hugging Face Space named 'medsync-ai'.
It initializes the space, copies all application files and models, and pushes them via git.
#>

$ErrorActionPreference = "Stop"

$env:PYTHONIOENCODING="utf-8"
$env:CURL_CA_BUNDLE=""
$env:REQUESTS_CA_BUNDLE=""
$env:GIT_SSL_NO_VERIFY="true"

$USERNAME = "Dharshan8197"
$MODELS = @("bone", "brain", "kidney", "skin")
$SPACE_NAME = "medsync-ai"
$SPACE_ID = "$USERNAME/$SPACE_NAME"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  MedSync Hugging Face Deployment Script  " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Check if huggingface-cli is installed
try {
    huggingface-cli whoami | Out-Null
    Write-Host "Authenticated with Hugging Face." -ForegroundColor Green
} catch {
    Write-Host "Error: Not authenticated with Hugging Face. Please run 'huggingface-cli login'." -ForegroundColor Red
    exit 1
}

Write-Host "`n[+] Deploying unified $SPACE_ID..." -ForegroundColor Yellow

# 1. Create the Space via HF CLI
Write-Host "    Creating Space (if not exists)..."
# Ignore failure if it already exists
huggingface-cli repo create $SPACE_NAME --type space --space_sdk docker --yes 2>$null

# 2. Clone the repo
$TEMP_DIR = Join-Path $env:TEMP $SPACE_NAME
if (Test-Path $TEMP_DIR) {
    Remove-Item -Recurse -Force $TEMP_DIR
}

Write-Host "    Cloning Space repository..."
git clone "https://huggingface.co/spaces/$SPACE_ID" $TEMP_DIR

# 3. Copy necessary files
Write-Host "    Copying application files..."
Copy-Item ".\app.py" -Destination $TEMP_DIR
Copy-Item ".\requirements.txt" -Destination $TEMP_DIR
Copy-Item ".\Dockerfile" -Destination $TEMP_DIR
Copy-Item -Recurse ".\services" -Destination $TEMP_DIR
Copy-Item -Recurse ".\utils" -Destination $TEMP_DIR

# 4. Commit and push
Write-Host "    Pushing to Hugging Face..."
Set-Location $TEMP_DIR
git add .
git commit -m "Deploy all models to unified space"
git push

Set-Location -Path $PSScriptRoot
Write-Host "    Done deploying unified space. URL: https://huggingface.co/spaces/$SPACE_ID" -ForegroundColor Green

Write-Host "`nAll models deployed successfully!" -ForegroundColor Green
Write-Host "Please update your backend .env with the following URLs:" -ForegroundColor Cyan
Write-Host "HF_UNIFIED_SPACE_URL=https://hf.space/embed/$USERNAME/medsync-ai/api"
foreach ($model in $MODELS) {
    Write-Host "HF_$($model.ToUpper())_SPACE_URL=https://hf.space/embed/$USERNAME/medsync-ai/api/v1/predict"
}
