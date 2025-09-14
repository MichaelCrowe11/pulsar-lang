const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');

const app = express();
const stripe = new Stripe('sk_test_51RkUYkQ6s74Bq3bWSrntSg2zDY7oTIkEei66oIN7tizeqXPU1joGlJ9fIcbqRUtSkiOkIPeLhSwgedKb4vp7ibHA008b8JuWVJ', {
  apiVersion: '2023-10-16',
});

// Pricing configuration with actual Stripe price IDs
const PRICING_PLANS = {
  personal: {
    price_id: 'price_1S6UIGQ6s74Bq3bWvagMAD2A',
    amount: 9900,
    name: 'Crowe-Lang Personal'
  },
  professional: {
    price_id: 'price_1S6UP2Q6s74Bq3bWTZC7g6N8',
    amount: 49900,
    name: 'Crowe-Lang Professional'
  },
  team: {
    price_id: 'price_1S6UP4Q6s74Bq3bWfuwPBULv',
    amount: 199900,
    name: 'Crowe-Lang Team'
  }
};

app.use(cors());
app.use(express.json());
app.use('/webhook', express.raw({ type: 'application/json' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Crowe-Lang Payment Server is running',
    stripe: 'connected',
    plans: Object.keys(PRICING_PLANS)
  });
});

// Create checkout session
app.post('/api/payment/create-checkout-session', async (req, res) => {
  try {
    const { plan = 'personal' } = req.body;
    const pricingPlan = PRICING_PLANS[plan];
    
    if (!pricingPlan) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: pricingPlan.price_id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin || 'http://localhost:3001'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'http://localhost:3001'}/cancel`,
      metadata: {
        plan: plan,
        product: pricingPlan.name
      }
    });

    res.json({ 
      checkoutUrl: session.url,
      sessionId: session.id 
    });
    
    console.log(`✅ Checkout session created for ${pricingPlan.name}: ${session.id}`);
  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get session status
app.get('/api/payment/session/:sessionId', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    res.json({
      status: session.payment_status,
      customer: session.customer_details,
      subscription: session.subscription,
      amount: session.amount_total
    });
  } catch (error) {
    res.status(404).json({ error: 'Session not found' });
  }
});

// List products and prices
app.get('/api/payment/products', async (req, res) => {
  try {
    const products = await stripe.products.list({ active: true, limit: 10 });
    const prices = await stripe.prices.list({ active: true, limit: 10 });
    
    res.json({
      products: products.data,
      prices: prices.data,
      plans: PRICING_PLANS
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint
app.post('/webhook/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // For testing without webhook secret
    event = req.body;
    
    console.log(`📨 Webhook received: ${event.type}`);
    
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log(`✅ Payment successful for session: ${session.id}`);
        // Here you would create the license
        break;
        
      case 'payment_intent.succeeded':
        console.log(`💰 Payment received: ${event.data.object.amount / 100}`);
        break;
        
      default:
        console.log(`📌 Unhandled event type: ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (err) {
    console.error(`❌ Webhook error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
🚀 Crowe-Lang Payment Server is running!
   
📍 Server: http://localhost:${PORT}
💳 Stripe: Connected with test keys
📦 Products: ${Object.keys(PRICING_PLANS).join(', ')}

Test endpoints:
- GET  http://localhost:${PORT}/health
- POST http://localhost:${PORT}/api/payment/create-checkout-session
- GET  http://localhost:${PORT}/api/payment/products

Test cards:
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
  `);
});