# Pipedream Deployment Guide

## Overview

This guide walks you through deploying the Autonomous Trading System to Pipedream for 24/7 operation.

## Architecture on Pipedream

```
Timer (60s) → Market Scanner → Signal Generator → Risk Validator → Order Executor
                                                                        ↓
Timer (5m)  → Position Manager ← Performance Analyzer ← Circuit Breaker
```

## Deployment Steps

### 1. Create Pipedream Account
1. Go to [pipedream.com](https://pipedream.com)
2. Sign up for a free account
3. Verify your email

### 2. Set Up Environment Variables

In Pipedream, configure these environment variables:

```env
# Core Configuration
TEST_MODE=true
INITIAL_CAPITAL=10000
SYMBOLS=BTC/USDT,ETH/USDT,SOL/USDT

# AI Configuration
OPENAI_API_KEY=your_openai_api_key

# Exchange APIs (for live trading)
COINBASE_API_KEY=your_coinbase_api_key
COINBASE_SECRET=your_coinbase_secret
BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET=your_binance_secret
KRAKEN_API_KEY=your_kraken_api_key
KRAKEN_SECRET=your_kraken_secret

# Risk Parameters
MAX_DRAWDOWN=0.10
MAX_POSITION_SIZE=0.25
MAX_DAILY_LOSS=0.05
MIN_CONFIDENCE=0.65
TARGET_VOLATILITY=0.15

# Position Management
TRAILING_STOP_DISTANCE=0.02
TAKE_PROFIT_MULTIPLIER=2.5

# Circuit Breaker
MAX_FAILURES=5
CONSECUTIVE_LOSSES_TRIGGER=8
```

### 3. Deploy Workflows

Deploy each workflow in this order:

#### 3.1 Market Scanner Workflow
1. Create new workflow in Pipedream
2. Use timer trigger (60 seconds)
3. Copy code from `pipedream/market-scanner.js`
4. Configure npm packages: `technicalindicators`

#### 3.2 Signal Generator Workflow
1. Create new workflow
2. Use HTTP trigger
3. Copy code from `pipedream/signal-generator.js`
4. Configure npm packages: `openai`
5. Connect to Market Scanner output

#### 3.3 Risk Validator Workflow
1. Create new workflow
2. Use HTTP trigger
3. Copy code from `pipedream/risk-validator.js`
4. Connect to Signal Generator output

#### 3.4 Order Executor Workflow
1. Create new workflow
2. Use HTTP trigger
3. Copy code from `pipedream/order-executor.js`
4. Configure npm packages: `ccxt`
5. Connect to Risk Validator output

#### 3.5 Position Manager Workflow
1. Create new workflow
2. Use timer trigger (300 seconds)
3. Copy code from `pipedream/position-manager.js`

### 4. Configure Workflow Connections

Connect workflows using HTTP requests:

```javascript
// In Market Scanner, send results to Signal Generator
await require("@pipedream/platform").axios($, {
  method: "POST",
  url: "YOUR_SIGNAL_GENERATOR_WEBHOOK_URL",
  data: results
});
```

### 5. Set Up Data Storage

Use Pipedream's built-in data stores for persistence:

```javascript
// Store position data
await $.service.db.set("positions", positions);

// Retrieve position data
const positions = await $.service.db.get("positions") || [];
```

### 6. Enable Monitoring

#### 6.1 Configure Alerts
Set up Pipedream alerts for:
- Workflow failures
- Circuit breaker activation
- Performance degradation

#### 6.2 Log Configuration
Enable detailed logging:
```javascript
console.log(`[${new Date().toISOString()}] ${message}`);
```

## Testing Deployment

### 1. Test Mode Verification
Ensure `TEST_MODE=true` in all workflows initially.

### 2. Manual Trigger Tests
Test each workflow manually:
1. Trigger Market Scanner
2. Verify Signal Generator receives data
3. Check Risk Validator logic
4. Confirm Order Executor mock trades
5. Test Position Manager updates

### 3. End-to-End Test
Run complete cycle and verify:
- Market scanning works
- Signals are generated
- Risk validation passes/fails appropriately
- Orders execute in test mode
- Positions are tracked

## Going Live

### 1. Pre-Live Checklist
- [ ] All tests pass in test mode
- [ ] Exchange APIs configured and tested
- [ ] Risk parameters properly set
- [ ] Circuit breaker tested
- [ ] Monitoring alerts configured
- [ ] Emergency stop procedures documented

### 2. Enable Live Trading
1. Set `TEST_MODE=false`
2. Start with small capital
3. Monitor closely for first 24 hours
4. Gradually increase capital as confidence grows

### 3. Live Monitoring
Monitor these metrics:
- Trade execution success rate
- P&L performance
- Risk metrics (drawdown, exposure)
- System uptime
- Error rates

## Emergency Procedures

### Manual Stop
1. Set circuit breaker manually:
   ```javascript
   circuitBreaker.emergencyStop("Manual intervention");
   ```

2. Disable all timer triggers in Pipedream

### Position Liquidation
If needed, manually close all positions:
```javascript
await positionManager.closeAllPositions("Emergency liquidation");
```

## Optimization

### 1. Performance Tuning
- Monitor execution times
- Optimize heavy computations
- Use caching where appropriate

### 2. Cost Management
- Monitor Pipedream usage
- Optimize workflow frequency
- Use efficient data storage

### 3. Strategy Improvement
- Track strategy performance
- Adjust parameters based on results
- Add new strategies as needed

## Support and Maintenance

### Daily Checks
- Review performance metrics
- Check for errors/alerts
- Verify system is running

### Weekly Reviews
- Analyze strategy performance
- Review and adjust risk parameters
- Update documentation

### Monthly Optimization
- Run genetic algorithm optimization
- Backtest parameter changes
- Update strategies based on market conditions

## Troubleshooting

### Common Issues

1. **Workflow Timeouts**
   - Reduce computation complexity
   - Split heavy operations
   - Increase timeout limits

2. **API Rate Limits**
   - Implement exponential backoff
   - Reduce request frequency
   - Use multiple exchanges

3. **Data Storage Limits**
   - Clean old data regularly
   - Use external storage for large datasets
   - Implement data archiving

4. **Memory Issues**
   - Optimize data structures
   - Clear unused variables
   - Split workflows if needed

### Support Resources
- Pipedream documentation
- Trading system logs
- Performance metrics
- Error tracking

## Security Best Practices

1. **API Key Management**
   - Use environment variables only
   - Rotate keys regularly
   - Monitor for unauthorized access

2. **Access Control**
   - Limit workflow access
   - Use strong passwords
   - Enable 2FA on Pipedream account

3. **Data Privacy**
   - Don't log sensitive data
   - Encrypt stored data
   - Regular security audits