# Eleven Labs Agent Inventory
Generated: 2025-09-14 15:40:50

## Directory Structure

\\\
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
\\\

## Agent Count by Category

- **backup_20250914_153857\prod**: 11 agents
- **dev\customer_service**: 2 agents
- **dev\dealer_logic**: 1 agents
- **dev\research**: 26 agents
- **dev\templates**: 1 agents
- **prod\customer_service**: 2 agents
- **prod\dealer_logic**: 10 agents
- **prod\research**: 18 agents

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

Standard format: `[role]_[first_name]_[last_name]_[specialization].json`

Examples:
- dr_michael_crowe_mycology.json
- dealer_logic_sales_v2.json
- customer_service_bot.json

## Environment Tags

All agents should include:
```json
"tags": [
    "environment:prod|staging|dev",
    "category:dealer_logic|research|customer_service",
    "version:v1|v2|v3",
    "status:active|deprecated|testing"
]
```

