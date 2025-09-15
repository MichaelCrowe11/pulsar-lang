# Knowledge Base Setup for Enhanced ElevenLabs Agents

## Overview
To enable RAG (Retrieval Augmented Generation) for your agents, you'll need to upload relevant documents to the ElevenLabs knowledge base. This will give your agents access to accurate, up-to-date information.

## Required Knowledge Base Documents

### 1. Reception Agent Knowledge Base
Upload these document types:
- **dealership_hours_and_contact.pdf** - Store hours, department phone numbers, after-hours procedures
- **customer_service_procedures.pdf** - Call routing protocols, escalation procedures
- **department_overview.pdf** - What each department (sales, service, parts, finance) handles
- **common_questions_faq.pdf** - Frequently asked questions and standard responses
- **spanish_language_support.pdf** - Common Spanish phrases and bilingual procedures

### 2. Sales Agent Knowledge Base
Upload these document types:
- **current_inventory_specifications.pdf** - Detailed vehicle specs, features, options
- **pricing_and_incentives.pdf** - Current pricing, rebates, special offers, lease programs
- **competitive_comparisons.pdf** - How your vehicles compare to competitors
- **financing_overview.pdf** - Basic financing terms, typical rates, qualification requirements
- **trade_in_process.pdf** - Trade-in evaluation process, required documents
- **test_drive_procedures.pdf** - Test drive requirements, scheduling process
- **sales_process_guide.pdf** - Step-by-step sales process, required disclosures

### 3. Finance Agent Knowledge Base
Upload these document types:
- **lender_rate_sheets.pdf** - Current interest rates by credit tier and term
- **financing_programs.pdf** - Special financing offers, manufacturer incentives
- **credit_requirements.pdf** - Minimum qualifications for different loan programs
- **protection_products.pdf** - Extended warranties, GAP insurance, maintenance plans
- **lease_programs.pdf** - Available lease terms, residual values, money factors
- **compliance_guidelines.pdf** - Legal disclosures, FCRA requirements, state regulations
- **application_procedures.pdf** - Required documents, verification processes

## Sample Knowledge Base Documents

### Sample 1: Dealership Hours and Contact Info
```
DEALERSHIP HOURS AND CONTACT INFORMATION

Main Dealership Hours:
- Monday-Friday: 8:00 AM - 8:00 PM
- Saturday: 8:00 AM - 6:00 PM
- Sunday: 12:00 PM - 5:00 PM

Department Direct Lines:
- Sales: (555) 123-SALE
- Service: (555) 123-SERV
- Parts: (555) 123-PART
- Finance: (555) 123-LOAN

After Hours Service:
- Emergency roadside: (555) 123-HELP
- Service appointments: Online scheduling available 24/7
- After hours drop-off: Available in secure lot

Service Department Hours:
- Monday-Friday: 7:00 AM - 6:00 PM
- Saturday: 8:00 AM - 4:00 PM
- Sunday: Closed

Parts Department Hours:
- Monday-Friday: 8:00 AM - 6:00 PM
- Saturday: 8:00 AM - 3:00 PM
- Sunday: Closed
```

### Sample 2: Current Vehicle Incentives
```
CURRENT VEHICLE INCENTIVES - SEPTEMBER 2025

2025 Honda Civic:
- $1,500 Customer Cash (expires 9/30/2025)
- 1.9% APR financing for qualified buyers (60 months)
- Lease: $199/month, $2,999 due at signing (36 months, 12K miles)
- Grad Rebate: Additional $500 for recent college graduates

2025 Honda CR-V:
- $2,000 Customer Cash OR 2.9% APR financing
- Lease: $279/month, $3,499 due at signing (36 months, 12K miles)
- Military Rebate: $500 for active duty and veterans
- Loyalty Rebate: $1,000 for current Honda owners

2025 Honda Accord:
- $1,000 Customer Cash
- 0.9% APR financing for qualified buyers (up to 48 months)
- Lease: $249/month, $3,299 due at signing (36 months, 12K miles)

Trade-In Bonus:
- Additional $1,000 trade allowance on any 2018 or newer vehicle
- Trade appraisal guaranteed for 7 days

*All incentives subject to change. Cannot be combined with all offers. See dealer for details.
```

### Sample 3: Credit Requirements
```
FINANCING CREDIT REQUIREMENTS

Prime Credit (720+ FICO):
- Rates as low as 2.9% APR
- Terms up to 84 months
- Down payment: 0% available
- Debt-to-income: Up to 45%

Near Prime (660-719 FICO):
- Rates starting at 5.9% APR
- Terms up to 72 months
- Down payment: 5% minimum recommended
- Debt-to-income: Up to 40%

Subprime (580-659 FICO):
- Rates starting at 9.9% APR
- Terms up to 60 months
- Down payment: 10% minimum required
- Debt-to-income: Up to 35%
- Proof of income required

Deep Subprime (500-579 FICO):
- Special programs available
- Down payment: 15% minimum required
- Co-signer may be required
- Extended verification process

First Time Buyer Programs:
- Available for borrowers with limited credit history
- Rates starting at 7.9% APR
- Proof of employment (2+ years) required
- Down payment: 10% minimum
```

## Implementation Steps

### Step 1: Document Preparation
1. **Gather existing documents** from your dealership management system
2. **Convert to PDF format** for optimal compatibility
3. **Ensure documents are text-searchable** (OCR if needed)
4. **Remove sensitive information** (customer data, internal pricing)
5. **Organize by agent type** (reception, sales, finance)

### Step 2: Upload to ElevenLabs
```bash
# Using ElevenLabs CLI
convai knowledge-base upload \
  --agent-id "dealer_logic_reception_v2" \
  --file "dealership_hours_and_contact.pdf" \
  --title "Dealership Hours and Contact"

convai knowledge-base upload \
  --agent-id "dealer_logic_sales_v2" \
  --file "current_inventory_specifications.pdf" \
  --title "Vehicle Specifications"

convai knowledge-base upload \
  --agent-id "dealer_logic_finance_v2" \
  --file "lender_rate_sheets.pdf" \
  --title "Current Interest Rates"
```

### Step 3: Enable RAG in Agent Configurations
Update each agent's configuration to enable RAG:
```json
{
  "rag": {
    "enabled": true,
    "embedding_model": "e5_mistral_7b_instruct",
    "max_vector_distance": 0.4,
    "max_documents_length": 100000,
    "max_retrieved_rag_chunks_count": 30
  }
}
```

### Step 4: Test Knowledge Retrieval
Test that agents can access the knowledge base:
1. Ask specific questions about hours, pricing, procedures
2. Verify responses include accurate information from uploaded documents
3. Check that agents cite sources when appropriate

## Knowledge Base Maintenance

### Weekly Updates
- [ ] Update pricing and incentive information
- [ ] Refresh inventory availability
- [ ] Update service specials and promotions

### Monthly Updates
- [ ] Review and update financing rates
- [ ] Update seasonal promotions
- [ ] Add new vehicle model information
- [ ] Review FAQ responses for accuracy

### Quarterly Updates
- [ ] Complete document review and refresh
- [ ] Add new compliance requirements
- [ ] Update competitive comparison data
- [ ] Review agent performance and knowledge gaps

## Content Quality Guidelines

### Document Format Requirements
- **File Size**: Under 10MB per document
- **Format**: PDF preferred, Word docs acceptable
- **Text Quality**: Must be searchable/selectable text
- **Language**: Clear, conversational language
- **Structure**: Use headers and bullet points for easy parsing

### Content Standards
- **Accuracy**: All information must be current and verified
- **Completeness**: Cover all common customer questions
- **Consistency**: Use consistent terminology across documents
- **Compliance**: Follow all legal and regulatory requirements
- **Updates**: Include effective dates for time-sensitive information

## Troubleshooting Common Issues

### RAG Not Working
1. Check that `rag.enabled` is set to `true`
2. Verify documents are uploaded successfully
3. Ensure `max_vector_distance` isn't too restrictive (try 0.6)
4. Check document format is compatible

### Inaccurate Responses
1. Review source documents for outdated information
2. Adjust `max_retrieved_rag_chunks_count` (try 20-30)
3. Improve document structure with better headers
4. Add more specific examples in knowledge base

### Slow Response Times
1. Reduce `max_documents_length` (try 50000)
2. Optimize document sizes
3. Reduce `max_retrieved_rag_chunks_count` (try 15-20)
4. Use more specific search terms in queries

## Success Metrics

Track these metrics to measure knowledge base effectiveness:
- **Response Accuracy**: Percentage of factually correct responses
- **Information Retrieval**: How often agents find relevant information
- **Customer Satisfaction**: Feedback on information quality
- **Response Time**: Speed of RAG-enhanced responses
- **Knowledge Coverage**: Percentage of questions answered from knowledge base

---

*This knowledge base setup will dramatically improve your agents' ability to provide accurate, current information to customers.*