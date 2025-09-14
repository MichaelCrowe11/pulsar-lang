import express from 'express';
import { License } from '../models/License';
import { User } from '../models/User';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const router = express.Router();

// Validate license key
router.post('/validate', async (req, res) => {
  try {
    const { licenseKey, hardwareFingerprint, feature } = req.body;

    if (!licenseKey) {
      return res.status(400).json({ 
        valid: false, 
        error: 'License key is required' 
      });
    }

    const license = await License.findOne({ licenseKey }).populate('userId', 'email');
    
    if (!license) {
      return res.status(404).json({ 
        valid: false, 
        error: 'Invalid license key' 
      });
    }

    // Validate the license
    const isValid = license.validateLicense();
    
    if (!isValid) {
      return res.json({
        valid: false,
        error: `License is ${license.status}`
      });
    }

    // Check hardware fingerprint if provided
    if (hardwareFingerprint && license.metadata.hardwareFingerprint) {
      if (!license.metadata.hardwareFingerprint.includes(hardwareFingerprint)) {
        // Allow adding new fingerprint for personal/professional plans
        if (['personal', 'professional'].includes(license.plan)) {
          if (license.metadata.hardwareFingerprint.length >= 3) {
            return res.json({
              valid: false,
              error: 'Hardware fingerprint limit exceeded'
            });
          }
          license.metadata.hardwareFingerprint.push(hardwareFingerprint);
          await license.save();
        } else {
          return res.json({
            valid: false,
            error: 'Invalid hardware fingerprint'
          });
        }
      }
    }

    // Check feature access if specified
    if (feature && !license.features.includes(feature)) {
      return res.json({
        valid: false,
        error: `Feature '${feature}' not available in ${license.plan} plan`
      });
    }

    // Check usage limits
    const usage = license.usage;
    const restrictions = license.restrictions;
    
    let usageLimitExceeded = false;
    let limitMessage = '';
    
    if (restrictions.maxCompilations && usage.compilations >= restrictions.maxCompilations) {
      usageLimitExceeded = true;
      limitMessage = `Compilation limit of ${restrictions.maxCompilations} exceeded`;
    }

    res.json({
      valid: true,
      license: {
        id: license.id,
        plan: license.plan,
        status: license.status,
        expiresAt: license.expiresAt,
        features: license.features,
        restrictions: license.restrictions,
        usage: license.usage,
        usageLimitExceeded,
        limitMessage
      }
    });
  } catch (error) {
    logger.error('Error validating license:', error);
    res.status(500).json({ 
      valid: false, 
      error: 'Internal server error' 
    });
  }
});

// Track compilation usage
router.post('/track-usage', async (req, res) => {
  try {
    const { licenseKey, type, metadata } = req.body;

    if (!licenseKey || !type) {
      return res.status(400).json({ error: 'License key and type are required' });
    }

    const license = await License.findOne({ licenseKey });
    
    if (!license) {
      return res.status(404).json({ error: 'Invalid license key' });
    }

    if (!license.validateLicense()) {
      return res.status(403).json({ error: 'License is not valid' });
    }

    // Check usage limits before incrementing
    if (type === 'compilation' && license.restrictions.maxCompilations) {
      if (license.usage.compilations >= license.restrictions.maxCompilations) {
        return res.status(429).json({ 
          error: 'Compilation limit exceeded',
          limit: license.restrictions.maxCompilations,
          current: license.usage.compilations
        });
      }
    }

    await license.incrementUsage(type);

    // Log usage with metadata
    logger.info(`Usage tracked for license ${licenseKey}: ${type}`, {
      licenseId: license.id,
      plan: license.plan,
      usage: license.usage,
      metadata
    });

    res.json({
      success: true,
      usage: license.usage,
      remaining: {
        compilations: license.restrictions.maxCompilations 
          ? Math.max(0, license.restrictions.maxCompilations - license.usage.compilations)
          : null
      }
    });
  } catch (error) {
    logger.error('Error tracking usage:', error);
    res.status(500).json({ error: 'Failed to track usage' });
  }
});

// Get license information (authenticated)
router.get('/info', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const licenses = await License.find({ 
      userId: req.user.id,
      status: { $in: ['active', 'expired'] }
    }).sort({ createdAt: -1 });

    const activeLicense = licenses.find(l => l.status === 'active' && l.expiresAt > new Date());

    res.json({
      licenses: licenses.map(license => ({
        id: license.id,
        licenseKey: license.licenseKey,
        plan: license.plan,
        status: license.status,
        issuedAt: license.issuedAt,
        expiresAt: license.expiresAt,
        features: license.features,
        restrictions: license.restrictions,
        usage: license.usage,
        isActive: license === activeLicense
      })),
      activeLicense: activeLicense ? {
        id: activeLicense.id,
        plan: activeLicense.plan,
        expiresAt: activeLicense.expiresAt,
        features: activeLicense.features,
        usage: activeLicense.usage,
        restrictions: activeLicense.restrictions
      } : null
    });
  } catch (error) {
    logger.error('Error fetching license info:', error);
    res.status(500).json({ error: 'Failed to fetch license information' });
  }
});

// Activate license with hardware fingerprint
router.post('/activate', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { licenseKey, hardwareFingerprint, deviceInfo } = req.body;

    if (!licenseKey || !hardwareFingerprint) {
      return res.status(400).json({ error: 'License key and hardware fingerprint are required' });
    }

    const license = await License.findOne({ 
      licenseKey,
      userId: req.user.id 
    });

    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    if (!license.validateLicense()) {
      return res.status(403).json({ error: 'License is not valid' });
    }

    // Check if hardware fingerprint already exists
    if (!license.metadata.hardwareFingerprint) {
      license.metadata.hardwareFingerprint = [];
    }

    if (license.metadata.hardwareFingerprint.includes(hardwareFingerprint)) {
      return res.json({
        success: true,
        message: 'Device already activated',
        activatedDevices: license.metadata.hardwareFingerprint.length
      });
    }

    // Check device limits based on plan
    const maxDevices = {
      'free': 1,
      'personal': 3,
      'professional': 3,
      'team': 10,
      'enterprise': -1 // unlimited
    }[license.plan] || 1;

    if (maxDevices !== -1 && license.metadata.hardwareFingerprint.length >= maxDevices) {
      return res.status(429).json({ 
        error: `Device limit of ${maxDevices} reached for ${license.plan} plan`,
        activatedDevices: license.metadata.hardwareFingerprint.length,
        maxDevices
      });
    }

    // Add hardware fingerprint
    license.metadata.hardwareFingerprint.push(hardwareFingerprint);
    await license.save();

    logger.info(`Device activated for license ${licenseKey}`, {
      licenseId: license.id,
      plan: license.plan,
      deviceCount: license.metadata.hardwareFingerprint.length,
      deviceInfo
    });

    res.json({
      success: true,
      message: 'Device activated successfully',
      activatedDevices: license.metadata.hardwareFingerprint.length,
      maxDevices: maxDevices === -1 ? 'unlimited' : maxDevices
    });
  } catch (error) {
    logger.error('Error activating license:', error);
    res.status(500).json({ error: 'Failed to activate license' });
  }
});

// Deactivate device (remove hardware fingerprint)
router.post('/deactivate', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { licenseKey, hardwareFingerprint } = req.body;

    if (!licenseKey || !hardwareFingerprint) {
      return res.status(400).json({ error: 'License key and hardware fingerprint are required' });
    }

    const license = await License.findOne({ 
      licenseKey,
      userId: req.user.id 
    });

    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    if (!license.metadata.hardwareFingerprint || 
        !license.metadata.hardwareFingerprint.includes(hardwareFingerprint)) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Remove hardware fingerprint
    license.metadata.hardwareFingerprint = license.metadata.hardwareFingerprint
      .filter(fp => fp !== hardwareFingerprint);
    await license.save();

    logger.info(`Device deactivated for license ${licenseKey}`, {
      licenseId: license.id,
      remainingDevices: license.metadata.hardwareFingerprint.length
    });

    res.json({
      success: true,
      message: 'Device deactivated successfully',
      activatedDevices: license.metadata.hardwareFingerprint.length
    });
  } catch (error) {
    logger.error('Error deactivating license:', error);
    res.status(500).json({ error: 'Failed to deactivate license' });
  }
});

// Get usage statistics (authenticated)
router.get('/usage', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { period = 'month' } = req.query;
    
    const licenses = await License.find({ 
      userId: req.user.id,
      status: 'active'
    });

    if (licenses.length === 0) {
      return res.json({ usage: null, message: 'No active licenses found' });
    }

    // Aggregate usage across all user's licenses
    const totalUsage = licenses.reduce((acc, license) => {
      acc.compilations += license.usage.compilations;
      acc.apiCalls += license.usage.apiCalls;
      return acc;
    }, { compilations: 0, apiCalls: 0 });

    // Get the primary license (most recent active)
    const primaryLicense = licenses[0];

    res.json({
      usage: {
        compilations: totalUsage.compilations,
        apiCalls: totalUsage.apiCalls,
        lastUsed: primaryLicense.usage.lastUsed
      },
      limits: primaryLicense.restrictions,
      plan: primaryLicense.plan,
      licenseCount: licenses.length
    });
  } catch (error) {
    logger.error('Error fetching usage stats:', error);
    res.status(500).json({ error: 'Failed to fetch usage statistics' });
  }
});

export default router;