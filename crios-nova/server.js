const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const logger = (message, data = null) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  if (data) {
    console.log(logEntry, data);
  } else {
    console.log(logEntry);
  }
};

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    team: 'CRIOS NOVA',
    specialists: 24,
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime()
  });
});

const validateWebhook = (req, res, next) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Request body is required'
    });
  }
  
  if (req.body.type && typeof req.body.type !== 'string') {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Type must be a string'
    });
  }
  
  next();
};

app.post('/webhook', validateWebhook, (req, res) => {
  try {
    logger('Webhook received:', {
      headers: req.headers['x-webhook-id'] || 'unknown',
      body: req.body
    });
    
    res.json({ 
      status: 'success',
      team: 'CRIOS NOVA responding',
      timestamp: new Date().toISOString(),
      processed: true
    });
  } catch (error) {
    logger('Webhook processing error:', error.message);
    res.status(500).json({
      error: 'Processing failed',
      message: 'Internal server error'
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

app.use((err, req, res, next) => {
  logger('Error:', err.stack);
  
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
  
  res.status(500).json({
    error: 'Internal server error',
    message: NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

const server = app.listen(PORT, () => {
  logger(`CRIOS NOVA running on http://localhost:${PORT}`);
  logger(`Environment: ${NODE_ENV}`);
  logger(`Test endpoint: http://localhost:${PORT}/health`);
});

const gracefulShutdown = (signal) => {
  logger(`Received ${signal}, starting graceful shutdown...`);
  
  server.close(() => {
    logger('HTTP server closed');
    process.exit(0);
  });
  
  setTimeout(() => {
    logger('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));