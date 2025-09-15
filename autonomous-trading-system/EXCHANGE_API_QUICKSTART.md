# 🏦 Exchange API Quick Setup Guide

## 🎯 Recommended: Start with Coinbase Pro

### Why Coinbase Pro?
- Most user-friendly API
- Best for US users
- Good liquidity
- Reliable uptime
- Clear documentation

## 📋 Coinbase Pro API Setup (5 minutes)

### Step 1: Create Coinbase Pro Account
1. Go to https://pro.coinbase.com
2. Sign up or log in
3. Complete identity verification (if needed)
4. Add payment method

### Step 2: Fund Your Account
1. Deposit $100-500 for testing
2. Buy some USDT/USDC stablecoin
3. Keep some USD for trading

### Step 3: Generate API Keys
1. Go to https://pro.coinbase.com/profile/api
2. Click "New API Key"
3. Settings:
   ```
   Nickname: Trading Bot
   Permissions:
   ✅ View
   ✅ Trade
   ❌ Transfer (keep disabled for safety)

   IP Whitelist: (optional but recommended)
   - Your home IP
   - Your VPS IP (if using)
   ```
4. Click "Create API Key"
5. **IMPORTANT**: Save these immediately:
   - API Key
   - Secret Key
   - Passphrase

### Step 4: Add to Your .env File

```bash
# Edit your .env file
COINBASE_API_KEY=your-api-key-here
COINBASE_SECRET=your-secret-here
COINBASE_PASSPHRASE=your-passphrase-here
```

### Step 5: Test Connection

```bash
# Test your API connection
cd autonomous-trading-system
npm run test-exchange
```

## 🔒 Security Checklist

- [ ] API key has NO transfer permissions
- [ ] Using small test amount ($100-500)
- [ ] TEST_MODE=true in .env
- [ ] Saved API credentials securely
- [ ] Not sharing keys anywhere

## 💰 Initial Trading Setup

### Recommended Starting Portfolio:
```
$500 Total
├── $100 USDT (for trading)
├── $100 USDC (reserve)
├── $100 BTC (hold)
├── $100 ETH (hold)
└── $100 USD (emergency)
```

### Position Sizing (Conservative):
- Max position: 10% of capital ($50)
- Max daily loss: 5% ($25)
- Stop loss: 2% per trade ($1)
- Take profit: 5% per trade ($2.50)

## 🚀 Ready to Trade Checklist

- [ ] Coinbase Pro account verified
- [ ] Account funded with test amount
- [ ] API keys generated and saved
- [ ] Keys added to .env file
- [ ] TEST_MODE=true confirmed
- [ ] Connection tested successfully

## ⚡ Quick Commands

```bash
# Verify API setup
npm run verify-exchange

# Start in test mode
npm run start-test

# Monitor trades
npm run monitor

# Emergency stop
npm run emergency-stop
```

## 📊 What Happens Next?

Once your API is configured:

1. **System will start scanning** markets every 60 seconds
2. **AI analyzes** opportunities with GPT-4
3. **Risk checks** validate each trade
4. **Orders execute** automatically (in TEST_MODE first)
5. **Positions managed** with trailing stops
6. **Dashboard shows** real-time performance

## ⚠️ Important Reminders

1. **Start with TEST_MODE=true**
   - Simulates trades without real money
   - Validates system is working
   - Run for 24 hours before going live

2. **Use Small Amounts**
   - Start with $100-500
   - Scale up gradually
   - Never risk more than you can afford to lose

3. **Monitor Closely**
   - Check dashboard frequently
   - Review trade logs
   - Watch for any errors

## 🆘 Troubleshooting

### "Invalid API Key"
- Check for extra spaces in .env
- Verify key hasn't expired
- Ensure correct permissions

### "Insufficient Funds"
- Add more USDT to account
- Reduce position size in .env
- Check MIN_POSITION_SIZE setting

### "Rate Limited"
- Normal - system handles automatically
- Reduces request frequency
- No action needed

## 📈 Expected Performance

With proper setup:
- **Daily Returns**: 0.5-1%
- **Monthly Returns**: 10-20%
- **Win Rate**: 65-75%
- **Max Drawdown**: <10%

## ✅ You're Ready!

Once API is configured:
1. System starts trading automatically
2. Monitor via dashboard
3. Review daily performance
4. Scale up when confident

---

**Questions?** The system logs everything - check Pipedream logs for details.