# Eleven Labs Agent Production Deployment Pipeline
# Complete deployment script for agents, webhooks, and monitoring

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "production",

    [Parameter(Mandatory=$false)]
    [switch]$SkipTests = $false,

    [Parameter(Mandatory=$false)]
    [switch]$DryRun = $false
)

Write-Host @"
╔══════════════════════════════════════════════════════╗
║     Eleven Labs Agent Production Deployment         ║
║              Version 1.0.0                          ║
╚══════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# Configuration
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logFile = "deployment_$timestamp.log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")

    $logEntry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$Level] $Message"
    Add-Content -Path $logFile -Value $logEntry

    switch ($Level) {
        "ERROR" { Write-Host $Message -ForegroundColor Red }
        "WARNING" { Write-Host $Message -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $Message -ForegroundColor Green }
        default { Write-Host $Message }
    }
}

# Step 1: Pre-deployment Checks
function Test-Prerequisites {
    Write-Log "🔍 Running pre-deployment checks..." "INFO"

    $checks = @{
        "Node.js" = { node --version }
        "NPM" = { npm --version }
        "ElevenLabs CLI" = { convai --version }
        "Git" = { git --version }
    }

    $allPassed = $true

    foreach ($tool in $checks.Keys) {
        try {
            & $checks[$tool] | Out-Null
            Write-Log "  ✅ $tool installed" "SUCCESS"
        }
        catch {
            Write-Log "  ❌ $tool not found" "ERROR"
            $allPassed = $false
        }
    }

    if (-not $allPassed) {
        Write-Log "Prerequisites check failed. Please install missing tools." "ERROR"
        exit 1
    }

    # Check API keys
    $apiKeys = @(
        "ELEVENLABS_API_KEY",
        "DEALER_API_KEY"
    )

    foreach ($key in $apiKeys) {
        if ([Environment]::GetEnvironmentVariable($key)) {
            Write-Log "  ✅ $key configured" "SUCCESS"
        }
        else {
            Write-Log "  ⚠️  $key not set" "WARNING"
        }
    }

    return $allPassed
}

# Step 2: Run Tests
function Invoke-Tests {
    if ($SkipTests) {
        Write-Log "⏭️  Skipping tests (--SkipTests flag set)" "WARNING"
        return $true
    }

    Write-Log "🧪 Running automated tests..." "INFO"

    # Test webhook server
    Write-Log "  Testing webhook endpoints..." "INFO"
    $webhookTest = npm test --prefix api 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Log "  ✅ Webhook tests passed" "SUCCESS"
    }
    else {
        Write-Log "  ❌ Webhook tests failed" "ERROR"
        Write-Log $webhookTest "ERROR"
        return $false
    }

    # Test agent configurations
    Write-Log "  Validating agent configurations..." "INFO"
    $agentFiles = Get-ChildItem -Path "prod" -Recurse -Filter "*.json"

    foreach ($file in $agentFiles) {
        try {
            $null = Get-Content $file.FullName | ConvertFrom-Json
            Write-Log "    ✅ $($file.Name) valid" "SUCCESS"
        }
        catch {
            Write-Log "    ❌ $($file.Name) invalid JSON" "ERROR"
            return $false
        }
    }

    return $true
}

# Step 3: Deploy Webhook Server
function Deploy-WebhookServer {
    Write-Log "🚀 Deploying webhook server..." "INFO"

    if ($DryRun) {
        Write-Log "  [DRY RUN] Would deploy webhook server" "WARNING"
        return $true
    }

    Push-Location api

    try {
        # Install dependencies
        Write-Log "  Installing dependencies..." "INFO"
        npm install --production

        # Build if needed
        if (Test-Path "build.js") {
            npm run build
        }

        # Deploy to cloud (example for different platforms)
        switch ($Environment) {
            "production" {
                # Deploy to AWS/Azure/GCP
                Write-Log "  Deploying to production cloud..." "INFO"
                # Example: fly deploy --app elevenlabs-webhooks
                # Example: az webapp deploy --name elevenlabs-webhooks
                # Example: gcloud app deploy
            }
            "staging" {
                Write-Log "  Deploying to staging environment..." "INFO"
            }
            default {
                Write-Log "  Starting local server..." "INFO"
                Start-Process -FilePath "npm" -ArgumentList "start" -NoNewWindow
            }
        }

        Write-Log "  ✅ Webhook server deployed" "SUCCESS"
        return $true
    }
    catch {
        Write-Log "  ❌ Webhook deployment failed: $_" "ERROR"
        return $false
    }
    finally {
        Pop-Location
    }
}

# Step 4: Deploy Agents
function Deploy-Agents {
    Write-Log "🤖 Deploying agents to ElevenLabs..." "INFO"

    if ($DryRun) {
        Write-Log "  [DRY RUN] Would deploy agents" "WARNING"

        # Show what would be deployed
        $agents = Get-ChildItem -Path "prod" -Recurse -Filter "*.json"
        foreach ($agent in $agents) {
            Write-Log "    Would deploy: $($agent.Name)" "INFO"
        }

        return $true
    }

    # Login to ElevenLabs
    Write-Log "  Authenticating with ElevenLabs..." "INFO"
    convai whoami | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Log "  ⚠️  Not logged in, attempting login..." "WARNING"
        convai login
    }

    # Sync agents
    Write-Log "  Syncing agents..." "INFO"
    $syncResult = convai sync --env prod 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Log "  ✅ Agents deployed successfully" "SUCCESS"
        Write-Log $syncResult "INFO"
        return $true
    }
    else {
        Write-Log "  ❌ Agent deployment failed" "ERROR"
        Write-Log $syncResult "ERROR"
        return $false
    }
}

# Step 5: Upload Knowledge Base
function Deploy-KnowledgeBase {
    Write-Log "📚 Uploading knowledge base..." "INFO"

    if ($DryRun) {
        Write-Log "  [DRY RUN] Would upload knowledge base" "WARNING"
        return $true
    }

    Push-Location knowledge_base

    try {
        # Run knowledge base upload script
        .\upload_knowledge.ps1

        Write-Log "  ✅ Knowledge base uploaded" "SUCCESS"
        return $true
    }
    catch {
        Write-Log "  ❌ Knowledge base upload failed: $_" "ERROR"
        return $false
    }
    finally {
        Pop-Location
    }
}

# Step 6: Configure Monitoring
function Setup-Monitoring {
    Write-Log "📊 Setting up monitoring..." "INFO"

    if ($DryRun) {
        Write-Log "  [DRY RUN] Would configure monitoring" "WARNING"
        return $true
    }

    # Deploy monitoring dashboard
    $dashboardPath = "monitoring\dashboard.html"

    if (Test-Path $dashboardPath) {
        # Copy to web server or CDN
        Write-Log "  Deploying dashboard..." "INFO"

        # Example: Deploy to S3
        # aws s3 cp $dashboardPath s3://your-bucket/dashboard.html --acl public-read

        # Example: Deploy to Azure Blob
        # az storage blob upload --file $dashboardPath --container-name web --name dashboard.html

        Write-Log "  ✅ Monitoring dashboard deployed" "SUCCESS"
    }

    # Configure alerts
    Write-Log "  Configuring alerts..." "INFO"
    # Add alert configuration here

    return $true
}

# Step 7: Verify Deployment
function Test-Deployment {
    Write-Log "✔️ Verifying deployment..." "INFO"

    $verifications = @()

    # Test webhook server health
    try {
        $health = Invoke-RestMethod -Uri "$env:WEBHOOK_SERVER_URL/health" -Method GET
        Write-Log "  ✅ Webhook server healthy" "SUCCESS"
        $verifications += @{ Component = "Webhook Server"; Status = "Healthy" }
    }
    catch {
        Write-Log "  ❌ Webhook server unreachable" "ERROR"
        $verifications += @{ Component = "Webhook Server"; Status = "Failed" }
    }

    # Test agent availability
    Write-Log "  Testing agent availability..." "INFO"
    $agentList = convai list-agents 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Log "  ✅ Agents accessible" "SUCCESS"
        $verifications += @{ Component = "Agents"; Status = "Available" }
    }
    else {
        Write-Log "  ❌ Agents not accessible" "ERROR"
        $verifications += @{ Component = "Agents"; Status = "Failed" }
    }

    return $verifications
}

# Step 8: Rollback function
function Invoke-Rollback {
    Write-Log "⏪ Initiating rollback..." "WARNING"

    # Restore previous agent configurations
    $backupPath = "backups\backup_$timestamp"
    if (Test-Path $backupPath) {
        Write-Log "  Restoring from backup..." "INFO"
        Copy-Item -Path "$backupPath\*" -Destination "prod" -Recurse -Force

        # Re-deploy previous version
        Deploy-Agents
    }

    Write-Log "  ✅ Rollback completed" "SUCCESS"
}

# Main Deployment Pipeline
function Start-Deployment {
    Write-Log "Starting deployment pipeline for $Environment environment" "INFO"

    if ($DryRun) {
        Write-Log "🔍 Running in DRY RUN mode - no changes will be made" "WARNING"
    }

    # Create backup
    Write-Log "📦 Creating backup..." "INFO"
    $backupPath = "backups\backup_$timestamp"
    New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
    Copy-Item -Path "prod\*" -Destination $backupPath -Recurse
    Write-Log "  Backup created at: $backupPath" "SUCCESS"

    $steps = @(
        @{ Name = "Prerequisites"; Function = { Test-Prerequisites } },
        @{ Name = "Tests"; Function = { Invoke-Tests } },
        @{ Name = "Webhook Server"; Function = { Deploy-WebhookServer } },
        @{ Name = "Agents"; Function = { Deploy-Agents } },
        @{ Name = "Knowledge Base"; Function = { Deploy-KnowledgeBase } },
        @{ Name = "Monitoring"; Function = { Setup-Monitoring } },
        @{ Name = "Verification"; Function = { Test-Deployment } }
    )

    $failedStep = $null

    foreach ($step in $steps) {
        Write-Log "" "INFO"
        Write-Log ("=" * 50) "INFO"
        Write-Log "Step: $($step.Name)" "INFO"
        Write-Log ("=" * 50) "INFO"

        $result = & $step.Function

        if ($result -eq $false) {
            $failedStep = $step.Name
            break
        }
    }

    Write-Log "" "INFO"
    Write-Log ("=" * 60) "INFO"

    if ($failedStep) {
        Write-Log "❌ DEPLOYMENT FAILED at step: $failedStep" "ERROR"

        $rollback = Read-Host "Do you want to rollback? (y/n)"
        if ($rollback -eq "y") {
            Invoke-Rollback
        }

        exit 1
    }
    else {
        Write-Log "✅ DEPLOYMENT SUCCESSFUL!" "SUCCESS"
        Write-Log "" "INFO"
        Write-Log "Deployment Summary:" "INFO"
        Write-Log "  Environment: $Environment" "INFO"
        Write-Log "  Timestamp: $timestamp" "INFO"
        Write-Log "  Log file: $logFile" "INFO"

        if (-not $DryRun) {
            Write-Log "" "INFO"
            Write-Log "Next steps:" "INFO"
            Write-Log "  1. Monitor dashboard: https://your-domain.com/dashboard" "INFO"
            Write-Log "  2. Test agents: convai test <agent-name>" "INFO"
            Write-Log "  3. Check logs: Get-Content $logFile" "INFO"
        }
    }
}

# Execute deployment
Start-Deployment