import express from 'express';
import Stripe from 'stripe';
import { User } from '../models/User';
import { License } from '../models/License';
import { logger } from '../utils/logger';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Stripe webhook handler
router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.created':
        await handleCustomerCreated(event.data.object as Stripe.Customer);
        break;

      default:
        logger.info(`Unhandled webhook event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Handle successful checkout session
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const { client_reference_id: userId, metadata, subscription: subscriptionId } = session;

  if (!userId || !metadata?.plan) {
    logger.error('Missing userId or plan in checkout session metadata');
    return;
  }

  logger.info(`Processing checkout completion for user ${userId}, plan: ${metadata.plan}`);

  try {
    // Update user with Stripe customer ID
    const user = await User.findById(userId);
    if (!user) {
      logger.error(`User not found: ${userId}`);
      return;
    }

    if (session.customer && !user.stripeCustomerId) {
      user.stripeCustomerId = session.customer as string;
      await user.save();
    }

    // Create license if subscription was created
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
      await createLicenseFromSubscription(subscription, userId);
    }
  } catch (error) {
    logger.error('Error handling checkout session completed:', error);
  }
}

// Handle subscription creation
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  
  if (!userId) {
    logger.error('Missing userId in subscription metadata');
    return;
  }

  await createLicenseFromSubscription(subscription, userId);
}

// Handle subscription updates
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  
  if (!userId) {
    logger.error('Missing userId in subscription metadata');
    return;
  }

  try {
    // Find existing license for this subscription
    const license = await License.findOne({
      'metadata.stripeSubscriptionId': subscription.id
    });

    if (!license) {
      // Create new license if none exists
      await createLicenseFromSubscription(subscription, userId);
      return;
    }

    // Update license status based on subscription status
    let newStatus: 'active' | 'expired' | 'suspended' | 'cancelled' = 'active';
    
    switch (subscription.status) {
      case 'active':
        newStatus = 'active';
        break;
      case 'canceled':
      case 'incomplete_expired':
        newStatus = 'cancelled';
        break;
      case 'past_due':
      case 'unpaid':
        newStatus = 'suspended';
        break;
      default:
        newStatus = 'suspended';
    }

    license.status = newStatus;
    license.expiresAt = new Date(subscription.current_period_end * 1000);
    
    // Update plan if it changed
    if (subscription.metadata?.plan && subscription.metadata.plan !== license.plan) {
      license.plan = subscription.metadata.plan as any;
    }

    await license.save();
    
    logger.info(`License updated for subscription ${subscription.id}: status=${newStatus}, expires=${license.expiresAt}`);
  } catch (error) {
    logger.error('Error handling subscription updated:', error);
  }
}

// Handle subscription deletion
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const license = await License.findOne({
      'metadata.stripeSubscriptionId': subscription.id
    });

    if (license) {
      license.status = 'cancelled';
      await license.save();
      logger.info(`License cancelled for subscription ${subscription.id}`);
    }
  } catch (error) {
    logger.error('Error handling subscription deleted:', error);
  }
}

// Handle successful payment
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  try {
    const license = await License.findOne({
      'metadata.stripeSubscriptionId': invoice.subscription
    });

    if (license) {
      // Reactivate license if it was suspended
      if (license.status === 'suspended') {
        license.status = 'active';
        await license.save();
        logger.info(`License reactivated for subscription ${invoice.subscription}`);
      }
    }
  } catch (error) {
    logger.error('Error handling invoice payment succeeded:', error);
  }
}

// Handle failed payment
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  try {
    const license = await License.findOne({
      'metadata.stripeSubscriptionId': invoice.subscription
    });

    if (license && license.status === 'active') {
      license.status = 'suspended';
      await license.save();
      logger.info(`License suspended for failed payment, subscription ${invoice.subscription}`);
    }
  } catch (error) {
    logger.error('Error handling invoice payment failed:', error);
  }
}

// Handle customer creation
async function handleCustomerCreated(customer: Stripe.Customer) {
  if (!customer.email) return;

  try {
    const user = await User.findOne({ email: customer.email });
    if (user && !user.stripeCustomerId) {
      user.stripeCustomerId = customer.id;
      await user.save();
      logger.info(`Stripe customer ID linked to user ${user.id}`);
    }
  } catch (error) {
    logger.error('Error handling customer created:', error);
  }
}

// Helper function to create license from subscription
async function createLicenseFromSubscription(subscription: Stripe.Subscription, userId: string) {
  const plan = subscription.metadata?.plan || 'personal';
  
  try {
    // Check if license already exists
    const existingLicense = await License.findOne({
      'metadata.stripeSubscriptionId': subscription.id
    });

    if (existingLicense) {
      logger.info(`License already exists for subscription ${subscription.id}`);
      return;
    }

    // Get customer information
    const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
    
    const licenseData = {
      userId,
      plan: plan as 'personal' | 'professional' | 'team' | 'enterprise',
      status: subscription.status === 'active' ? 'active' as const : 'suspended' as const,
      expiresAt: new Date(subscription.current_period_end * 1000),
      metadata: {
        stripeSubscriptionId: subscription.id,
        customerEmail: customer.email || '',
        companyName: customer.name || undefined
      }
    };

    const license = new License(licenseData);
    await license.save();

    logger.info(`License created for subscription ${subscription.id}, plan: ${plan}, expires: ${license.expiresAt}`);
  } catch (error) {
    logger.error('Error creating license from subscription:', error);
  }
}

export default router;