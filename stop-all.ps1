# Stop All Transcendence Services

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TRANSCENDENCE - Stopping All Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$services = @("user-service", "game-service", "chat-service", "tournament-service", "api-gateway")
$stopped = 0

foreach ($service in $services) {
    $pidFile = "logs\$service.pid"
    
    if (Test-Path $pidFile) {
        $pid = Get-Content $pidFile
        
        try {
            $process = Get-Process -Id $pid -ErrorAction Stop
            Write-Host "Stopping $service (PID: $pid)..." -ForegroundColor Yellow
            
            Stop-Process -Id $pid -Force
            Start-Sleep -Milliseconds 500
            
            Write-Host "[OK] $service stopped" -ForegroundColor Green
            $stopped++
        } catch {
            Write-Host "[INFO] $service not running" -ForegroundColor Gray
        }
        
        Remove-Item $pidFile -ErrorAction SilentlyContinue
    } else {
        Write-Host "[INFO] $service - no PID file" -ForegroundColor Gray
    }
}

Write-Host ""
if ($stopped -gt 0) {
    Write-Host "[OK] Stopped $stopped service(s)" -ForegroundColor Green
} else {
    Write-Host "[INFO] No services were running" -ForegroundColor Gray
}
Write-Host ""
