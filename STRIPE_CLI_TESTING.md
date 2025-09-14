# Stripe CLI Testing Guide for Crowe-Lang

## ✅ Stripe CLI Successfully Installed!
**Version:** 1.21.10

## 🔧 Setup Instructions

### 1. Login to Stripe
```bash
./stripe.exe login
```
This will open your browser to authenticate with your Stripe account.

### 2. Forward Webhooks to Local Server
```bash
./stripe.exe listen --forward-to localhost:3000/api/webhooks/stripe
```
This forwards Stripe webhooks to your local backend server.

### 3. Test Payment Flows

#### Create Test Customer
```bash
./stripe.exe customers create \
  --email="test@crowelang.com" \
  --name="Test Customer" \
  --description="Testing Crowe-Lang payment flow"
```

#### Test Checkout Session
```bash
./stripe.exe checkout sessions create \
  --success-url="http://localhost:3000/success" \
  --cancel-url="http://localhost:3000/cancel" \
  --line-items="price=price_personal_annual,quantity=1"
```

#### Test Payment Intent
```bash
./stripe.exe payment_intents create \
  --amount=9900 \
  --currency=usd \
  --payment-method-types=card \
  --metadata="plan=personal,userId=test123"
```

### 4. Monitor Events
```bash
# View recent events
./stripe.exe events list --limit 10

# Tail live events
./stripe.exe logs tail
```

### 5. Test Webhook Events
```bash
# Trigger specific webhook events
./stripe.exe trigger checkout.session.completed
./stripe.exe trigger customer.subscription.created
./stripe.exe trigger invoice.payment_succeeded
```

## 🧪 Complete Payment Test Flow

### Step 1: Start Your Backend
```bash
cd crowelang-backend
npm run dev
```

### Step 2: Forward Webhooks
```bash
./stripe.exe listen --forward-to localhost:3000/api/webhooks/stripe
```
Keep this terminal open - you'll see webhook events here.

### Step 3: Create Test Subscription
```bash
# Create price (if not exists)
./stripe.exe prices create \
  --unit-amount=9900 \
  --currency=usd \
  --recurring="interval=year" \
  --product="prod_crowe_lang_personal"

# Create checkout session
./stripe.exe checkout sessions create \
  --success-url="https://lang.crowetrade.com/success?session_id={CHECKOUT_SESSION_ID}" \
  --cancel-url="https://lang.crowetrade.com/pricing" \
  --mode=subscription \
  --line-items="price=price_xxxxx,quantity=1"
```

### Step 4: Test Card Numbers
Use these test cards for different scenarios:

| Card Number | Scenario |
|------------|----------|
| 4242 4242 4242 4242 | Success - Visa |
| 4000 0000 0000 0002 | Decline - Generic |
| 4000 0000 0000 9995 | Decline - Insufficient funds |
| 4000 0025 0000 3155 | Requires authentication |
| 5555 5555 5554 4444 | Success - Mastercard |
| 3782 822463 10005 | Success - Amex |

Use any future expiry date (e.g., 12/34) and any 3-digit CVC.

### Step 5: Verify License Creation
After successful payment, check:
1. MongoDB for new license document
2. User receives license key
3. License validation endpoint works

## 📊 Test Metrics

### Payment Success Rate Testing
```bash
# Run multiple test payments
for i in {1..10}; do
  ./stripe.exe payment_intents create \
    --amount=$((9900 + $i)) \
    --currency=usd \
    --confirm \
    --payment-method=pm_card_visa
done
```

### Load Testing Webhooks
```bash
# Trigger multiple webhook events
./stripe.exe trigger checkout.session.completed --count 5
```

## 🎯 Integration Verification Checklist

- [ ] Stripe CLI installed and authenticated
- [ ] Webhook forwarding working
- [ ] Test payment creates license in database
- [ ] License key generation works
- [ ] License validation endpoint responds correctly
- [ ] Subscription management works
- [ ] Customer portal accessible
- [ ] Refund handling implemented
- [ ] Failed payment handling works
- [ ] Retry logic for failed webhooks

## 🔍 Debugging Commands

### View API Keys
```bash
./stripe.exe config --list
```

### Test Specific Webhook
```bash
./stripe.exe trigger checkout.session.completed \
  --add="metadata.userId=test123" \
  --add="metadata.plan=personal"
```

### Inspect Event Details
```bash
./stripe.exe events retrieve evt_xxxxx
```

### Test API Directly
```bash
# Get customer
./stripe.exe get /v1/customers/cus_xxxxx

# Get subscription
./stripe.exe get /v1/subscriptions/sub_xxxxx
```

## 🚀 Production Deployment

Once testing is complete:

1. **Set Production Keys**
   ```bash
   # In production environment
   export STRIPE_SECRET_KEY=sk_live_xxxxx
   export STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

2. **Configure Production Webhooks**
   - Go to Stripe Dashboard → Webhooks
   - Add endpoint: `https://api.crowetrade.com/api/webhooks/stripe`
   - Select events: 
     - `checkout.session.completed`
     - `customer.subscription.*`
     - `invoice.*`

3. **Verify Production**
   ```bash
   ./stripe.exe --api-key sk_live_xxxxx customers list --limit 1
   ```

## 💡 Pro Tips

1. **Use Stripe CLI for Development**
   - Faster than dashboard for testing
   - Scriptable for automated testing
   - Real-time webhook forwarding

2. **Test Edge Cases**
   - Network failures
   - Duplicate webhooks
   - Race conditions
   - Timezone issues

3. **Monitor Production**
   ```bash
   # Watch live production events
   ./stripe.exe --api-key sk_live_xxxxx logs tail
   ```

## 🆘 Troubleshooting

### Webhook Not Received
1. Check forwarding is active: `./stripe.exe listen --forward-to localhost:3000/api/webhooks/stripe`
2. Verify endpoint URL is correct
3. Check server is running
4. Review webhook signing secret

### Payment Failed
1. Check API keys are correct
2. Verify price/product exists
3. Check customer has valid payment method
4. Review Stripe Dashboard logs

### License Not Created
1. Check MongoDB connection
2. Verify webhook handler logic
3. Check for duplicate prevention
4. Review error logs

---

**Stripe CLI is now ready to test your complete payment flow for Crowe-Lang! 💳**