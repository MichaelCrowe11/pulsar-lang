# Eleven Labs Agent Cleanup Script
# This script removes duplicate agents while preserving Dr. Michael Crowe variations

Write-Host "=== Eleven Labs Agent Cleanup Script ===" -ForegroundColor Cyan
Write-Host "This script will remove duplicate agents while keeping Dr. Michael Crowe variants" -ForegroundColor Yellow
Write-Host ""

# Define base path
$basePath = "C:\Users\micha\agent_configs"

# Files to DELETE (duplicates to remove)
$filesToDelete = @(
    # Dr. Kenji Tanaka duplicate (keep dr._kenji_tanaka.json)
    "$basePath\prod\dr_kenji_tanaka.json",

    # NOTE: Keeping all Dr. Michael Crowe variants per user request
    # Not deleting: dr_michael_b_crowe.json, dr._michael_b._crowe.json, etc.

    # Dealer Logic v1 files (keeping v2 versions)
    "$basePath\prod\dealer_logic_sales.json",
    "$basePath\prod\dealer_logic_finance.json",
    "$basePath\prod\dealer_logic_service_scheduler.json",
    "$basePath\prod\dealer_logic_service_status.json",
    "$basePath\prod\dealer_logic_parts.json",
    "$basePath\prod\dealer_logic_tradein.json",
    "$basePath\prod\dealer_logic_after_hours.json",
    "$basePath\prod\dealer_logic_recall.json",
    "$basePath\prod\dealer_logic_reception.json",
    "$basePath\prod\dealer_logic_gm_pitch.json"
)

# Files to KEEP (for reference)
$filesToKeep = @(
    # All Dr. Michael Crowe variants
    "$basePath\prod\dr._michael_b._crowe.json",
    "$basePath\prod\dr_michael_b_crowe.json",
    "$basePath\dr._michael_b._crowe_phd.json",
    "$basePath\dr._crowe_logic_phd_.json",
    "$basePath\michael_b_crowe_crios-nova,_phd_organic_chemistry.json",
    "$basePath\michael_b_crowe_crios-nova,_phd_lead_scientist_&_researcher.json",
    "$basePath\michael_crowe_customer_service.json",
    "$basePath\michael_crowe's_education_model.json"
)

Write-Host "Files to be DELETED:" -ForegroundColor Red
foreach ($file in $filesToDelete) {
    if (Test-Path $file) {
        Write-Host "  - $(Split-Path $file -Leaf)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Dr. Michael Crowe files to be KEPT:" -ForegroundColor Green
foreach ($file in $filesToKeep) {
    if (Test-Path $file) {
        Write-Host "  + $(Split-Path $file -Leaf)" -ForegroundColor Green
    }
}

Write-Host ""
$confirmation = Read-Host "Do you want to proceed with deletion? (yes/no)"

if ($confirmation -eq "yes") {
    Write-Host ""
    Write-Host "Creating backup directory..." -ForegroundColor Cyan
    $backupDir = "$basePath\backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

    foreach ($file in $filesToDelete) {
        if (Test-Path $file) {
            $fileName = Split-Path $file -Leaf
            $relativePath = $file.Replace($basePath, "").TrimStart("\")

            # Create backup
            $backupPath = Join-Path $backupDir $relativePath
            $backupFolder = Split-Path $backupPath -Parent
            if (!(Test-Path $backupFolder)) {
                New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null
            }

            Copy-Item $file $backupPath
            Write-Host "  Backed up: $fileName" -ForegroundColor Gray

            # Delete original
            Remove-Item $file -Force
            Write-Host "  Deleted: $fileName" -ForegroundColor Red
        }
    }

    Write-Host ""
    Write-Host "Cleanup complete!" -ForegroundColor Green
    Write-Host "Backup created at: $backupDir" -ForegroundColor Cyan

    # Summary
    $deletedCount = ($filesToDelete | Where-Object { Test-Path $_ }).Count
    $keptCount = ($filesToKeep | Where-Object { Test-Path $_ }).Count

    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Cyan
    Write-Host "  - Deleted: $deletedCount files" -ForegroundColor Red
    Write-Host "  - Kept: $keptCount Dr. Michael Crowe files" -ForegroundColor Green
    Write-Host "  - Backup location: $backupDir" -ForegroundColor Yellow

} else {
    Write-Host "Cleanup cancelled." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Script Complete ===" -ForegroundColor Cyan