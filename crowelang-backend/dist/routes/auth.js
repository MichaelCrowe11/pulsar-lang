"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const License_1 = require("../models/License");
const auth_1 = require("../middleware/auth");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
// Generate JWT token
const generateToken = (userId) => {
    const payload = { id: userId };
    const secret = process.env.JWT_SECRET;
    const options = {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    };
    return jsonwebtoken_1.default.sign(payload, secret, options);
};
// Register new user
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, company } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({
                error: 'Email, password, and name are required'
            });
        }
        // Check if user already exists
        const existingUser = await User_1.User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }
        // Validate password strength
        if (password.length < 8) {
            return res.status(400).json({
                error: 'Password must be at least 8 characters long'
            });
        }
        // Hash password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
        const hashedPassword = await bcrypt_1.default.hash(password, saltRounds);
        // Create user
        const user = new User_1.User({
            email: email.toLowerCase(),
            password: hashedPassword,
            name,
            company
        });
        await user.save();
        // Create free license for new user
        const freeLicense = new License_1.License({
            userId: user.id,
            plan: 'free',
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            metadata: {
                customerEmail: user.email,
                companyName: company
            }
        });
        await freeLicense.save();
        // Generate token
        const token = generateToken(user.id);
        logger_1.logger.info(`User registered: ${email}`);
        res.status(201).json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                company: user.company,
                role: user.role
            },
            license: {
                id: freeLicense.id,
                plan: freeLicense.plan,
                licenseKey: freeLicense.licenseKey,
                status: freeLicense.status,
                expiresAt: freeLicense.expiresAt
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});
// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }
        // Find user
        const user = await User_1.User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        if (!user.isActive) {
            return res.status(401).json({ error: 'Account is deactivated' });
        }
        // Check password
        const isValidPassword = await bcrypt_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        // Get active licenses
        const licenses = await License_1.License.find({
            userId: user.id,
            status: 'active',
            expiresAt: { $gt: new Date() }
        });
        // Generate token
        const token = generateToken(user.id);
        logger_1.logger.info(`User logged in: ${email}`);
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                company: user.company,
                role: user.role,
                lastLogin: user.lastLogin
            },
            licenses: licenses.map(license => ({
                id: license.id,
                plan: license.plan,
                licenseKey: license.licenseKey,
                status: license.status,
                expiresAt: license.expiresAt,
                features: license.features
            }))
        });
    }
    catch (error) {
        logger_1.logger.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});
// Get current user profile
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        const user = await User_1.User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Get user's licenses
        const licenses = await License_1.License.find({ userId: user.id })
            .sort({ createdAt: -1 });
        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                company: user.company,
                role: user.role,
                isActive: user.isActive,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin,
                stripeCustomerId: user.stripeCustomerId
            },
            licenses: licenses.map(license => ({
                id: license.id,
                plan: license.plan,
                licenseKey: license.licenseKey,
                status: license.status,
                expiresAt: license.expiresAt,
                features: license.features,
                usage: license.usage,
                restrictions: license.restrictions
            }))
        });
    }
    catch (error) {
        logger_1.logger.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});
// Update user profile
router.put('/me', auth_1.authenticate, async (req, res) => {
    try {
        const { name, company } = req.body;
        const user = await User_1.User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (name !== undefined)
            user.name = name;
        if (company !== undefined)
            user.company = company;
        await user.save();
        logger_1.logger.info(`Profile updated for user: ${user.email}`);
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                company: user.company,
                role: user.role
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
// Change password
router.put('/change-password', auth_1.authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                error: 'Current password and new password are required'
            });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({
                error: 'New password must be at least 8 characters long'
            });
        }
        const user = await User_1.User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Verify current password
        const isValidPassword = await bcrypt_1.default.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }
        // Hash new password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
        user.password = await bcrypt_1.default.hash(newPassword, saltRounds);
        await user.save();
        logger_1.logger.info(`Password changed for user: ${user.email}`);
        res.json({ success: true, message: 'Password changed successfully' });
    }
    catch (error) {
        logger_1.logger.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});
// Request password reset (placeholder - requires email service)
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        const user = await User_1.User.findOne({ email: email.toLowerCase() });
        // Don't reveal if user exists for security
        res.json({
            success: true,
            message: 'If an account with this email exists, a password reset link has been sent.'
        });
        if (user) {
            // TODO: Implement email service for password reset
            logger_1.logger.info(`Password reset requested for: ${email}`);
        }
    }
    catch (error) {
        logger_1.logger.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to process password reset request' });
    }
});
// Refresh token
router.post('/refresh', auth_1.authenticate, async (req, res) => {
    try {
        const user = await User_1.User.findById(req.user.id);
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }
        const token = generateToken(user.id);
        res.json({
            success: true,
            token,
            expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        });
    }
    catch (error) {
        logger_1.logger.error('Token refresh error:', error);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
});
exports.default = router;
