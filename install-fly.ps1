# Install Fly CLI for Windows
Write-Host "Installing Fly CLI..." -ForegroundColor Cyan

# Create directory for fly
$flyDir = "$env:USERPROFILE\.fly"
if (!(Test-Path $flyDir)) {
    New-Item -ItemType Directory -Path $flyDir | Out-Null
}

# Download the latest release
$downloadUrl = "https://github.com/superfly/flyctl/releases/latest/download/fly_Windows_x86_64.zip"
$zipPath = "$flyDir\fly.zip"
$exePath = "$flyDir\fly.exe"

Write-Host "Downloading from $downloadUrl..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath

# Extract the zip
Write-Host "Extracting..." -ForegroundColor Yellow
Expand-Archive -Path $zipPath -DestinationPath $flyDir -Force

# Clean up zip file
Remove-Item $zipPath

# Add to PATH if not already there
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*$flyDir*") {
    Write-Host "Adding to PATH..." -ForegroundColor Yellow
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$flyDir", "User")
    $env:Path += ";$flyDir"
}

Write-Host "Fly CLI installed successfully!" -ForegroundColor Green
Write-Host "Testing installation..." -ForegroundColor Cyan

# Test the installation
& "$flyDir\flyctl.exe" version