import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth';
import paymentRoutes from './routes/payment';
import licenseRoutes from './routes/license';
import webhookRoutes from './routes/webhooks';
import cryptoRoutes from './routes/crypto';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    'https://crowelang.com',
    'https://www.crowelang.com',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/license', licenseRoutes);
app.use('/api/crypto', cryptoRoutes);
app.use('/api/webhooks', webhookRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Database connections
const connectDB = async () => {
  try {
    // Try to connect to MongoDB, but don't fail if it's not available
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crowelang', {
      serverSelectionTimeoutMS: 5000 // 5 second timeout
    });
    logger.info('MongoDB connected successfully');
    return true;
  } catch (error) {
    logger.warn('MongoDB connection failed, running in test mode without database:', error);
    // Continue without database for testing
    return false;
  }
};

const connectRedis = async () => {
  try {
    const client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000 // 5 second timeout
      }
    });
    await client.connect();
    logger.info('Redis connected successfully');
    return client;
  } catch (error) {
    logger.warn('Redis connection failed, continuing without cache:', error);
    return null;
  }
};

// Start server
const startServer = async () => {
  const dbConnected = await connectDB();
  const redisClient = await connectRedis();

  // Make Redis client available globally
  (global as any).redisClient = redisClient;
  (global as any).dbConnected = dbConnected;

  app.listen(PORT, () => {
    logger.info(`CroweLang License Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    if (!dbConnected) {
      logger.warn('⚠️  Running in TEST MODE without database - Some features may be limited');
    }
  });
};

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await mongoose.connection.close();
  if ((global as any).redisClient) {
    await (global as any).redisClient.quit();
  }
  process.exit(0);
});

startServer().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});