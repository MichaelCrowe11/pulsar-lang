"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const redis_1 = require("redis");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_1 = __importDefault(require("./routes/auth"));
const payment_1 = __importDefault(require("./routes/payment"));
const license_1 = __importDefault(require("./routes/license"));
const webhooks_1 = __importDefault(require("./routes/webhooks"));
const crypto_1 = __importDefault(require("./routes/crypto"));
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = require("./utils/logger");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: [
        'https://crowelang.com',
        'https://www.crowelang.com',
        'http://localhost:3000',
        'http://localhost:3001'
    ],
    credentials: true
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);
// Body parsing middleware
app.use('/api/webhooks', express_1.default.raw({ type: 'application/json' }));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
// API routes
app.use('/api/auth', auth_1.default);
app.use('/api/payment', payment_1.default);
app.use('/api/license', license_1.default);
app.use('/api/crypto', crypto_1.default);
app.use('/api/webhooks', webhooks_1.default);
// Error handling middleware
app.use(errorHandler_1.errorHandler);
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});
// Database connections
const connectDB = async () => {
    try {
        // Try to connect to MongoDB, but don't fail if it's not available
        await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crowelang', {
            serverSelectionTimeoutMS: 5000 // 5 second timeout
        });
        logger_1.logger.info('MongoDB connected successfully');
        return true;
    }
    catch (error) {
        logger_1.logger.warn('MongoDB connection failed, running in test mode without database:', error);
        // Continue without database for testing
        return false;
    }
};
const connectRedis = async () => {
    try {
        const client = (0, redis_1.createClient)({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            socket: {
                connectTimeout: 5000 // 5 second timeout
            }
        });
        await client.connect();
        logger_1.logger.info('Redis connected successfully');
        return client;
    }
    catch (error) {
        logger_1.logger.warn('Redis connection failed, continuing without cache:', error);
        return null;
    }
};
// Start server
const startServer = async () => {
    const dbConnected = await connectDB();
    const redisClient = await connectRedis();
    // Make Redis client available globally
    global.redisClient = redisClient;
    global.dbConnected = dbConnected;
    app.listen(PORT, () => {
        logger_1.logger.info(`CroweLang License Server running on port ${PORT}`);
        logger_1.logger.info(`Environment: ${process.env.NODE_ENV}`);
        if (!dbConnected) {
            logger_1.logger.warn('⚠️  Running in TEST MODE without database - Some features may be limited');
        }
    });
};
// Graceful shutdown
process.on('SIGINT', async () => {
    logger_1.logger.info('Shutting down gracefully...');
    await mongoose_1.default.connection.close();
    if (global.redisClient) {
        await global.redisClient.quit();
    }
    process.exit(0);
});
startServer().catch(error => {
    logger_1.logger.error('Failed to start server:', error);
    process.exit(1);
});
