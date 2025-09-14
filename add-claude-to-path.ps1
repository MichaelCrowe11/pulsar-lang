# PowerShell script to add Claude CLI to PATH
# Run this script as Administrator or with elevated privileges

$claudePath = "C:\Users\micha\.local\bin"

Write-Host "🔧 Adding Claude CLI to PATH..." -ForegroundColor Cyan

# Get current user PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")

# Check if path already exists
if ($currentPath -like "*$claudePath*") {
    Write-Host "✅ Claude CLI path already exists in PATH" -ForegroundColor Green
} else {
    # Add Claude path to user PATH
    $newPath = $currentPath + ";" + $claudePath
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    
    Write-Host "✅ Successfully added Claude CLI to PATH" -ForegroundColor Green
    Write-Host "   Path added: $claudePath" -ForegroundColor Yellow
}

# Also update current session PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host ""
Write-Host "📝 Testing Claude CLI..." -ForegroundColor Cyan

# Test if claude is now accessible
try {
    $claudeVersion = & claude --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Claude CLI is working!" -ForegroundColor Green
        Write-Host "   Version: $claudeVersion" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Claude CLI not found. You may need to restart your terminal." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Claude CLI not accessible yet. Please restart your terminal." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Close and reopen your terminal (Command Prompt, PowerShell, or Git Bash)"
Write-Host "2. Run: claude --help"
Write-Host "3. Run: claude --version"
Write-Host ""
Write-Host "If it still doesn't work, restart your computer to ensure PATH changes take effect." -ForegroundColor Yellow