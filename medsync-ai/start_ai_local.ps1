$ErrorActionPreference = "Stop"
Set-Location -Path "c:\IMP PROJECTS\Medsync\medsync-ai"

if (!(Test-Path venv)) {
    Write-Host "Creating virtual environment..."
    python -m venv venv
}

Write-Host "Activating virtual environment..."
. .\venv\Scripts\Activate.ps1

Write-Host "Installing PyTorch..."
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

Write-Host "Installing dependencies..."
pip install -r requirements.txt

Write-Host "Starting AI Microservice locally..."
$env:CURL_CA_BUNDLE=""
$env:REQUESTS_CA_BUNDLE=""
python app.py
