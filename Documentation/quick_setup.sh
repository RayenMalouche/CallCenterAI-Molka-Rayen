# PowerShell Setup Script for Windows
# Run this to set up everything locally

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CallCenterAI - Local Setup (Windows)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Python
Write-Host "1. Checking Python..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "   ✗ Python not found!" -ForegroundColor Red
    exit 1
}

# Step 2: Create virtual environment
Write-Host "`n2. Setting up virtual environment..." -ForegroundColor Yellow
if (Test-Path "venv") {
    Write-Host "   ✓ Virtual environment already exists" -ForegroundColor Green
} else {
    python -m venv venv
    Write-Host "   ✓ Virtual environment created" -ForegroundColor Green
}

# Step 3: Activate venv
Write-Host "`n3. Activating virtual environment..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1
Write-Host "   ✓ Virtual environment activated" -ForegroundColor Green

# Step 4: Install dependencies
Write-Host "`n4. Installing dependencies..." -ForegroundColor Yellow
pip install --upgrade pip
pip install fastapi uvicorn torch transformers prometheus-client pydantic
Write-Host "   ✓ Dependencies installed" -ForegroundColor Green

# Step 5: Create directory structure
Write-Host "`n5. Creating directory structure..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "models\transformer\final_model" | Out-Null
Write-Host "   ✓ Directories created" -ForegroundColor Green

# Step 6: Create label mapping
Write-Host "`n6. Creating label mapping..." -ForegroundColor Yellow
python create_label_mapping.py
Write-Host "   ✓ Label mapping created" -ForegroundColor Green

# Step 7: Instructions
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Copy your trained model from Colab to:" -ForegroundColor White
Write-Host "     models\transformer\final_model\" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. Start the service:" -ForegroundColor White
Write-Host "     python transformer_service.py" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. Test the API:" -ForegroundColor White
Write-Host "     http://localhost:8001/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "If you don't have a trained model, the service will" -ForegroundColor Yellow
Write-Host "download a base model automatically (not trained)." -ForegroundColor Yellow
Write-Host ""