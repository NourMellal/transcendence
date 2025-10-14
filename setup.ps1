# ========================================
# Transcendence - Automatic Setup Script (Windows)
# ========================================
# This script sets up the entire project automatically
# Run: powershell -ExecutionPolicy Bypass -File setup.ps1

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🚀 Transcendence - Automatic Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# ========================================
# Step 1: Check Prerequisites
# ========================================
Write-Host "📋 Step 1: Checking prerequisites..." -ForegroundColor Blue

# Check Node.js
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed" -ForegroundColor Red
    Write-Host "Please install Node.js v18+ from https://nodejs.org/"
    exit 1
}

# Check pnpm
try {
    $pnpmVersion = pnpm -v
    Write-Host "✅ pnpm $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️  pnpm not found. Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
}

# Check Docker
try {
    docker version | Out-Null
    Write-Host "✅ Docker installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed" -ForegroundColor Red
    Write-Host "Please install Docker Desktop from https://www.docker.com/"
    exit 1
}

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again"
    exit 1
}

Write-Host ""

# ========================================
# Step 2: Setup Environment File
# ========================================
Write-Host "📝 Step 2: Setting up environment file..." -ForegroundColor Blue

if (Test-Path ".env") {
    Write-Host "⚠️  .env file already exists" -ForegroundColor Yellow
    $response = Read-Host "Do you want to overwrite it? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Host "✅ Using existing .env file" -ForegroundColor Green
    } else {
        Copy-Item ".env.example" ".env" -Force
        Write-Host "✅ Created .env from .env.example" -ForegroundColor Green
    }
} else {
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Created .env from .env.example" -ForegroundColor Green
}

Write-Host ""

# ========================================
# Step 3: Install Dependencies
# ========================================
Write-Host "📦 Step 3: Installing dependencies..." -ForegroundColor Blue
Write-Host "This may take a few minutes..."

pnpm install

Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# ========================================
# Step 4: Start Vault Container
# ========================================
Write-Host "🔐 Step 4: Starting HashiCorp Vault..." -ForegroundColor Blue

# Check if running in WSL or native Windows Docker
$useWSL = $false
try {
    wsl docker ps | Out-Null
    $useWSL = $true
    Write-Host "Detected WSL Docker environment" -ForegroundColor Cyan
} catch {
    # Using Windows Docker Desktop
}

# Check if vault-dev container already exists
$vaultExists = $false
if ($useWSL) {
    $containers = wsl docker ps -a --format '{{.Names}}'
    $vaultExists = $containers -contains "vault-dev"
} else {
    $containers = docker ps -a --format '{{.Names}}'
    $vaultExists = $containers -contains "vault-dev"
}

if ($vaultExists) {
    Write-Host "⚠️  Vault container already exists" -ForegroundColor Yellow
    
    # Check if it's running
    if ($useWSL) {
        $runningContainers = wsl docker ps --format '{{.Names}}'
    } else {
        $runningContainers = docker ps --format '{{.Names}}'
    }
    
    if ($runningContainers -contains "vault-dev") {
        Write-Host "✅ Vault is already running" -ForegroundColor Green
    } else {
        Write-Host "Starting existing Vault container..."
        if ($useWSL) {
            wsl docker start vault-dev
        } else {
            docker start vault-dev
        }
        Write-Host "✅ Vault started" -ForegroundColor Green
    }
} else {
    Write-Host "Creating and starting Vault container..."
    $dockerCmd = "docker run -d --name vault-dev --cap-add=IPC_LOCK -e VAULT_DEV_ROOT_TOKEN_ID=dev-root-token -e VAULT_DEV_LISTEN_ADDRESS=0.0.0.0:8200 -p 8200:8200 hashicorp/vault:1.18 server -dev"
    
    if ($useWSL) {
        wsl bash -c $dockerCmd
    } else {
        Invoke-Expression $dockerCmd
    }
    
    Write-Host "✅ Vault container created and started" -ForegroundColor Green
}

# Wait for Vault to be ready
Write-Host "Waiting for Vault to be ready..."
$maxRetries = 30
$retryCount = 0
$vaultReady = $false

while ($retryCount -lt $maxRetries) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8200/v1/sys/health" -Method Get -TimeoutSec 1 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Vault is ready!" -ForegroundColor Green
            $vaultReady = $true
            break
        }
    } catch {
        # Continue waiting
    }
    
    $retryCount++
    Start-Sleep -Seconds 1
}

if (-not $vaultReady) {
    Write-Host "❌ Vault failed to start" -ForegroundColor Red
    if ($useWSL) {
        Write-Host "Please check Docker logs: wsl docker logs vault-dev"
    } else {
        Write-Host "Please check Docker logs: docker logs vault-dev"
    }
    exit 1
}

Write-Host ""

# ========================================
# Step 5: Initialize Vault with Secrets
# ========================================
Write-Host "🔑 Step 5: Setting up Vault secrets..." -ForegroundColor Blue

$env:VAULT_ADDR = "http://localhost:8200"
$env:VAULT_TOKEN = "dev-root-token"

# Run the setup script
bash infrastructure/vault/scripts/setup-secrets-dev.sh

Write-Host "✅ Vault secrets configured" -ForegroundColor Green
Write-Host ""

# ========================================
# Step 6: Validate Vault Integration
# ========================================
Write-Host "🧪 Step 6: Validating Vault integration..." -ForegroundColor Blue

bash infrastructure/vault/scripts/validate-integration.sh

Write-Host ""

# ========================================
# Step 7: Start Redis (if needed)
# ========================================
Write-Host "🗄️  Step 7: Checking Redis..." -ForegroundColor Blue

if ($useWSL) {
    $runningContainers = wsl docker ps --format '{{.Names}}'
} else {
    $runningContainers = docker ps --format '{{.Names}}'
}

if ($runningContainers -match "redis") {
    Write-Host "✅ Redis is already running" -ForegroundColor Green
} else {
    Write-Host "Starting Redis container..."
    $redisCmd = "docker run -d --name redis-dev -p 6379:6379 redis:7-alpine"
    
    if ($useWSL) {
        wsl bash -c $redisCmd
    } else {
        Invoke-Expression $redisCmd
    }
    
    Write-Host "✅ Redis started" -ForegroundColor Green
}

Write-Host ""

# ========================================
# Setup Complete!
# ========================================
Write-Host "==========================================" -ForegroundColor Green
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your Transcendence project is ready to use!"
Write-Host ""
Write-Host "To start all services:" -ForegroundColor Blue
Write-Host "  .\start.bat     (recommended for Windows)"
Write-Host "  OR"
Write-Host "  pnpm run dev:all"
Write-Host ""
Write-Host "To stop all services:" -ForegroundColor Blue
Write-Host "  .\stop-services.bat"
Write-Host ""
Write-Host "To stop Docker containers:" -ForegroundColor Blue
if ($useWSL) {
    Write-Host "  wsl docker stop vault-dev redis-dev"
} else {
    Write-Host "  docker stop vault-dev redis-dev"
}
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Blue
Write-Host "  • Check Vault status: curl http://localhost:8200/v1/sys/health"
Write-Host "  • Validate Vault: bash infrastructure/vault/scripts/validate-integration.sh"
Write-Host "  • View logs: Check the logs/ directory"
Write-Host ""
Write-Host "📚 For more information, see:" -ForegroundColor Yellow
Write-Host "  • README.md - Project overview"
Write-Host "  • VAULT_EXPLANATION.md - How Vault works in this project"
Write-Host "  • docs/DEVELOPMENT_GUIDE.md - Development guide"
Write-Host ""
Write-Host "Happy coding! 🚀"
Write-Host ""
