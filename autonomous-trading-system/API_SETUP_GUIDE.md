# 🔑 API Setup Guide

## Required API Keys for Trading

### 1. OpenAI API Key (REQUIRED)
**Purpose**: Powers the AI decision-making engine

1. Go to https://platform.openai.com/api-keys
2. Sign up or log in to your OpenAI account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)
5. Add to .env: `OPENAI_API_KEY=sk-your-key-here`
6. **Cost**: ~$10-50/month depending on usage

### 2. Coinbase Pro API (RECOMMENDED TO START)
**Purpose**: Execute trades on Coinbase exchange

1. Go to https://pro.coinbase.com
2. Sign in to your account
3. Navigate to Profile → API
4. Click "New API Key"
5. Set permissions:
   - View: ✅ (Required)
   - Trade: ✅ (Required)
   - Transfer: ❌ (Not needed)
6. Copy:
   - API Key
   - Secret Key
   - Passphrase
7. Add to .env:
   ```
   COINBASE_API_KEY=your_key
   COINBASE_SECRET=your_secret
   COINBASE_PASSPHRASE=your_passphrase
   ```

### 3. Binance API (OPTIONAL)
**Purpose**: Trade on Binance for better liquidity

1. Go to https://www.binance.com/en/my/settings/api-management
2. Create API
3. Label it "Trading Bot"
4. Complete verification
5. Enable:
   - Reading: ✅
   - Spot Trading: ✅
   - Futures: ❌ (Not needed initially)
6. Copy API Key and Secret
7. Add to .env:
   ```
   BINANCE_API_KEY=your_key
   BINANCE_SECRET=your_secret
   ```

### 4. Kraken API (OPTIONAL)
**Purpose**: Additional exchange for arbitrage

1. Go to https://www.kraken.com/u/security/api
2. Add new API key
3. Description: "Trading Bot"
4. Permissions:
   - Query Funds: ✅
   - Query Orders: ✅
   - Trade: ✅
5. Generate key
6. Copy API Key and Private Key
7. Add to .env:
   ```
   KRAKEN_API_KEY=your_key
   KRAKEN_SECRET=your_secret
   ```

## 🔒 Security Best Practices

1. **API Key Restrictions**:
   - Limit to trading only (no withdrawals)
   - Set IP whitelist if possible
   - Use read-only keys for testing

2. **Start Small**:
   - Begin with $100-500 for testing
   - Use TEST_MODE=true initially
   - Monitor for 24-48 hours before increasing

3. **Never Share**:
   - Keep .env file private
   - Don't commit to GitHub
   - Don't share in Discord/forums

## ✅ Quick Verification

After adding your keys, run:
```bash
npm run quick-start
```

This will verify:
- ✅ API keys are formatted correctly
- ✅ Environment is configured
- ✅ System is ready for deployment

## 🚨 Important Notes

1. **Start with ONE exchange** (Coinbase recommended)
2. **Use small amounts** initially ($100-1000)
3. **Keep TEST_MODE=true** for first 24 hours
4. **Monitor closely** using the dashboard
5. **Have emergency stop** ready

## 📊 Estimated Costs

- **OpenAI API**: $10-50/month
- **Exchange Fees**: 0.1-0.25% per trade
- **Total Operating Cost**: <$100/month
- **Recommended Starting Capital**: $500-1000

## 🎯 Next Steps

Once your API keys are configured:

1. Run `npm run quick-start` to verify
2. Deploy to Pipedream
3. Start with TEST_MODE=true
4. Monitor performance
5. Scale gradually

---

**Need help?** Check the troubleshooting guide in README.md