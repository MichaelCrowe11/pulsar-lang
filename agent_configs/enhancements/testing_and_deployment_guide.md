# Testing and Deployment Guide for Enhanced ElevenLabs Agents

## Overview
This guide provides step-by-step instructions for testing and deploying your enhanced ElevenLabs agents with Priority 1 features: tool integrations, RAG knowledge bases, and sentiment analysis.

## Pre-Deployment Checklist

### ✅ Environment Setup
- [ ] ElevenLabs CLI installed and configured
- [ ] API endpoints configured and accessible
- [ ] Authentication tokens and API keys set up
- [ ] Knowledge base documents prepared and uploaded
- [ ] Webhook endpoints deployed and tested
- [ ] Analytics and monitoring systems ready

### ✅ Agent Configuration Files Ready
- [ ] `reception_agent_tools.json` - Customer lookup, routing, sentiment monitoring
- [ ] `sales_agent_tools.json` - Inventory search, test drive scheduling, lead creation
- [ ] `finance_agent_tools.json` - Payment calculations, credit applications, protection products
- [ ] `sentiment_analysis_config.json` - Real-time sentiment monitoring and escalation
- [ ] `knowledge_base_setup.md` - RAG configuration and document requirements

## Testing Phase 1: Individual Tool Testing

### Test Reception Agent Tools

```bash
# Test customer lookup tool
curl -X POST "https://api.dealership.com/v2/customers/lookup" \
  -H "Authorization: Bearer ${DEALER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"phone": "555-123-4567"}'

# Test call routing tool
curl -X POST "https://api.dealership.com/v2/routing/transfer" \
  -H "Authorization: Bearer ${DEALER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "department": "sales",
    "customer_context": {"name": "Test Customer", "interest": "Honda Civic"},
    "priority": "normal"
  }'
```

### Test Sales Agent Tools

```bash
# Test inventory search
curl -X POST "https://api.dealership.com/v2/inventory/search" \
  -H "Authorization: Bearer ${DEALER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "make": "Honda",
    "model": "Civic",
    "year": 2025,
    "max_price": 30000
  }'

# Test test drive scheduling
curl -X POST "https://api.dealership.com/v2/appointments/test-drive" \
  -H "Authorization: Bearer ${DEALER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Test Customer",
    "customer_phone": "555-123-4567",
    "vehicle_vin": "1HGCM82633A123456",
    "preferred_date": "2025-09-20",
    "preferred_time": "14:00"
  }'
```

### Test Finance Agent Tools

```bash
# Test financing calculation
curl -X POST "https://api.dealership.com/v2/finance/calculate" \
  -H "Authorization: Bearer ${DEALER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_price": 25000,
    "loan_amount": 20000,
    "loan_terms": [36, 48, 60, 72],
    "credit_tier": "prime"
  }'

# Test credit prequalification
curl -X POST "https://api.dealership.com/v2/finance/prequalify" \
  -H "Authorization: Bearer ${DEALER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_info": {
      "first_name": "Test",
      "last_name": "Customer",
      "ssn_last_4": "1234",
      "zip_code": "12345"
    },
    "soft_pull_consent": true
  }'
```

## Testing Phase 2: Knowledge Base (RAG) Testing

### Upload Test Documents

```bash
# Upload dealership hours document
convai knowledge-base upload \
  --agent-id "dealer_logic_reception_v2" \
  --file "test_dealership_hours.pdf" \
  --title "Store Hours and Contact"

# Upload vehicle specifications
convai knowledge-base upload \
  --agent-id "dealer_logic_sales_v2" \
  --file "test_vehicle_specs.pdf" \
  --title "Vehicle Specifications"

# Upload financing information
convai knowledge-base upload \
  --agent-id "dealer_logic_finance_v2" \
  --file "test_financing_rates.pdf" \
  --title "Current Rates and Programs"
```

### Test RAG Responses

Create test conversations to verify knowledge retrieval:

1. **Reception Agent Tests:**
   - "What are your hours on Saturday?"
   - "What's the phone number for the service department?"
   - "Do you offer Spanish-speaking assistance?"

2. **Sales Agent Tests:**
   - "What's the fuel economy of the 2025 Honda Civic?"
   - "What colors are available for the CR-V?"
   - "What's included in the extended warranty?"

3. **Finance Agent Tests:**
   - "What's the current interest rate for someone with 750 credit score?"
   - "What financing programs are available for first-time buyers?"
   - "What documents do I need for a credit application?"

## Testing Phase 3: Sentiment Analysis Testing

### Test Escalation Keywords

Create test conversations with escalation triggers:

1. **Immediate Escalation Tests:**
   - "I want to speak to your manager right now!"
   - "This is terrible service, I'm calling my lawyer"
   - "You people are trying to scam me"

2. **Urgent Escalation Tests:**
   - "I'm really frustrated with this process"
   - "This is ridiculous, I'm wasting my time"
   - "You're all incompetent"

3. **Positive Sentiment Tests:**
   - "This is exactly what I was looking for!"
   - "You've been so helpful, thank you"
   - "I'm really impressed with your service"

### Verify Escalation Actions

Check that escalations trigger properly:
- [ ] Immediate escalation sends SMS/email alerts
- [ ] Agent transfers conversation to human supervisor
- [ ] Context is preserved during handoff
- [ ] Incident is logged in analytics system

## Testing Phase 4: Integration Testing

### End-to-End Customer Journey Test

**Scenario: New customer calls for vehicle purchase**

1. **Reception Agent (Test Script):**
   ```
   Customer: "Hi, I'm interested in buying a new Honda"
   Expected: Agent uses lookup_customer_info, routes to sales
   Verify: Customer info captured, warm transfer to sales
   ```

2. **Sales Agent (Test Script):**
   ```
   Customer: "I want a 2025 Civic under $25,000"
   Expected: Agent uses inventory_search, shows available vehicles
   Verify: Real inventory results, accurate pricing
   ```

3. **Finance Agent (Test Script):**
   ```
   Customer: "What would my monthly payment be?"
   Expected: Agent uses calculate_financing tool
   Verify: Accurate payment calculations, multiple term options
   ```

### Multi-Agent Handoff Testing

Test seamless conversation transfers:
- [ ] Context preservation between agents
- [ ] No information repetition requests
- [ ] Smooth transition messaging
- [ ] Complete conversation logging

## Testing Phase 5: Performance Testing

### Load Testing

Test agent performance under load:

```bash
# Use ElevenLabs CLI to simulate concurrent conversations
for i in {1..10}; do
  convai test "dealer_logic_reception_v2" \
    --message "What are your hours?" \
    --concurrent &
done
wait
```

### Response Time Testing

Measure tool execution times:
- [ ] Inventory search: < 3 seconds
- [ ] Customer lookup: < 2 seconds
- [ ] Payment calculation: < 3 seconds
- [ ] Knowledge base retrieval: < 1 second
- [ ] Sentiment analysis: < 500ms

### Error Handling Testing

Test failure scenarios:
- [ ] API endpoint timeout (should gracefully degrade)
- [ ] Invalid customer data (should request clarification)
- [ ] Knowledge base unavailable (should use prompt knowledge)
- [ ] Sentiment analysis failure (should continue without monitoring)

## Deployment Phase 1: Staging Environment

### Deploy Enhanced Agents to Staging

```bash
# Update reception agent with tools
convai agent update "dealer_logic_reception_v2" \
  --config-file "enhanced_reception_config.json" \
  --environment "staging"

# Update sales agent with tools
convai agent update "dealer_logic_sales_v2" \
  --config-file "enhanced_sales_config.json" \
  --environment "staging"

# Update finance agent with tools
convai agent update "dealer_logic_finance_v2" \
  --config-file "enhanced_finance_config.json" \
  --environment "staging"
```

### Staging Environment Testing

Run comprehensive tests in staging:
- [ ] All tools functioning correctly
- [ ] Knowledge base responses accurate
- [ ] Sentiment analysis working
- [ ] Escalation workflows tested
- [ ] Performance meets requirements

## Deployment Phase 2: Production Rollout

### Gradual Production Deployment

**Week 1: 25% Traffic**
```bash
# Route 25% of traffic to enhanced agents
convai traffic-split set \
  --agent-id "dealer_logic_reception_v2" \
  --enhanced-version 25 \
  --original-version 75
```

**Week 2: 50% Traffic** (if Week 1 successful)
```bash
convai traffic-split set \
  --agent-id "dealer_logic_reception_v2" \
  --enhanced-version 50 \
  --original-version 50
```

**Week 3: 100% Traffic** (if Week 2 successful)
```bash
convai traffic-split set \
  --agent-id "dealer_logic_reception_v2" \
  --enhanced-version 100 \
  --original-version 0
```

### Production Monitoring

Monitor key metrics during rollout:

```bash
# Real-time monitoring dashboard
convai analytics dashboard \
  --metrics "conversation_duration,tool_success_rate,customer_satisfaction,escalation_rate" \
  --agents "dealer_logic_reception_v2,dealer_logic_sales_v2,dealer_logic_finance_v2"
```

**Success Criteria:**
- [ ] Tool success rate > 95%
- [ ] Customer satisfaction maintained or improved
- [ ] Average conversation duration reduced by 20%
- [ ] Escalation rate < 5%
- [ ] No critical system errors

## Post-Deployment Optimization

### Week 1 Analysis

Review performance data:
- Identify most/least used tools
- Analyze conversation patterns
- Review escalation incidents
- Gather customer feedback

### Optimization Actions

Based on analysis results:

1. **Tool Performance Issues:**
   ```bash
   # Increase timeout for slow tools
   # Optimize API endpoints
   # Cache frequent requests
   ```

2. **Knowledge Base Gaps:**
   ```bash
   # Upload additional documents
   # Improve document structure
   # Update outdated information
   ```

3. **Sentiment Analysis Tuning:**
   ```bash
   # Adjust escalation thresholds
   # Add new trigger keywords
   # Refine escalation workflows
   ```

## Troubleshooting Guide

### Common Issues and Solutions

#### Tool Timeouts
**Problem:** Tools timing out frequently
**Solution:**
- Increase timeout values in tool configuration
- Check API endpoint performance
- Implement retry logic

#### Inaccurate Knowledge Base Responses
**Problem:** RAG returning irrelevant information
**Solution:**
- Improve document quality and structure
- Adjust `max_vector_distance` parameter
- Add more specific examples to knowledge base

#### False Sentiment Escalations
**Problem:** Non-negative conversations being escalated
**Solution:**
- Review and adjust escalation keywords
- Increase sentiment threshold for escalation
- Add context-aware escalation logic

#### Poor Agent Performance
**Problem:** Agents not using tools effectively
**Solution:**
- Review and improve agent prompts
- Add more specific tool usage instructions
- Provide additional training examples

## Success Metrics Dashboard

### Daily Metrics
- **Tool Usage Rate:** % of conversations using tools
- **Tool Success Rate:** % of successful tool executions
- **Knowledge Base Hit Rate:** % of questions answered from KB
- **Sentiment Score Distribution:** Average sentiment scores
- **Escalation Rate:** % of conversations escalated

### Weekly Metrics
- **Customer Satisfaction:** Survey scores and feedback
- **Conversion Rate:** % of calls resulting in appointments/sales
- **Agent Efficiency:** Average conversation duration
- **Problem Resolution:** % of issues resolved without escalation

### Monthly Metrics
- **ROI Analysis:** Cost savings vs. implementation costs
- **Performance Trends:** Month-over-month improvements
- **Customer Retention:** Impact on customer satisfaction
- **Agent Optimization:** Areas for further improvement

## Next Steps

### Immediate (Next 7 Days)
1. Complete tool integration testing
2. Upload initial knowledge base documents
3. Deploy sentiment analysis to staging
4. Run comprehensive integration tests

### Short Term (Next 30 Days)
1. Deploy enhanced agents to production
2. Monitor performance metrics
3. Optimize based on real usage data
4. Prepare for Priority 2 enhancements

### Long Term (Next 90 Days)
1. Implement multi-agent orchestration
2. Add proactive engagement features
3. Deploy advanced analytics
4. Scale successful patterns to all agents

---

**Remember:** Start small, test thoroughly, and scale gradually. Each enhancement should demonstrate clear value before moving to the next level.

*This testing and deployment approach will ensure your enhanced agents deliver maximum value with minimal risk.*