# Start All Transcendence Services
# This script loads .env and starts all 5 services at once

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TRANSCENDENCE - Starting All Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "[ERROR] .env file not found!" -ForegroundColor Red
    Write-Host "Please create a .env file with VAULT_ADDR and VAULT_TOKEN" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Load environment variables from .env
Write-Host "Loading environment from .env file..." -ForegroundColor Yellow
Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]*)\s*=\s*(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
}

Write-Host "[OK] Environment loaded" -ForegroundColor Green
Write-Host "  VAULT_ADDR = $env:VAULT_ADDR" -ForegroundColor Gray
Write-Host "  VAULT_TOKEN = $($env:VAULT_TOKEN.Substring(0,15))..." -ForegroundColor Gray
Write-Host ""

# Check Vault
Write-Host "Checking Vault..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$env:VAULT_ADDR/v1/sys/health" -ErrorAction Stop -TimeoutSec 5
    Write-Host "[OK] Vault is running" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Vault is not running!" -ForegroundColor Red
    Write-Host "Start Vault: docker start vault-dev" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
Write-Host ""

# Create logs directory
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

# Start services
Write-Host "Starting all services..." -ForegroundColor Yellow
Write-Host ""

$services = @(
    @{Name="user-service"; Path="services\user-service"; Port=3001},
    @{Name="game-service"; Path="services\game-service"; Port=3002},
    @{Name="chat-service"; Path="services\chat-service"; Port=3003},
    @{Name="tournament-service"; Path="services\tournament-service"; Port=3004},
    @{Name="api-gateway"; Path="infrastructure\api-gateway"; Port=3000}
)

foreach ($svc in $services) {
    Write-Host "Starting $($svc.Name) on port $($svc.Port)..." -ForegroundColor Cyan
    
    $logFile = "logs\$($svc.Name).log"
    $pidFile = "logs\$($svc.Name).pid"
    
    # Start process (inherits environment variables)
    $process = Start-Process -FilePath "pnpm.cmd" `
        -ArgumentList "run", "dev" `
        -WorkingDirectory $svc.Path `
        -PassThru `
        -WindowStyle Hidden `
        -RedirectStandardOutput $logFile `
        -RedirectStandardError "$logFile.error"
    
    # Save PID
    $process.Id | Out-File -FilePath $pidFile
    
    Write-Host "[OK] $($svc.Name) started (PID: $($process.Id))" -ForegroundColor Green
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  All Services Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Services:" -ForegroundColor Yellow
Write-Host "  http://localhost:3000 - API Gateway" -ForegroundColor White
Write-Host "  http://localhost:3001 - User Service" -ForegroundColor White
Write-Host "  http://localhost:3002 - Game Service" -ForegroundColor White
Write-Host "  http://localhost:3003 - Chat Service" -ForegroundColor White
Write-Host "  http://localhost:3004 - Tournament Service" -ForegroundColor White
Write-Host ""

Write-Host "Logs: logs/*.log" -ForegroundColor Cyan
Write-Host "PIDs: logs/*.pid" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop: .\stop-all.ps1" -ForegroundColor Yellow
Write-Host "To view logs: Get-Content logs\user-service.log -Wait" -ForegroundColor Yellow
Write-Host ""
Write-Host "Wait 10-15 seconds for all services to fully start..." -ForegroundColor Gray
Write-Host ""
