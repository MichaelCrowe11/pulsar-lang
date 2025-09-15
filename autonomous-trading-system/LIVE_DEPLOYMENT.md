# 🚀 Live Pipedream Deployment Guide

## Quick Start (15 minutes to live trading)

### Step 1: Pipedream Account Setup (2 minutes)
1. Go to [pipedream.com](https://pipedream.com)
2. Sign up with GitHub or email
3. Verify your email
4. Choose the **Developer Plan** (free tier available)

### Step 2: Environment Variables Setup (5 minutes)

In Pipedream Settings → Environment, add these variables:

```env
# Core Configuration
TEST_MODE=false                    # Set to false for live trading
INITIAL_CAPITAL=1000              # Start with small amount
SYMBOLS=BTC/USDT,ETH/USDT         # Focus on liquid pairs initially

# AI Configuration
OPENAI_API_KEY=sk-your-key-here   # Get from platform.openai.com

# Exchange APIs (Start with one exchange)
COINBASE_API_KEY=your_key
COINBASE_SECRET=your_secret
COINBASE_PASSPHRASE=your_passphrase

# Risk Parameters (Conservative settings)
MAX_DRAWDOWN=0.05                 # 5% maximum drawdown
MAX_POSITION_SIZE=0.10            # 10% per position max
MAX_DAILY_LOSS=0.02               # 2% daily loss limit
MIN_CONFIDENCE=0.75               # Higher confidence threshold

# Position Management
TRAILING_STOP_DISTANCE=0.015      # 1.5% trailing stop
TAKE_PROFIT_MULTIPLIER=2.0        # 2:1 risk/reward minimum
```

### Step 3: Deploy Workflows (8 minutes)

Deploy in this exact order:

#### 3.1 Market Scanner Workflow
```javascript
// Create new workflow → Timer trigger (60 seconds)
// Copy from: pipedream/market-scanner.js
// Dependencies: technicalindicators
```

#### 3.2 Signal Generator Workflow
```javascript
// Create new workflow → HTTP trigger
// Copy from: pipedream/signal-generator.js
// Dependencies: openai
// Connect to Market Scanner webhook
```

#### 3.3 Risk Validator Workflow
```javascript
// Create new workflow → HTTP trigger
// Copy from: pipedream/risk-validator.js
// Connect to Signal Generator webhook
```

#### 3.4 Order Executor Workflow
```javascript
// Create new workflow → HTTP trigger
// Copy from: pipedream/order-executor.js
// Dependencies: ccxt
// Connect to Risk Validator webhook
```

#### 3.5 Position Manager Workflow
```javascript
// Create new workflow → Timer trigger (300 seconds)
// Copy from: pipedream/position-manager.js
```

## 🛡️ Safety Checklist Before Going Live

### Pre-Flight Checks
- [ ] All environment variables configured
- [ ] Exchange API keys tested (sandbox first)
- [ ] `TEST_MODE=false` only after successful testing
- [ ] Small initial capital ($100-1000)
- [ ] Conservative risk settings applied
- [ ] All 5 workflows deployed and connected
- [ ] Monitoring dashboard accessible

### Risk Validation
- [ ] Maximum position size ≤ 10%
- [ ] Daily loss limit ≤ 2%
- [ ] Trailing stops configured
- [ ] Circuit breaker thresholds set
- [ ] Emergency stop procedures documented

## 📊 Go-Live Process

### Phase 1: Simulation Mode (24 hours)
1. Deploy with `TEST_MODE=true`
2. Monitor all workflows running
3. Verify signal generation and risk management
4. Check monitoring dashboard updates
5. Validate circuit breaker functionality

### Phase 2: Micro Live Trading (48 hours)
1. Set `TEST_MODE=false`
2. Set `INITIAL_CAPITAL=100` (very small)
3. Monitor first real trades closely
4. Verify P&L tracking accuracy
5. Test emergency stop procedures

### Phase 3: Scale Up (Gradual)
1. Increase capital incrementally
2. Add more trading pairs
3. Optimize strategy parameters
4. Monitor performance metrics

## 🔗 Workflow Connections

Connect workflows using these webhook URLs:

```javascript
// Market Scanner → Signal Generator
const signalGeneratorURL = "https://your-signal-generator-webhook.pipedream.net";

// Signal Generator → Risk Validator
const riskValidatorURL = "https://your-risk-validator-webhook.pipedream.net";

// Risk Validator → Order Executor
const orderExecutorURL = "https://your-order-executor-webhook.pipedream.net";
```

## 📈 Monitoring & Alerts

### Real-Time Monitoring
- **Dashboard**: Open `monitoring/dashboard.html`
- **Pipedream Logs**: Monitor workflow execution
- **Exchange**: Check actual positions and trades
- **Performance**: Track P&L and metrics

### Alert Configuration
Set up alerts for:
- Circuit breaker activation
- Significant losses (>1%)
- Workflow failures
- API connection issues

## 🚨 Emergency Procedures

### Manual Stop (If Needed)
1. **Immediate**: Disable all timer triggers in Pipedream
2. **Positions**: Manually close positions on exchange
3. **Investigation**: Check logs for issues
4. **Recovery**: Fix issues before restarting

### Emergency Contacts
- Pipedream Support: support@pipedream.com
- Exchange Support: Check exchange documentation

## 📊 Expected Performance

### Target Metrics (After optimization)
- **Sharpe Ratio**: 1.5-2.5
- **Win Rate**: 55-70%
- **Maximum Drawdown**: <5%
- **Monthly Return**: 2-8%

### Monitoring Schedule
- **First 24 hours**: Check every 2 hours
- **First week**: Check twice daily
- **Ongoing**: Daily monitoring

## 🔧 Troubleshooting

### Common Issues
1. **Workflow timeouts**: Reduce computation complexity
2. **API rate limits**: Add delays between requests
3. **Memory issues**: Optimize data structures
4. **Connection failures**: Implement retry logic

### Performance Optimization
- Monitor execution times
- Optimize heavy calculations
- Use data caching where appropriate
- Split complex workflows if needed

## 💰 Cost Management

### Pipedream Usage
- **Free tier**: 100 workflow executions/day
- **Developer plan**: $19/month for more executions
- **Professional plan**: $49/month for high frequency

### Exchange Fees
- **Coinbase Pro**: 0.5% taker, 0.5% maker
- **Binance**: 0.1% taker, 0.1% maker
- **Kraken**: 0.26% taker, 0.16% maker

## 🎯 Success Metrics

### Week 1 Goals
- [ ] System running 24/7 without crashes
- [ ] At least 10 successful trades executed
- [ ] No circuit breaker activations
- [ ] Positive or break-even P&L

### Month 1 Goals
- [ ] Consistent positive returns
- [ ] Sharpe ratio > 1.0
- [ ] Maximum drawdown < 5%
- [ ] 90%+ uptime

## 📞 Support

### Getting Help
1. **Documentation**: Check README.md and deployment guides
2. **Logs**: Review Pipedream workflow logs
3. **Testing**: Run `npm test` to verify system
4. **Community**: Trading system forums and Discord

**Ready to make money? Let's deploy! 🚀**