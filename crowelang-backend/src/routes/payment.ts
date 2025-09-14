import express from 'express';
import Stripe from 'stripe';
import { User } from '../models/User';
import { License } from '../models/License';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Pricing configuration
const PRICING_PLANS = {
  personal: {
    price_id: 'price_1S6UIGQ6s74Bq3bWvagMAD2A', // Stripe Personal price ID
    amount: 9900, // $99.00
    interval: 'year',
    features: ['Unlimited compilations', 'Commercial use', 'Email support'],
  },
  professional: {
    price_id: 'price_1S6UP2Q6s74Bq3bWTZC7g6N8', // Stripe Professional price ID
    amount: 49900, // $499.00
    interval: 'year',
    features: ['Everything in Personal', 'API access', 'Priority support', 'All targets'],
  },
  team: {
    price_id: 'price_1S6UP4Q6s74Bq3bWfuwPBULv', // Stripe Team price ID
    amount: 199900, // $1,999.00
    interval: 'year',
    features: ['Everything in Professional', '5 user seats', 'Team collaboration'],
  },
};

// Create Stripe checkout session
router.post('/create-checkout-session', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { plan, successUrl, cancelUrl } = req.body;
    const userId = req.user.id;

    if (!PRICING_PLANS[plan as keyof typeof PRICING_PLANS]) {
      return res.status(400).json({ error: 'Invalid pricing plan' });
    }

    const pricingPlan = PRICING_PLANS[plan as keyof typeof PRICING_PLANS];

    const session = await stripe.checkout.sessions.create({
      customer_email: req.user.email,
      client_reference_id: userId,
      line_items: [
        {
          price: pricingPlan.price_id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${process.env.FRONTEND_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/pricing?canceled=true`,
      metadata: {
        userId,
        plan,
      },
      subscription_data: {
        metadata: {
          userId,
          plan,
        },
      },
    });

    logger.info(`Checkout session created for user ${userId}, plan: ${plan}`);
    
    res.json({ 
      checkout_url: session.url,
      session_id: session.id 
    });
  } catch (error) {
    logger.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Get customer portal session
router.post('/create-portal-session', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.stripeCustomerId) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/dashboard`,
    });

    res.json({ portal_url: session.url });
  } catch (error) {
    logger.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Get pricing information
router.get('/pricing', (req, res) => {
  res.json({
    plans: PRICING_PLANS,
    currency: 'usd',
  });
});

// Get user's subscription status
router.get('/subscription', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await User.findById(req.user.id).populate('licenses');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let subscription = null;
    
    if (user.stripeCustomerId) {
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: 'active',
        limit: 1,
      });
      
      if (subscriptions.data.length > 0) {
        subscription = subscriptions.data[0];
      }
    }

    const licenses = await License.find({ userId: user.id });
    const activeLicense = licenses.find(license => 
      license.status === 'active' && license.expiresAt > new Date()
    );

    res.json({
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        plan: subscription.metadata?.plan || 'unknown',
      } : null,
      license: activeLicense ? {
        id: activeLicense.id,
        plan: activeLicense.plan,
        status: activeLicense.status,
        expiresAt: activeLicense.expiresAt,
        usage: activeLicense.usage,
      } : null,
    });
  } catch (error) {
    logger.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Apply promo code
router.post('/apply-promo-code', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { code } = req.body;
    
    // Validate promo code with Stripe
    const promotionCodes = await stripe.promotionCodes.list({
      code,
      active: true,
      limit: 1,
    });
    
    if (promotionCodes.data.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired promo code' });
    }
    
    const promoCode = promotionCodes.data[0];
    const coupon = await stripe.coupons.retrieve(promoCode.coupon.toString());
    
    res.json({
      valid: true,
      coupon: {
        id: coupon.id,
        percent_off: coupon.percent_off,
        amount_off: coupon.amount_off,
        currency: coupon.currency,
        name: coupon.name,
        valid: coupon.valid,
      },
      promotion_code: {
        id: promoCode.id,
        code: promoCode.code,
      },
    });
  } catch (error) {
    logger.error('Error applying promo code:', error);
    res.status(500).json({ error: 'Failed to apply promo code' });
  }
});

export default router;