const Stripe = require('stripe');

// Test Stripe configuration
const stripe = new Stripe('sk_test_51RkUYkQ6s74Bq3bWSrntSg2zDY7oTIkEei66oIN7tizeqXPU1joGlJ9fIcbqRUtSkiOkIPeLhSwgedKb4vp7ibHA008b8JuWVJ', {
  apiVersion: '2023-10-16',
});

async function testStripe() {
  try {
    console.log('Testing Stripe connection...');
    
    // Test 1: Fetch account details
    const account = await stripe.accounts.retrieve();
    console.log('\n✅ Account Connected:');
    console.log('- Business Name:', account.settings.dashboard.display_name);
    console.log('- Account ID:', account.id);
    console.log('- Country:', account.country);
    
    // Test 2: List products
    const products = await stripe.products.list({ limit: 5 });
    console.log('\n✅ Products Created:');
    products.data.forEach(product => {
      console.log(`- ${product.name}: ${product.id}`);
    });
    
    // Test 3: List prices
    const prices = await stripe.prices.list({ limit: 5 });
    console.log('\n✅ Prices Configured:');
    for (const price of prices.data) {
      const product = await stripe.products.retrieve(price.product);
      console.log(`- ${product.name}: $${price.unit_amount/100}/${price.recurring?.interval || 'one-time'} (${price.id})`);
    }
    
    // Test 4: Check webhook endpoints
    const webhooks = await stripe.webhookEndpoints.list({ limit: 5 });
    console.log('\n📡 Webhook Endpoints:');
    if (webhooks.data.length === 0) {
      console.log('- No webhook endpoints configured yet');
      console.log('- Use Stripe CLI: stripe listen --forward-to localhost:3000/api/webhooks/stripe');
    } else {
      webhooks.data.forEach(webhook => {
        console.log(`- ${webhook.url} (${webhook.status})`);
      });
    }
    
    console.log('\n✅ Stripe is properly configured and ready to accept payments!');
    console.log('\n💳 Test Card Numbers:');
    console.log('- Success: 4242 4242 4242 4242');
    console.log('- Decline: 4000 0000 0000 0002');
    console.log('- 3D Secure: 4000 0025 0000 3155');
    
  } catch (error) {
    console.error('❌ Stripe Configuration Error:', error.message);
    console.error('\nPlease check:');
    console.error('1. Your API key is correct');
    console.error('2. You have internet connection');
    console.error('3. Your Stripe account is active');
  }
}

testStripe();