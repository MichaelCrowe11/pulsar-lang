"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const coinbase_commerce_node_1 = require("coinbase-commerce-node");
const User_1 = require("../models/User");
const License_1 = require("../models/License");
const auth_1 = require("../middleware/auth");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
// Coinbase Commerce setup
const Client = coinbase_commerce_node_1.resources.Client;
Client.init(process.env.COINBASE_COMMERCE_API_KEY);
// Crypto pricing configuration (in USD, converted to crypto by Coinbase)
const CRYPTO_PRICING_PLANS = {
    personal: {
        amount: 99.00,
        currency: 'USD',
        name: 'CroweLang Personal Plan',
        description: 'Unlimited compilations, commercial use, email support',
        interval: 'year'
    },
    professional: {
        amount: 499.00,
        currency: 'USD',
        name: 'CroweLang Professional Plan',
        description: 'Everything in Personal + API access + Priority support + All targets',
        interval: 'year'
    },
    team: {
        amount: 1999.00,
        currency: 'USD',
        name: 'CroweLang Team Plan',
        description: 'Everything in Professional + 5 user seats + Team collaboration',
        interval: 'year'
    }
};
// Create crypto payment charge
router.post('/create-charge', auth_1.authenticate, async (req, res) => {
    try {
        const { plan } = req.body;
        const user = await User_1.User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (!CRYPTO_PRICING_PLANS[plan]) {
            return res.status(400).json({ error: 'Invalid pricing plan' });
        }
        const pricingPlan = CRYPTO_PRICING_PLANS[plan];
        const chargeData = {
            name: pricingPlan.name,
            description: pricingPlan.description,
            local_price: {
                amount: pricingPlan.amount.toFixed(2),
                currency: pricingPlan.currency
            },
            pricing_type: 'fixed_price',
            metadata: {
                userId: user.id,
                plan: plan,
                customerEmail: user.email,
                companyName: user.company || '',
                interval: pricingPlan.interval
            },
            redirect_url: `${process.env.FRONTEND_URL}/dashboard?crypto_success=true`,
            cancel_url: `${process.env.FRONTEND_URL}/pricing?crypto_canceled=true`
        };
        const charge = await coinbase_commerce_node_1.Charge.create(chargeData);
        logger_1.logger.info(`Crypto charge created for user ${user.id}, plan: ${plan}`, {
            chargeId: charge.id,
            amount: pricingPlan.amount,
            currency: pricingPlan.currency
        });
        res.json({
            success: true,
            charge: {
                id: charge.id,
                hosted_url: charge.hosted_url,
                expires_at: charge.expires_at,
                pricing: charge.pricing,
                addresses: charge.addresses
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error creating crypto charge:', error);
        res.status(500).json({ error: 'Failed to create crypto payment' });
    }
});
// Get charge details
router.get('/charge/:chargeId', auth_1.authenticate, async (req, res) => {
    try {
        const { chargeId } = req.params;
        const user = await User_1.User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const charge = await coinbase_commerce_node_1.Charge.retrieve(chargeId);
        // Verify the charge belongs to the user
        if (charge.metadata?.userId !== user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json({
            charge: {
                id: charge.id,
                name: charge.name,
                description: charge.description,
                timeline: charge.timeline,
                payments: charge.payments,
                pricing: charge.pricing,
                expires_at: charge.expires_at,
                created_at: charge.created_at,
                confirmed_at: charge.confirmed_at,
                checkout: charge.checkout,
                addresses: charge.addresses
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error retrieving crypto charge:', error);
        res.status(500).json({ error: 'Failed to retrieve charge details' });
    }
});
// List user's crypto charges
router.get('/charges', auth_1.authenticate, async (req, res) => {
    try {
        const user = await User_1.User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Note: Coinbase Commerce doesn't support filtering by metadata in list API
        // So we get all charges and filter client-side (not ideal for production)
        const charges = await coinbase_commerce_node_1.Charge.list({ limit: 100 });
        const userCharges = charges.data.filter(charge => charge.metadata?.userId === user.id);
        res.json({
            charges: userCharges.map(charge => ({
                id: charge.id,
                name: charge.name,
                timeline: charge.timeline,
                pricing: charge.pricing,
                created_at: charge.created_at,
                confirmed_at: charge.confirmed_at,
                expires_at: charge.expires_at,
                plan: charge.metadata?.plan || 'unknown'
            }))
        });
    }
    catch (error) {
        logger_1.logger.error('Error listing crypto charges:', error);
        res.status(500).json({ error: 'Failed to list charges' });
    }
});
// Get supported cryptocurrencies
router.get('/currencies', (req, res) => {
    res.json({
        supported_currencies: [
            { code: 'BTC', name: 'Bitcoin' },
            { code: 'ETH', name: 'Ethereum' },
            { code: 'LTC', name: 'Litecoin' },
            { code: 'BCH', name: 'Bitcoin Cash' },
            { code: 'USDC', name: 'USD Coin' },
            { code: 'DAI', name: 'Dai' }
        ],
        base_currency: 'USD',
        note: 'Prices are fixed in USD and converted to crypto at current market rates'
    });
});
// Webhook handler for crypto payments
router.post('/webhook', express_1.default.raw({ type: 'application/json' }), async (req, res) => {
    const rawBody = req.body;
    const signature = req.headers['x-cc-webhook-signature'];
    try {
        const event = coinbase_commerce_node_1.Webhook.verifyEventBody(rawBody, signature, process.env.COINBASE_COMMERCE_WEBHOOK_SECRET);
        logger_1.logger.info(`Crypto webhook received: ${event.type}`, {
            eventId: event.id,
            chargeId: event.data?.id
        });
        switch (event.type) {
            case 'charge:confirmed':
                await handleChargeConfirmed(event.data);
                break;
            case 'charge:failed':
                await handleChargeFailed(event.data);
                break;
            case 'charge:delayed':
                await handleChargeDelayed(event.data);
                break;
            case 'charge:pending':
                await handleChargePending(event.data);
                break;
            case 'charge:resolved':
                await handleChargeResolved(event.data);
                break;
            default:
                logger_1.logger.info(`Unhandled crypto webhook event: ${event.type}`);
        }
        res.json({ received: true });
    }
    catch (error) {
        logger_1.logger.error('Crypto webhook verification failed:', error);
        res.status(400).json({ error: 'Invalid webhook signature' });
    }
});
// Handle confirmed crypto payment
async function handleChargeConfirmed(charge) {
    try {
        const { userId, plan, customerEmail, companyName } = charge.metadata || {};
        if (!userId || !plan) {
            logger_1.logger.error('Missing metadata in crypto charge', { chargeId: charge.id });
            return;
        }
        // Check if license already exists for this charge
        const existingLicense = await License_1.License.findOne({
            'metadata.cryptoChargeId': charge.id
        });
        if (existingLicense) {
            logger_1.logger.info(`License already exists for crypto charge ${charge.id}`);
            return;
        }
        // Create license
        const licenseData = {
            userId,
            plan: plan,
            status: 'active',
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            metadata: {
                cryptoChargeId: charge.id,
                customerEmail: customerEmail || '',
                companyName: companyName || '',
                paymentMethod: 'crypto',
                cryptoPayment: {
                    network: charge.payments?.[0]?.network,
                    transactionId: charge.payments?.[0]?.transaction_id,
                    amount: charge.payments?.[0]?.value?.crypto?.amount,
                    currency: charge.payments?.[0]?.value?.crypto?.currency,
                    confirmedAt: new Date(charge.confirmed_at)
                }
            }
        };
        const license = new License_1.License(licenseData);
        await license.save();
        logger_1.logger.info(`License created for crypto payment`, {
            licenseId: license.id,
            chargeId: charge.id,
            plan,
            userId
        });
        // Send confirmation email (if email service is configured)
        // TODO: Implement email notification
    }
    catch (error) {
        logger_1.logger.error('Error handling confirmed crypto charge:', error);
    }
}
// Handle failed crypto payment
async function handleChargeFailed(charge) {
    logger_1.logger.warn(`Crypto charge failed: ${charge.id}`, {
        reason: charge.timeline?.find((t) => t.status === 'FAILED')?.context
    });
}
// Handle delayed crypto payment
async function handleChargeDelayed(charge) {
    logger_1.logger.info(`Crypto charge delayed: ${charge.id}`, {
        delayReason: charge.timeline?.find((t) => t.status === 'DELAYED')?.context
    });
}
// Handle pending crypto payment
async function handleChargePending(charge) {
    logger_1.logger.info(`Crypto charge pending: ${charge.id}`);
}
// Handle resolved crypto payment (after being delayed)
async function handleChargeResolved(charge) {
    logger_1.logger.info(`Crypto charge resolved: ${charge.id}`);
    // Treat as confirmed if payment was successful
    if (charge.timeline?.some((t) => t.status === 'COMPLETED')) {
        await handleChargeConfirmed(charge);
    }
}
exports.default = router;
