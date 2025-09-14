# Eleven Labs Knowledge Base Upload Script
# Uploads documents to agents for RAG-powered responses

Write-Host "=== Eleven Labs Knowledge Base Manager ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$apiKey = $env:ELEVENLABS_API_KEY
if (-not $apiKey) {
    $apiKey = Read-Host "Enter your ElevenLabs API Key" -AsSecureString
    $apiKey = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($apiKey))
}

$baseUrl = "https://api.elevenlabs.io/v1"

# Function to upload document to knowledge base
function Upload-Document {
    param(
        [string]$AgentId,
        [string]$FilePath,
        [string]$DocumentName,
        [string]$UsageMode = "auto"
    )

    if (-not (Test-Path $FilePath)) {
        Write-Host "  ❌ File not found: $FilePath" -ForegroundColor Red
        return $false
    }

    $fileContent = Get-Content $FilePath -Raw
    $fileBytes = [System.Text.Encoding]::UTF8.GetBytes($fileContent)
    $base64Content = [Convert]::ToBase64String($fileBytes)

    $body = @{
        name = $DocumentName
        content = $base64Content
        type = "file"
        usage_mode = $UsageMode
    } | ConvertTo-Json

    $headers = @{
        "xi-api-key" = $apiKey
        "Content-Type" = "application/json"
    }

    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/agents/$AgentId/knowledge-base" `
            -Method POST `
            -Headers $headers `
            -Body $body

        Write-Host "  ✅ Uploaded: $DocumentName" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "  ❌ Failed to upload: $DocumentName" -ForegroundColor Red
        Write-Host "     Error: $_" -ForegroundColor Yellow
        return $false
    }
}

# Function to create knowledge base structure
function Initialize-KnowledgeBase {
    Write-Host "Creating knowledge base directory structure..." -ForegroundColor Yellow

    $directories = @(
        "knowledge_base\dealer_logic",
        "knowledge_base\research",
        "knowledge_base\customer_service",
        "knowledge_base\shared"
    )

    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Host "  Created: $dir" -ForegroundColor Green
        }
    }
}

# Create sample knowledge base documents
function Create-SampleDocuments {
    Write-Host ""
    Write-Host "Creating sample knowledge base documents..." -ForegroundColor Yellow

    # Dealer Logic Knowledge Base
    $dealerInventory = @"
# Current Vehicle Inventory

## Sedans
- 2024 Honda Accord Hybrid - Starting at $28,500
  - 48 MPG Combined
  - Honda Sensing Standard
  - Available in 5 colors

- 2024 Toyota Camry - Starting at $26,900
  - TSS 2.5+ Safety System
  - 9" Touchscreen
  - Wireless Apple CarPlay

- 2024 Tesla Model 3 - Starting at $42,000
  - 330 Mile Range
  - Autopilot Included
  - Over-the-Air Updates

## SUVs
- 2024 Honda CR-V - Starting at $31,500
  - AWD Available
  - Spacious Interior
  - Best in Class Cargo Space

- 2024 Toyota RAV4 Hybrid - Starting at $33,200
  - 41 MPG Combined
  - Adventure Package Available
  - 8-Speed Automatic

## Trucks
- 2024 Ford F-150 Lightning - Starting at $55,000
  - Electric Powertrain
  - 320 Mile Range
  - Pro Power Onboard

## Current Promotions
- 0% APR for 60 months on select models
- $1,000 college graduate rebate
- Military appreciation discount: $500
- First responder discount: $500
"@

    $dealerInventory | Set-Content "knowledge_base\dealer_logic\current_inventory.md"

    # Financing Programs
    $financingPrograms = @"
# Financing Programs Guide

## Credit Tiers and Rates
- Tier 1 (750+): 2.9% - 3.9% APR
- Tier 2 (700-749): 4.5% - 5.9% APR
- Tier 3 (650-699): 6.9% - 8.9% APR
- Tier 4 (600-649): 10.9% - 12.9% APR
- Subprime (<600): 14.9% - 18.9% APR

## Special Programs
### First Time Buyer Program
- No credit history required
- Proof of income needed
- Maximum loan: $25,000
- Co-signer may help qualify

### College Graduate Program
- Graduated within last 2 years
- Proof of employment
- $1,000 rebate
- Tier upgrade benefit

### Military Program
- Active duty or veteran
- Special rates available
- $500 discount
- Extended warranty included

## Loan Terms
- 36 months: Lowest total interest
- 48 months: Lower monthly payment
- 60 months: Most popular term
- 72 months: Lowest monthly payment
- 84 months: Available for qualified buyers

## Required Documents
1. Driver's License
2. Proof of Income (2 recent pay stubs)
3. Proof of Residence
4. Insurance Information
5. References (3 required)
"@

    $financingPrograms | Set-Content "knowledge_base\dealer_logic\financing_programs.md"

    # Service Department Info
    $serviceInfo = @"
# Service Department Information

## Service Hours
- Monday-Friday: 7:00 AM - 6:00 PM
- Saturday: 8:00 AM - 4:00 PM
- Sunday: Closed

## Express Services (No Appointment Needed)
- Oil Change: 30 minutes
- Tire Rotation: 20 minutes
- Battery Test: 15 minutes
- Multi-Point Inspection: Free with any service

## Major Services
- 30K Service: $299
- 60K Service: $499
- 90K Service: $699
- Transmission Service: $189
- Brake Service: Starting at $159 per axle

## Current Service Specials
- $10 off any oil change
- Free tire rotation with oil change
- 20% off brake service
- Complimentary car wash with any service

## Warranty Information
- New Vehicle: 3 year/36,000 miles bumper-to-bumper
- Powertrain: 5 year/60,000 miles
- Hybrid Components: 8 year/100,000 miles
- Extended Warranty Available
"@

    $serviceInfo | Set-Content "knowledge_base\dealer_logic\service_department.md"

    # Research Knowledge Base
    $researchProtocols = @"
# Research Protocols and Methodologies

## Data Analysis Standards
- Statistical significance: p < 0.05
- Confidence intervals: 95%
- Sample size calculations required
- Peer review before publication

## Laboratory Protocols
### Mycology Research
- Sterile technique required
- Incubation: 25°C ± 2°C
- Growth medium: PDA or MEA
- Identification: Morphological + Molecular

### Chemical Analysis
- GC-MS for volatile compounds
- HPLC for non-volatile compounds
- NMR for structure elucidation
- Mass spec for molecular weight

## Safety Protocols
- BSL-2 containment for pathogenic fungi
- Chemical hood required for extractions
- PPE: Lab coat, gloves, safety glasses
- Emergency shower within 10 seconds

## Publication Guidelines
- Follow APA 7th edition
- Open access preferred
- Data repository required
- ORCID for all authors
"@

    $researchProtocols | Set-Content "knowledge_base\research\protocols.md"

    # Customer Service FAQ
    $customerFAQ = @"
# Frequently Asked Questions

## Purchase Process
Q: How long does the purchase process take?
A: Typically 2-3 hours including paperwork and financing.

Q: Can I purchase online?
A: Yes, we offer complete online purchasing with home delivery.

Q: What if I change my mind?
A: We offer a 7-day return policy with no questions asked.

## Financing
Q: What credit score do I need?
A: We work with all credit scores, including first-time buyers.

Q: How much should I put down?
A: We recommend 10-20%, but $0 down options are available.

Q: Can I get pre-approved?
A: Yes, online pre-approval takes just 2 minutes.

## Trade-Ins
Q: How is my trade-in valued?
A: We use KBB and current market data for fair valuations.

Q: Can I trade in a leased vehicle?
A: Yes, we can handle lease buyouts and transfers.

Q: What if I still owe money?
A: We can roll negative equity into your new loan.

## Service
Q: Do I have to service here to keep warranty?
A: No, but we recommend factory-trained technicians.

Q: Can I schedule service online?
A: Yes, our online scheduler is available 24/7.

Q: Do you offer loaner vehicles?
A: Yes, free loaners for warranty work over 4 hours.
"@

    $customerFAQ | Set-Content "knowledge_base\customer_service\faq.md"

    Write-Host "  ✅ Sample documents created" -ForegroundColor Green
}

# Main menu
Write-Host "Knowledge Base Management Options:" -ForegroundColor Yellow
Write-Host "1. Initialize knowledge base structure"
Write-Host "2. Create sample documents"
Write-Host "3. Upload documents to specific agent"
Write-Host "4. Bulk upload to all agents"
Write-Host "5. List current knowledge base"
Write-Host ""

$choice = Read-Host "Enter choice (1-5)"

switch ($choice) {
    "1" {
        Initialize-KnowledgeBase
    }
    "2" {
        Initialize-KnowledgeBase
        Create-SampleDocuments
    }
    "3" {
        $agentId = Read-Host "Enter Agent ID"
        $filePath = Read-Host "Enter file path"
        $docName = Read-Host "Enter document name"

        Upload-Document -AgentId $agentId -FilePath $filePath -DocumentName $docName
    }
    "4" {
        Write-Host ""
        Write-Host "Bulk uploading knowledge base..." -ForegroundColor Cyan

        # Get all knowledge base files
        $files = Get-ChildItem -Path "knowledge_base" -Recurse -File

        foreach ($file in $files) {
            $category = $file.Directory.Name
            Write-Host ""
            Write-Host "Uploading to $category agents:" -ForegroundColor Yellow

            # Map category to agent pattern
            $agentPattern = switch ($category) {
                "dealer_logic" { "dealer_logic_*_v2.json" }
                "research" { "dr*.json" }
                "customer_service" { "*customer*.json" }
                default { "*.json" }
            }

            # Get matching agents
            $agents = Get-ChildItem -Path "C:\Users\micha\agent_configs\prod\$category" -Filter $agentPattern -ErrorAction SilentlyContinue

            foreach ($agent in $agents) {
                # Extract agent ID from config (would need actual agent ID)
                Write-Host "  Would upload $($file.Name) to $($agent.BaseName)" -ForegroundColor Gray
            }
        }
    }
    "5" {
        Write-Host ""
        Write-Host "Current Knowledge Base Structure:" -ForegroundColor Cyan

        $tree = Get-ChildItem -Path "knowledge_base" -Recurse |
                ForEach-Object {
                    $indent = "  " * ($_.FullName.Split('\').Count - 5)
                    "$indent$($_.Name)"
                }

        $tree | ForEach-Object { Write-Host $_ }
    }
}

Write-Host ""
Write-Host "=== Knowledge Base Manager Complete ===" -ForegroundColor Green