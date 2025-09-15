# ElevenLabs Enhanced Agents - Deployment Guide

## ✅ Current Status

### Completed
- ✅ Enhanced agent configurations created (Reception, Sales, Finance)
- ✅ 15 tools integrated across agents
- ✅ RAG knowledge bases configured
- ✅ Sentiment monitoring enabled
- ✅ ElevenLabs CLI installed (`@elevenlabs/convai-cli@0.2.2`)
- ✅ Deployment scripts prepared

### Ready to Deploy
- 📦 `enhanced_reception_config_staging.json` - Reception agent with routing & sentiment
- 📦 `enhanced_sales_config_staging.json` - Sales agent with inventory & CRM tools
- 📦 `enhanced_finance_config_staging.json` - Finance agent with calculations & credit tools

## 🚀 Quick Deployment Steps

### Step 1: Set Your API Key

```bash
# Get your API key from: https://elevenlabs.io/app/conversational-ai/agents
export ELEVENLABS_API_KEY='your_actual_api_key_here'
```

### Step 2: Run Deployment Script

```bash
cd /c/Users/micha/agent_configs
./deploy_agents.sh
```

This will:
1. Authenticate with ElevenLabs
2. Deploy all three enhanced agents
3. Run basic tests
4. Display deployment status

## 📋 Manual Deployment (Alternative)

If you prefer to deploy manually or the script has issues:

### 1. Login to ElevenLabs CLI

```bash
/c/Users/micha/AppData/Roaming/npm/convai login
# Enter your API key when prompted
```

### 2. Deploy Each Agent

```bash
# Deploy Reception Agent
/c/Users/micha/AppData/Roaming/npm/convai agent create \
    --name "Dealer Logic Reception Enhanced" \
    --config enhanced_reception_config_staging.json

# Deploy Sales Agent
/c/Users/micha/AppData/Roaming/npm/convai agent create \
    --name "Dealer Logic Sales Enhanced" \
    --config enhanced_sales_config_staging.json

# Deploy Finance Agent
/c/Users/micha/AppData/Roaming/npm/convai agent create \
    --name "Dealer Logic Finance Enhanced" \
    --config enhanced_finance_config_staging.json
```

### 3. Test Agents

```bash
# Test each agent
/c/Users/micha/AppData/Roaming/npm/convai test "Dealer Logic Reception Enhanced" \
    --message "What are your hours?"

/c/Users/micha/AppData/Roaming/npm/convai test "Dealer Logic Sales Enhanced" \
    --message "Show me available Honda Civics"

/c/Users/micha/AppData/Roaming/npm/convai test "Dealer Logic Finance Enhanced" \
    --message "Calculate payment for $30,000"
```

## 🔧 Post-Deployment Configuration

### 1. Configure Webhook Endpoints

Your agents have webhook tools that need real endpoints. Update these in the ElevenLabs dashboard:

#### Reception Agent Webhooks
- `lookup_customer_info`: https://your-api.com/v2/customers/lookup
- `route_call`: https://your-api.com/v2/routing/transfer

#### Sales Agent Webhooks
- `inventory_search`: https://your-api.com/v2/inventory/search
- `schedule_test_drive`: https://your-api.com/v2/appointments/test-drive
- `create_lead`: https://your-api.com/v2/leads/create

#### Finance Agent Webhooks
- `calculate_financing`: https://your-api.com/v2/finance/calculate
- `credit_prequalification`: https://your-api.com/v2/finance/prequalify
- `get_protection_products`: https://your-api.com/v2/finance/protection-products

### 2. Upload Knowledge Base Documents

Create and upload relevant documents for each agent:

```bash
# Create knowledge base documents
cat > hours.txt << EOF
Main Hours: Mon-Fri 8AM-8PM, Sat 8AM-6PM, Sun 12PM-5PM
Service: Mon-Fri 7AM-6PM, Sat 8AM-4PM, Sun Closed
EOF

cat > inventory.txt << EOF
2025 Models Available:
- Honda Civic from $24,650
- Honda CR-V from $29,500
- Honda Accord from $27,295
EOF

cat > financing.txt << EOF
Credit Tiers:
- Excellent (720+): 2.9% APR
- Good (660-719): 5.9% APR
- Fair (600-659): 9.9% APR
EOF

# Upload to agents
/c/Users/micha/AppData/Roaming/npm/convai knowledge-base upload \
    --agent "Dealer Logic Reception Enhanced" \
    --file hours.txt

/c/Users/micha/AppData/Roaming/npm/convai knowledge-base upload \
    --agent "Dealer Logic Sales Enhanced" \
    --file inventory.txt

/c/Users/micha/AppData/Roaming/npm/convai knowledge-base upload \
    --agent "Dealer Logic Finance Enhanced" \
    --file financing.txt
```

### 3. Configure Performance Settings

```bash
# Optimize for low latency
/c/Users/micha/AppData/Roaming/npm/convai agent optimize \
    "Dealer Logic Reception Enhanced" \
    --latency low \
    --streaming enabled

# Optimize for accuracy
/c/Users/micha/AppData/Roaming/npm/convai agent optimize \
    "Dealer Logic Finance Enhanced" \
    --accuracy maximum \
    --numerical-precision high
```

## 📊 Monitoring & Testing

### View Agent Performance

```bash
# List all agents
/c/Users/micha/AppData/Roaming/npm/convai agent list

# View agent details
/c/Users/micha/AppData/Roaming/npm/convai agent get "Dealer Logic Reception Enhanced"

# View logs
/c/Users/micha/AppData/Roaming/npm/convai logs "Dealer Logic Reception Enhanced" --tail 50

# Analytics dashboard
/c/Users/micha/AppData/Roaming/npm/convai analytics dashboard
```

### Web Dashboard

Access your agents at: https://elevenlabs.io/app/conversational-ai/agents

From the dashboard you can:
- Test agents with the built-in chat interface
- View real-time analytics
- Monitor tool usage and success rates
- Configure additional settings
- Download conversation logs

## 🎯 Expected Results

After deployment, your agents will have:

### Reception Agent
- ✅ Customer lookup by phone/email
- ✅ Smart call routing with context
- ✅ Sentiment monitoring (-0.6 threshold)
- ✅ Auto-escalation for frustrated customers
- ✅ RAG knowledge base for hours/info

### Sales Agent
- ✅ Real-time inventory search
- ✅ Test drive scheduling
- ✅ CRM lead creation
- ✅ Payment calculator
- ✅ Vehicle recommendations

### Finance Agent
- ✅ Financing calculations
- ✅ Credit prequalification
- ✅ Protection product info
- ✅ Interactive calculators
- ✅ Compliance mode enabled

## ⚠️ Troubleshooting

### Common Issues

1. **"Agent already exists" error**
   - Use `convai agent update` instead of `create`
   - Or delete existing agent first: `convai agent delete <name>`

2. **Authentication fails**
   - Verify API key is correct
   - Check you're in the right workspace
   - Try logging out and back in: `convai logout && convai login`

3. **Webhook tools not working**
   - Ensure webhook URLs are accessible
   - Check API authentication headers
   - Increase timeout if needed (default 3-5 seconds)

4. **Knowledge base upload fails**
   - Check file size (max 10MB)
   - Ensure text format (not binary)
   - Verify agent name is exact match

### Debug Commands

```bash
# Check CLI version
/c/Users/micha/AppData/Roaming/npm/convai --version

# Verify authentication
/c/Users/micha/AppData/Roaming/npm/convai whoami

# Test specific tool
/c/Users/micha/AppData/Roaming/npm/convai test "Dealer Logic Sales Enhanced" \
    --message "Search for Honda Civic" \
    --expected-tools "inventory_search" \
    --debug

# Export agent config
/c/Users/micha/AppData/Roaming/npm/convai agent export "Dealer Logic Reception Enhanced" \
    --output reception_export.json
```

## 📈 Next Steps

Once deployed and tested:

1. **Production Rollout**
   - Start with 25% traffic split
   - Monitor for 1 week
   - Gradually increase to 100%

2. **Continuous Optimization**
   - Review conversation logs weekly
   - Update knowledge bases monthly
   - Refine prompts based on common issues
   - Add new tools as needed

3. **Priority 2 Enhancements** (Future)
   - Multi-agent orchestration
   - Conversation memory
   - Proactive engagement
   - Advanced LLM models

## 💡 Support Resources

- **ElevenLabs Docs**: https://docs.elevenlabs.io/conversational-ai
- **API Reference**: https://docs.elevenlabs.io/api-reference
- **Discord Community**: https://discord.gg/elevenlabs
- **Support Email**: support@elevenlabs.io

## 🎉 Success Metrics

Monitor these KPIs after deployment:

- **Response Time**: Target <2 seconds
- **Tool Success Rate**: Target >95%
- **Customer Satisfaction**: Target >4.5/5
- **Escalation Rate**: Target <5%
- **Conversion Rate**: Monitor for 25% improvement

---

**Ready to deploy!** Follow the quick deployment steps above to get your enhanced agents live on ElevenLabs.