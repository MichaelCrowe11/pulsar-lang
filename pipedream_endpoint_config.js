// Pipedream Endpoint Configuration & Authorization Setup
// This file shows you exactly how to use your Pipedream endpoint

const PIPEDREAM_ENDPOINT = 'https://eopp6bs30sepig.m.pipedream.net';

// ============================================
// OPTION 1: No Authorization (Current Setup)
// ============================================
// Your endpoint is currently set to "none" - anyone can call it
async function callEndpointNoAuth() {
  const response = await fetch(PIPEDREAM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      symbol: 'BTC-USD',
      side: 'BUY',
      quantity: 0.001,
      price: 50000,
      urgency: 'normal'
    })
  });

  const result = await response.text();
  console.log('Trade executed:', result);
}

// ============================================
// OPTION 2: Bearer Token Authorization (RECOMMENDED)
// ============================================
// To enable: Go to your workflow → Trigger → Authorization → Bearer Token
// Generate a token and use it like this:

const BEARER_TOKEN = 'YOUR_BEARER_TOKEN_HERE'; // Get from Pipedream

async function callEndpointWithBearer() {
  const response = await fetch(PIPEDREAM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${BEARER_TOKEN}`
    },
    body: JSON.stringify({
      symbol: 'BTC-USD',
      side: 'BUY',
      quantity: 0.001,
      price: 50000
    })
  });

  const result = await response.json();
  console.log('Secure trade executed:', result);
}

// ============================================
// OPTION 3: API Key Authorization
// ============================================
// To enable: Go to your workflow → Trigger → Authorization → API Key
// Set a custom header name (e.g., 'X-API-Key')

const API_KEY = 'YOUR_API_KEY_HERE'; // Set in Pipedream

async function callEndpointWithAPIKey() {
  const response = await fetch(PIPEDREAM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify({
      symbol: 'ETH-USD',
      side: 'SELL',
      quantity: 0.01,
      price: 3500
    })
  });

  const result = await response.json();
  console.log('API Key authenticated trade:', result);
}

// ============================================
// OPTION 4: OAuth 2.0 (Advanced)
// ============================================
// For production apps with multiple users

async function callEndpointWithOAuth() {
  // First get OAuth token
  const tokenResponse = await fetch('https://api.pipedream.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: 'YOUR_CLIENT_ID',
      client_secret: 'YOUR_CLIENT_SECRET'
    })
  });

  const { access_token } = await tokenResponse.json();

  // Then use token to call endpoint
  const response = await fetch(PIPEDREAM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${access_token}`
    },
    body: JSON.stringify({
      symbol: 'SOL-USD',
      side: 'BUY',
      quantity: 1,
      price: 150
    })
  });

  const result = await response.json();
  console.log('OAuth authenticated trade:', result);
}

// ============================================
// COMPLETE TRADING SYSTEM INTEGRATION
// ============================================

class PipedreamTradingClient {
  constructor(endpoint, authType = 'none', authToken = null) {
    this.endpoint = endpoint;
    this.authType = authType;
    this.authToken = authToken;
  }

  // Build headers based on auth type
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    switch (this.authType) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${this.authToken}`;
        break;
      case 'apikey':
        headers['X-API-Key'] = this.authToken;
        break;
      case 'basic':
        headers['Authorization'] = `Basic ${Buffer.from(this.authToken).toString('base64')}`;
        break;
    }

    return headers;
  }

  // Execute a trade
  async executeTrade(symbol, side, quantity, price, urgency = 'normal') {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          symbol,
          side,
          quantity,
          price,
          urgency,
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.text();
      return {
        success: true,
        data: result,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('Trade execution failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  // Get market data
  async getMarketData(symbol) {
    const response = await fetch(this.endpoint + '/market', {
      method: 'GET',
      headers: this.getHeaders(),
      params: { symbol }
    });

    return await response.json();
  }

  // Check system health
  async checkHealth() {
    const response = await fetch(this.endpoint + '/health', {
      method: 'GET',
      headers: this.getHeaders()
    });

    return await response.json();
  }
}

// ============================================
// USAGE EXAMPLES
// ============================================

// Example 1: Basic usage (no auth)
const basicClient = new PipedreamTradingClient(PIPEDREAM_ENDPOINT);
basicClient.executeTrade('BTC-USD', 'BUY', 0.001, 50000);

// Example 2: Secure usage (with bearer token)
const secureClient = new PipedreamTradingClient(
  PIPEDREAM_ENDPOINT,
  'bearer',
  'your-bearer-token-here'
);
secureClient.executeTrade('ETH-USD', 'SELL', 0.1, 3500);

// Example 3: Automated trading loop
async function automatedTradingLoop() {
  const client = new PipedreamTradingClient(PIPEDREAM_ENDPOINT, 'bearer', BEARER_TOKEN);

  setInterval(async () => {
    // Check market conditions
    const marketData = await client.getMarketData('BTC-USD');

    // Make trading decision
    if (marketData.signal === 'BUY') {
      const result = await client.executeTrade(
        'BTC-USD',
        'BUY',
        0.001,
        marketData.price
      );
      console.log('Trade executed:', result);
    }
  }, 60000); // Check every minute
}

// ============================================
// TESTING YOUR ENDPOINT
// ============================================

async function testEndpoint() {
  console.log('Testing Pipedream endpoint...');
  console.log('Endpoint:', PIPEDREAM_ENDPOINT);
  console.log('');

  // Test 1: Basic connectivity
  console.log('Test 1: Basic connectivity');
  try {
    const response = await fetch(PIPEDREAM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true })
    });
    console.log('✅ Endpoint reachable');
    console.log('Response:', await response.text());
  } catch (error) {
    console.log('❌ Endpoint not reachable:', error.message);
  }

  console.log('');

  // Test 2: Trade execution
  console.log('Test 2: Trade execution');
  try {
    const response = await fetch(PIPEDREAM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: 'BTC-USD',
        side: 'BUY',
        quantity: 0.001,
        price: 50000
      })
    });
    console.log('✅ Trade request sent');
    console.log('Response:', await response.text());
  } catch (error) {
    console.log('❌ Trade failed:', error.message);
  }
}

// Export for use in other files
module.exports = {
  PipedreamTradingClient,
  PIPEDREAM_ENDPOINT,
  callEndpointNoAuth,
  callEndpointWithBearer,
  callEndpointWithAPIKey,
  testEndpoint
};

// Run test if this file is executed directly
if (require.main === module) {
  testEndpoint();
}