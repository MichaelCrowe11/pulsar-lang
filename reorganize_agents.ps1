# Eleven Labs Agent Directory Reorganization Script
# This script reorganizes agents into a proper directory structure

Write-Host "=== Eleven Labs Agent Reorganization Script ===" -ForegroundColor Cyan
Write-Host ""

$basePath = "C:\Users\micha\agent_configs"

# Create new directory structure
Write-Host "Creating new directory structure..." -ForegroundColor Yellow

$directories = @(
    "$basePath\prod\dealer_logic",
    "$basePath\prod\research",
    "$basePath\prod\customer_service",
    "$basePath\staging\dealer_logic",
    "$basePath\staging\research",
    "$basePath\staging\customer_service",
    "$basePath\dev\dealer_logic",
    "$basePath\dev\research",
    "$basePath\dev\customer_service",
    "$basePath\dev\templates",
    "$basePath\archive"
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  Created: $dir" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Organizing agents by category..." -ForegroundColor Yellow

# Define agent categorization rules
$agentMoves = @{
    # Dealer Logic agents (v2 only, assuming v1 are deleted)
    "$basePath\prod\dealer_logic_*_v2.json" = "$basePath\prod\dealer_logic"
    "$basePath\prod\dealer_logic_test.json" = "$basePath\dev\dealer_logic"

    # Research/Dr. agents
    "$basePath\prod\dr._*.json" = "$basePath\prod\research"
    "$basePath\prod\dr_*.json" = "$basePath\prod\research"
    "$basePath\dr._*.json" = "$basePath\dev\research"
    "$basePath\dr_*.json" = "$basePath\dev\research"

    # Michael Crowe specific agents
    "$basePath\michael_crowe*.json" = "$basePath\prod\customer_service"
    "$basePath\michael_b_crowe*.json" = "$basePath\prod\research"

    # Family agents
    "$basePath\lucy_crowe_.json" = "$basePath\dev\customer_service"
    "$basePath\elias_crowe_.json" = "$basePath\dev\customer_service"

    # Template
    "$basePath\new_agent.json" = "$basePath\dev\templates"
}

$movedCount = 0
$skippedCount = 0

foreach ($pattern in $agentMoves.Keys) {
    $destination = $agentMoves[$pattern]
    $files = Get-ChildItem -Path (Split-Path $pattern -Parent) -Filter (Split-Path $pattern -Leaf) -File -ErrorAction SilentlyContinue

    foreach ($file in $files) {
        $destPath = Join-Path $destination $file.Name

        if (Test-Path $destPath) {
            Write-Host "  Skipped (already exists): $($file.Name)" -ForegroundColor Yellow
            $skippedCount++
        } else {
            Move-Item -Path $file.FullName -Destination $destPath -Force
            Write-Host "  Moved: $($file.Name) -> $(Split-Path $destination -Leaf)" -ForegroundColor Green
            $movedCount++
        }
    }
}

Write-Host ""
Write-Host "Creating agent inventory file..." -ForegroundColor Yellow

# Create inventory markdown file
$inventoryPath = "$basePath\AGENT_INVENTORY.md"
$inventory = @"
# Eleven Labs Agent Inventory
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## Directory Structure

\`\`\`
agent_configs/
├── prod/                    # Production agents
│   ├── dealer_logic/       # Automotive dealership agents
│   ├── research/           # Research & scientific agents
│   └── customer_service/   # Customer service agents
├── staging/                # Staging environment
│   ├── dealer_logic/
│   ├── research/
│   └── customer_service/
├── dev/                    # Development environment
│   ├── dealer_logic/
│   ├── research/
│   ├── customer_service/
│   └── templates/          # Agent templates
└── archive/                # Deprecated agents
\`\`\`

## Agent Count by Category

"@

# Count agents in each directory
$categories = Get-ChildItem -Path $basePath -Directory -Recurse | Where-Object { $_.GetFiles("*.json").Count -gt 0 }

foreach ($category in $categories) {
    $count = (Get-ChildItem -Path $category.FullName -Filter "*.json" -File).Count
    if ($count -gt 0) {
        $relativePath = $category.FullName.Replace($basePath, "").TrimStart("\")
        $inventory += "`n- **$relativePath**: $count agents"
    }
}

$inventory += "

## Dr. Michael Crowe Agents (All Variants Preserved)

- dr._michael_b._crowe.json (Production)
- dr_michael_b_crowe.json (Production)
- dr._michael_b._crowe_phd.json (Development)
- dr._crowe_logic_phd_.json (Development)
- michael_b_crowe_crios-nova,_phd_organic_chemistry.json
- michael_b_crowe_crios-nova,_phd_lead_scientist_&_researcher.json
- michael_crowe_customer_service.json
- michael_crowe's_education_model.json

## Naming Convention

Standard format: ``[role]_[first_name]_[last_name]_[specialization].json``

Examples:
- dr_michael_crowe_mycology.json
- dealer_logic_sales_v2.json
- customer_service_bot.json

## Environment Tags

All agents should include:
``````json
`"tags`": [
    `"environment:prod|staging|dev`",
    `"category:dealer_logic|research|customer_service`",
    `"version:v1|v2|v3`",
    `"status:active|deprecated|testing`"
]
``````
"

Set-Content -Path $inventoryPath -Value $inventory
Write-Host "  Created: AGENT_INVENTORY.md" -ForegroundColor Green

Write-Host ""
Write-Host "=== Reorganization Complete ===" -ForegroundColor Cyan
Write-Host "  Moved: $movedCount files" -ForegroundColor Green
Write-Host "  Skipped: $skippedCount files" -ForegroundColor Yellow
Write-Host "  Inventory: $inventoryPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run cleanup_agent_duplicates.ps1 to remove duplicates"
Write-Host "  2. Review AGENT_INVENTORY.md for current state"
Write-Host "  3. Update agent configurations with proper tags"