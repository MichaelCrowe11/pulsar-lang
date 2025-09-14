# CroweLang Crypto Payments Integration

## Overview

CroweLang now supports cryptocurrency payments through Coinbase Commerce, allowing customers to pay with Bitcoin, Ethereum, Litecoin, Bitcoin Cash, USDC, and Dai.

## Supported Cryptocurrencies

- **Bitcoin (BTC)** - The original cryptocurrency
- **Ethereum (ETH)** - Smart contracts and DeFi
- **Litecoin (LTC)** - Fast and low-cost transactions  
- **Bitcoin Cash (BCH)** - Bitcoin fork with larger blocks
- **USD Coin (USDC)** - Stable coin pegged to USD
- **Dai (DAI)** - Decentralized stable coin

## Pricing Structure

All prices are fixed in USD and automatically converted to cryptocurrency at current market rates:

| Plan | USD Price | Features |
|------|-----------|----------|
| **Personal** | $99/year | Unlimited compilations, commercial use, email support |
| **Professional** | $499/year | Everything in Personal + API access + Priority support + All targets |
| **Team** | $1,999/year | Everything in Professional + 5 user seats + Team collaboration |

## API Endpoints

### Create Crypto Payment Charge

```http
POST /api/crypto/create-charge
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "plan": "personal|professional|team"
}
```

**Response:**
```json
{
  "success": true,
  "charge": {
    "id": "charge-id",
    "hosted_url": "https://commerce.coinbase.com/charges/charge-id",
    "expires_at": "2024-01-01T00:00:00Z",
    "pricing": {
      "local": { "amount": "99.00", "currency": "USD" },
      "bitcoin": { "amount": "0.00234567", "currency": "BTC" },
      "ethereum": { "amount": "0.0456789", "currency": "ETH" }
    },
    "addresses": {
      "bitcoin": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      "ethereum": "0x742d35Cc6634C0532925a3b8D94d1",
      "litecoin": "ltc1qdkc4k23e0v...",
      "bitcoincash": "bitcoincash:qq..."
    }
  }
}
```

### Get Charge Details

```http
GET /api/crypto/charge/:chargeId
Authorization: Bearer <jwt_token>
```

### List User's Charges

```http
GET /api/crypto/charges
Authorization: Bearer <jwt_token>
```

### Get Supported Currencies

```http
GET /api/crypto/currencies
```

## Payment Flow

1. **User initiates payment**
   - User selects plan and payment method (crypto)
   - Frontend calls `/api/crypto/create-charge`
   - User redirected to Coinbase Commerce hosted page

2. **User completes payment**
   - User selects cryptocurrency and pays
   - Coinbase handles conversion and collection
   - User redirected back to CroweLang dashboard

3. **Payment confirmation**
   - Coinbase sends webhook to `/api/crypto/webhook`
   - Server verifies webhook signature
   - License automatically created and activated
   - User gains immediate access to features

## Webhook Events

The system handles these Coinbase Commerce webhook events:

- `charge:confirmed` - Payment successful, license created
- `charge:failed` - Payment failed, user notified
- `charge:delayed` - Payment delayed (common with Bitcoin)
- `charge:pending` - Payment initiated but not confirmed
- `charge:resolved` - Delayed payment finally processed

## Security Features

### Webhook Verification
All webhooks are cryptographically verified using HMAC-SHA256:

```javascript
const signature = req.headers['x-cc-webhook-signature'];
const event = Webhook.verifyEventBody(rawBody, signature, webhookSecret);
```

### License Protection
- Automatic license generation on payment confirmation
- Duplicate payment protection via charge ID tracking
- Hardware fingerprinting for license enforcement
- Secure license key generation with crypto checksums

### Transaction Auditing
All crypto payments are logged with:
- Blockchain network (Bitcoin, Ethereum, etc.)
- Transaction ID for blockchain verification
- Payment amount and currency
- Confirmation timestamp
- User and license associations

## Environment Configuration

Required environment variables:

```bash
# Coinbase Commerce
COINBASE_COMMERCE_API_KEY=Sw3+wuhe84CgNRToB+CmS716P0m...
COINBASE_COMMERCE_WEBHOOK_SECRET=your-webhook-secret

# Coinbase OAuth (for advanced features)
COINBASE_CLIENT_ID=5bc1d0f3-894f-4d02-988e-b36076530b1c
COINBASE_CLIENT_SECRET=pUd5Z0yx9dJo4o6NIn4Ox4Idvv
COINBASE_API_KEY_ID=ddae9bb3-3f56-435b-94fa-5df58d670f45
```

## Database Schema

Crypto payments extend the License model:

```javascript
{
  metadata: {
    paymentMethod: 'crypto',
    cryptoChargeId: 'coinbase-charge-id',
    cryptoPayment: {
      network: 'bitcoin',
      transactionId: 'blockchain-tx-hash',
      amount: '0.00234567',
      currency: 'BTC',
      confirmedAt: '2024-01-01T00:00:00Z'
    }
  }
}
```

## Frontend Integration

### JavaScript Example

```javascript
// Create crypto payment
const response = await fetch('/api/crypto/create-charge', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ plan: 'professional' })
});

const { charge } = await response.json();

// Redirect to Coinbase Commerce
window.location.href = charge.hosted_url;
```

### React Component Example

```jsx
const CryptoPaymentButton = ({ plan }) => {
  const [loading, setLoading] = useState(false);

  const handleCryptoPayment = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/crypto/create-charge', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan })
      });
      
      const { charge } = await response.json();
      window.location.href = charge.hosted_url;
    } catch (error) {
      console.error('Crypto payment failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleCryptoPayment}
      disabled={loading}
      className="crypto-payment-btn"
    >
      {loading ? 'Creating Payment...' : '💰 Pay with Crypto'}
    </button>
  );
};
```

## Testing

### Coinbase Commerce Test Mode
1. Use test API keys for development
2. Test payments don't charge real money
3. Simulate different payment states via dashboard

### Local Testing
```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your credentials

# Start development server
npm run dev

# Test API endpoints
curl -X POST http://localhost:3000/api/crypto/currencies
```

## Production Deployment

1. **Generate Production Keys**
   - Create production Coinbase Commerce account
   - Generate production API keys and webhook secrets
   - Configure production environment variables

2. **Webhook Configuration**
   - Set webhook URL: `https://api.crowelang.com/api/crypto/webhook`
   - Subscribe to: `charge:confirmed`, `charge:failed`, `charge:delayed`
   - Test webhook delivery

3. **SSL/TLS Requirements**
   - HTTPS required for production webhooks
   - Valid SSL certificate mandatory
   - Consider using Let's Encrypt or CloudFlare

## Monitoring & Analytics

### Payment Metrics
- Track conversion rates by cryptocurrency
- Monitor payment completion times
- Analyze preferred payment methods

### Error Handling
- Webhook delivery failures
- Payment timeouts and expirations
- Network-specific issues (Bitcoin vs Ethereum)

### Logging
All crypto payment events are logged with structured data:

```javascript
logger.info('Crypto payment confirmed', {
  chargeId: charge.id,
  userId: user.id,
  plan: metadata.plan,
  cryptocurrency: payment.currency,
  amount: payment.amount,
  transactionId: payment.transaction_id,
  network: payment.network
});
```

## Support & Troubleshooting

### Common Issues

**Payment Not Confirmed**
- Check blockchain network congestion
- Verify sufficient gas fees (Ethereum)
- Monitor Coinbase Commerce dashboard

**Webhook Failures**
- Verify webhook signature validation
- Check server SSL certificate
- Review webhook endpoint logs

**License Not Generated**
- Confirm webhook endpoint accessibility
- Check database connectivity
- Review application error logs

### Customer Support Flow

1. User reports payment issue
2. Locate charge ID in user's payment history
3. Check Coinbase Commerce dashboard for payment status
4. Verify webhook delivery and processing
5. Manually trigger license creation if needed
6. Provide transaction hash for blockchain verification

## Compliance & Legal

### Financial Regulations
- Cryptocurrency payments may have different tax implications
- Consider KYC/AML requirements based on jurisdiction
- Maintain transaction records for audit purposes

### Terms of Service Updates
- Add cryptocurrency payment terms
- Specify refund policies for crypto payments
- Include blockchain confirmation requirements

This integration provides a complete cryptocurrency payment solution for CroweLang, offering customers flexible payment options while maintaining security and compliance standards.