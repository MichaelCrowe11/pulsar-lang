const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
const axios = require('axios');

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

// Express app for health checks
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Crowe-Lang MCP Server',
    stripe: 'connected',
    timestamp: new Date().toISOString()
  });
});

// MCP Server setup
const server = new Server(
  {
    name: 'crowe-lang-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
const TOOLS = [
  {
    name: 'create_checkout_session',
    description: 'Create a Stripe checkout session for Crowe-Lang license purchase',
    inputSchema: {
      type: 'object',
      properties: {
        plan: {
          type: 'string',
          enum: ['personal', 'professional', 'team'],
          description: 'The license plan to purchase'
        },
        customer_email: {
          type: 'string',
          description: 'Customer email address'
        },
        success_url: {
          type: 'string',
          description: 'URL to redirect to after successful payment'
        },
        cancel_url: {
          type: 'string',
          description: 'URL to redirect to if payment is cancelled'
        }
      },
      required: ['plan']
    }
  },
  {
    name: 'get_customer_licenses',
    description: 'Retrieve all licenses for a customer',
    inputSchema: {
      type: 'object',
      properties: {
        customer_email: {
          type: 'string',
          description: 'Customer email address'
        },
        customer_id: {
          type: 'string',
          description: 'Stripe customer ID'
        }
      }
    }
  },
  {
    name: 'validate_license',
    description: 'Validate a Crowe-Lang license key',
    inputSchema: {
      type: 'object',
      properties: {
        license_key: {
          type: 'string',
          description: 'The license key to validate'
        },
        hardware_fingerprint: {
          type: 'string',
          description: 'Hardware fingerprint for license binding'
        }
      },
      required: ['license_key']
    }
  },
  {
    name: 'get_payment_status',
    description: 'Get the status of a payment session',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Stripe checkout session ID'
        }
      },
      required: ['session_id']
    }
  },
  {
    name: 'list_products',
    description: 'List all available Crowe-Lang products and pricing',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'create_customer_portal',
    description: 'Create a Stripe customer portal session for subscription management',
    inputSchema: {
      type: 'object',
      properties: {
        customer_id: {
          type: 'string',
          description: 'Stripe customer ID'
        },
        return_url: {
          type: 'string',
          description: 'URL to return to after portal session'
        }
      },
      required: ['customer_id']
    }
  }
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'create_checkout_session':
        return await createCheckoutSession(args);
      
      case 'get_customer_licenses':
        return await getCustomerLicenses(args);
      
      case 'validate_license':
        return await validateLicense(args);
      
      case 'get_payment_status':
        return await getPaymentStatus(args);
      
      case 'list_products':
        return await listProducts();
      
      case 'create_customer_portal':
        return await createCustomerPortal(args);
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }],
      isError: true
    };
  }
});

// Tool implementations
async function createCheckoutSession(args) {
  const { plan, customer_email, success_url, cancel_url } = args;
  
  const PRICING_PLANS = {
    personal: 'price_1S6UIGQ6s74Bq3bWvagMAD2A',
    professional: 'price_1S6UP2Q6s74Bq3bWTZC7g6N8',
    team: 'price_1S6UP4Q6s74Bq3bWfuwPBULv'
  };

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    customer_email,
    line_items: [{
      price: PRICING_PLANS[plan],
      quantity: 1,
    }],
    mode: 'subscription',
    success_url: success_url || 'http://localhost:3001/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: cancel_url || 'http://localhost:3001/cancel',
    metadata: {
      plan,
      service: 'crowe-lang'
    }
  });

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        checkout_url: session.url,
        session_id: session.id,
        plan,
        amount: session.amount_total
      }, null, 2)
    }]
  };
}

async function getCustomerLicenses(args) {
  try {
    const response = await axios.get(`${API_BASE_URL}/license/customer`, {
      params: args
    });
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2)
      }]
    };
  } catch (error) {
    // Fallback to mock data if API not available
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          message: 'API not available, returning mock data',
          licenses: []
        }, null, 2)
      }]
    };
  }
}

async function validateLicense(args) {
  try {
    const response = await axios.post(`${API_BASE_URL}/license/validate`, args);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          valid: false,
          error: 'License validation service unavailable'
        }, null, 2)
      }]
    };
  }
}

async function getPaymentStatus(args) {
  const { session_id } = args;
  
  const session = await stripe.checkout.sessions.retrieve(session_id);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        session_id,
        payment_status: session.payment_status,
        status: session.status,
        customer: session.customer_details,
        amount_total: session.amount_total,
        subscription: session.subscription
      }, null, 2)
    }]
  };
}

async function listProducts() {
  const products = await stripe.products.list({ active: true, limit: 10 });
  const prices = await stripe.prices.list({ active: true, limit: 10 });
  
  const productData = await Promise.all(
    products.data.map(async (product) => {
      const productPrices = prices.data.filter(price => price.product === product.id);
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        prices: productPrices.map(price => ({
          id: price.id,
          amount: price.unit_amount,
          currency: price.currency,
          interval: price.recurring?.interval
        }))
      };
    })
  );

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        products: productData,
        total: products.data.length
      }, null, 2)
    }]
  };
}

async function createCustomerPortal(args) {
  const { customer_id, return_url } = args;
  
  const session = await stripe.billingPortal.sessions.create({
    customer: customer_id,
    return_url: return_url || 'http://localhost:3001'
  });

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        portal_url: session.url,
        customer_id,
        expires_at: session.expires_at
      }, null, 2)
    }]
  };
}

// Start the servers
async function main() {
  // Start Express server for health checks
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`🚀 Crowe-Lang MCP Server running on port ${PORT}`);
    console.log(`💳 Stripe integration: ${process.env.STRIPE_SECRET_KEY ? 'Enabled' : 'Disabled'}`);
    console.log(`🔌 API Base URL: ${API_BASE_URL}`);
  });

  // Start MCP server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('📡 MCP Server connected via stdio');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down MCP server...');
  process.exit(0);
});

main().catch(console.error);