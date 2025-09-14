# Live Trading Monitor Script
Write-Host "🚀 TRADING SYSTEM MONITOR" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host ""

# Test endpoint
Write-Host "Testing endpoint..." -ForegroundColor Yellow
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer SClWOVEDqjjVQwiXmOJOx8VgcMmMWwdN5RgoXLcxD9w"
}

$body = @{
    test = $true
    timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "https://eopp6bs30sepig.m.pipedream.net" -Method POST -Headers $headers -Body $body
    Write-Host "✅ Endpoint Active: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Endpoint Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "📊 Quick Actions:" -ForegroundColor Cyan
Write-Host "1. Open Trading UI" -ForegroundColor White
Write-Host "2. View Pipedream Logs" -ForegroundColor White
Write-Host "3. Submit Test Trade" -ForegroundColor White
Write-Host "4. Check Database" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Select action (1-4)"

switch ($choice) {
    "1" { Start-Process "trading_ui.html" }
    "2" { Start-Process "https://pipedream.com/workflows" }
    "3" {
        Write-Host "Submitting test trade..." -ForegroundColor Yellow
        $trade = @{
            symbol = "BTC-USD"
            side = "BUY"
            quantity = 0.001
            price = 65000
            mode = "mock"
        } | ConvertTo-Json

        $result = Invoke-WebRequest -Uri "https://eopp6bs30sepig.m.pipedream.net" -Method POST -Headers $headers -Body $trade
        Write-Host "✅ Trade submitted: $($result.Content)" -ForegroundColor Green
    }
    "4" {
        Write-Host "Check your Pipedream workflow logs for database entries" -ForegroundColor Yellow
        Start-Process "https://pipedream.com/workflows"
    }
}

Write-Host ""
Write-Host "Monitor running. Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")