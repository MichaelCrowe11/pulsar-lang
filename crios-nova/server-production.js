require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();

const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'production';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/webhook', limiter);

// Body parsing
app.use(express.json({ limit: process.env.MAX_REQUEST_SIZE || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.MAX_REQUEST_SIZE || '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    team: 'CRIOS NOVA',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Webhook validation middleware
const validateWebhook = (req, res, next) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Request body is required'
    });
  }
  
  // Add webhook signature verification if needed
  const signature = req.headers['x-webhook-signature'];
  if (process.env.WEBHOOK_SECRET && !signature) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing webhook signature'
    });
  }
  
  next();
};

// Webhook endpoint
app.post('/webhook', validateWebhook, async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] Webhook received:`, {
      id: req.headers['x-webhook-id'] || 'unknown',
      type: req.body.type || 'unknown',
      source: req.ip
    });
    
    // Process webhook asynchronously
    setImmediate(() => {
      // Add your webhook processing logic here
      console.log(`[${new Date().toISOString()}] Processing webhook:`, req.body);
    });
    
    res.json({ 
      status: 'accepted',
      team: 'CRIOS NOVA',
      timestamp: new Date().toISOString(),
      id: req.headers['x-webhook-id'] || Date.now().toString()
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Webhook error:`, error.message);
    res.status(500).json({
      error: 'Processing failed',
      message: NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// API info endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'CRIOS NOVA API',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: '/health',
      webhook: '/webhook'
    },
    documentation: 'https://api.crios-nova.com/docs'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err.stack);
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Payload too large',
      message: 'Request entity exceeds size limit'
    });
  }
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON',
      message: 'Request body contains invalid JSON'
    });
  }
  
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: NODE_ENV === 'production' ? 'Something went wrong' : err.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[${new Date().toISOString()}] CRIOS NOVA Production Server`);
  console.log(`[${new Date().toISOString()}] Environment: ${NODE_ENV}`);
  console.log(`[${new Date().toISOString()}] Port: ${PORT}`);
  console.log(`[${new Date().toISOString()}] Ready to accept connections`);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`[${new Date().toISOString()}] Received ${signal}, starting graceful shutdown...`);
  
  server.close(() => {
    console.log(`[${new Date().toISOString()}] HTTP server closed`);
    process.exit(0);
  });
  
  setTimeout(() => {
    console.error(`[${new Date().toISOString()}] Forcing shutdown after timeout`);
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error(`[${new Date().toISOString()}] Uncaught Exception:`, err);
  gracefulShutdown('EXCEPTION');
});
process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] Unhandled Rejection at:`, promise, 'reason:', reason);
});