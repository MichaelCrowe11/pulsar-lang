# 📋 Pipedream Deployment - Step by Step Guide

## 🚀 Complete Deployment Checklist

### Step 1: Create Pipedream Account ✅
1. Go to https://pipedream.com
2. Sign up with email or GitHub
3. Verify your email
4. Choose the **Developer Plan** (free tier includes 5,000 invocations/month)

### Step 2: Set Environment Variables in Pipedream ✅

1. Go to https://pipedream.com/settings/env-vars
2. Click "New Variable"
3. Add each of these variables:

**Required Variables:**
```
TEST_MODE = true
INITIAL_CAPITAL = 1000
OPENAI_API_KEY = [your OpenAI key]
COINBASE_API_KEY = [your Coinbase key]
COINBASE_SECRET = [your Coinbase secret]
MAX_DRAWDOWN = 0.10
MAX_POSITION_SIZE = 0.10
```

### Step 3: Deploy Market Scanner Workflow

1. Go to https://pipedream.com/new
2. Choose "New Workflow"
3. Name it: "Market Scanner"
4. Set Trigger:
   - Type: Schedule
   - Interval: Every 1 minute
5. Add Code Step:
   - Copy code from: `pipedream/market-scanner.js`
6. Deploy

### Step 4: Deploy Signal Generator Workflow

1. Create new workflow: "Signal Generator"
2. Set Trigger:
   - Type: HTTP / Webhook
   - Method: POST
3. Copy the webhook URL (you'll need this)
4. Add Code Step:
   - Copy code from: `pipedream/signal-generator.js`
5. Deploy

### Step 5: Deploy Risk Validator Workflow

1. Create new workflow: "Risk Validator"
2. Set Trigger:
   - Type: HTTP / Webhook
   - Method: POST
3. Copy the webhook URL
4. Add Code Step:
   - Copy code from: `pipedream/risk-validator.js`
5. Deploy

### Step 6: Deploy Order Executor Workflow

1. Create new workflow: "Order Executor"
2. Set Trigger:
   - Type: HTTP / Webhook
   - Method: POST
3. Copy the webhook URL
4. Add Code Step:
   - Copy code from: `pipedream/order-executor.js`
5. Deploy

### Step 7: Deploy Position Manager Workflow

1. Create new workflow: "Position Manager"
2. Set Trigger:
   - Type: Schedule
   - Interval: Every 5 minutes
3. Add Code Step:
   - Copy code from: `pipedream/position-manager.js`
4. Deploy

### Step 8: Connect Workflows

Update each workflow with webhook URLs:

1. **Market Scanner** → Add webhook for Signal Generator
2. **Signal Generator** → Add webhook for Risk Validator
3. **Risk Validator** → Add webhook for Order Executor
4. **Order Executor** → Logs trades

### Step 9: Test the System

1. Trigger Market Scanner manually
2. Check Pipedream logs for each workflow
3. Verify data flows through all workflows
4. Check for any errors

### Step 10: Monitor Performance

1. Open dashboard: `npm run monitor`
2. Navigate to http://localhost:8080
3. Watch real-time trading activity

## ✅ Deployment Verification Checklist

- [ ] Pipedream account created
- [ ] Environment variables configured
- [ ] All 5 workflows deployed
- [ ] Webhook URLs connected
- [ ] Test run successful
- [ ] Dashboard monitoring active
- [ ] TEST_MODE = true (safety first!)

## 🚨 Important Reminders

1. **Start with TEST_MODE=true**
2. **Use small amounts** ($100-1000)
3. **Monitor closely** for first 24 hours
4. **Have emergency stop ready**

## 📊 Expected Timeline

- Account setup: 5 minutes
- Environment vars: 5 minutes
- Deploy workflows: 15 minutes
- Connect webhooks: 5 minutes
- Testing: 10 minutes
- **Total: ~40 minutes**

## 🎯 Success Indicators

You'll know it's working when:
1. Market Scanner runs every minute
2. Signals flow through all workflows
3. No errors in Pipedream logs
4. Dashboard shows activity
5. (When live) Trades execute on exchange

## 💰 Ready to Trade!

Once deployed and tested, you can:
1. Switch TEST_MODE to false (when ready)
2. Add real API keys
3. Start with small capital
4. Monitor and scale up

---

**Need help?** Check logs in Pipedream dashboard for debugging.