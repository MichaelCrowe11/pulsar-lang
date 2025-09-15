import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { MonitoringSystem } from './modules/monitoringSystem.js';
import { defaultConfig } from './config/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class MonitoringServer {
    constructor(config = {}) {
        this.config = { ...defaultConfig, ...config };
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });

        // Initialize monitoring system
        this.monitor = new MonitoringSystem(this.config);

        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.setupMonitoringListeners();
    }

    setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, '../monitoring')));

        // CORS for API access
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Content-Type');
            next();
        });
    }

    setupRoutes() {
        // Dashboard home
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../monitoring/dashboard.html'));
        });

        // API Routes
        this.app.get('/api/metrics', (req, res) => {
            res.json(this.monitor.getMetrics());
        });

        this.app.get('/api/dashboard', (req, res) => {
            res.json(this.monitor.getDashboardData());
        });

        this.app.get('/api/health', async (req, res) => {
            const health = await this.monitor.checkSystemHealth();
            res.json(health);
        });

        this.app.get('/api/trades', (req, res) => {
            const limit = parseInt(req.query.limit) || 100;
            const trades = this.monitor.metrics.trades.slice(-limit);
            res.json(trades);
        });

        this.app.get('/api/positions', (req, res) => {
            res.json(this.monitor.metrics.positions);
        });

        this.app.get('/api/alerts', (req, res) => {
            const active = req.query.active === 'true';
            let alerts = this.monitor.metrics.alerts;
            if (active) {
                alerts = alerts.filter(a => !a.acknowledged);
            }
            res.json(alerts);
        });

        this.app.post('/api/alerts/:id/acknowledge', (req, res) => {
            const alert = this.monitor.acknowledgeAlert(req.params.id);
            if (alert) {
                res.json({ success: true, alert });
            } else {
                res.status(404).json({ error: 'Alert not found' });
            }
        });

        // Simulate trade for testing
        this.app.post('/api/simulate/trade', (req, res) => {
            const trade = {
                symbol: req.body.symbol || 'BTC/USDT',
                side: req.body.side || 'buy',
                price: req.body.price || 50000,
                quantity: req.body.quantity || 0.001,
                pnl: req.body.pnl || Math.random() * 200 - 100,
                status: 'completed'
            };

            this.monitor.recordTrade(trade);
            res.json({ success: true, trade });
        });

        // Emergency stop endpoint
        this.app.post('/api/emergency-stop', (req, res) => {
            this.monitor.createAlert('CRITICAL', 'Emergency stop activated', {
                triggeredBy: req.body.reason || 'Manual trigger',
                timestamp: Date.now()
            });

            // Set circuit breaker to OPEN
            this.monitor.metrics.systemHealth.circuitBreakerStatus = 'OPEN';

            res.json({
                success: true,
                message: 'Emergency stop activated',
                status: 'TRADING_HALTED'
            });
        });

        // Resume trading endpoint
        this.app.post('/api/resume-trading', (req, res) => {
            this.monitor.metrics.systemHealth.circuitBreakerStatus = 'CLOSED';
            this.monitor.createAlert('INFO', 'Trading resumed', {
                timestamp: Date.now()
            });

            res.json({
                success: true,
                message: 'Trading resumed',
                status: 'TRADING_ACTIVE'
            });
        });
    }

    setupWebSocket() {
        this.wss.on('connection', (ws) => {
            console.log('📱 New WebSocket connection');

            // Send initial data
            ws.send(JSON.stringify({
                type: 'initial',
                data: this.monitor.getDashboardData()
            }));

            // Ping to keep connection alive
            const pingInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'ping' }));
                }
            }, 30000);

            ws.on('close', () => {
                clearInterval(pingInterval);
                console.log('📱 WebSocket connection closed');
            });

            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
            });
        });
    }

    setupMonitoringListeners() {
        // Forward monitoring events to WebSocket clients
        this.monitor.on('trade', (trade) => {
            this.broadcast({
                type: 'trade',
                data: trade
            });
        });

        this.monitor.on('alert', (alert) => {
            this.broadcast({
                type: 'alert',
                data: alert
            });
        });

        this.monitor.on('position-update', (position) => {
            this.broadcast({
                type: 'position',
                data: position
            });
        });

        this.monitor.on('performance-update', (performance) => {
            this.broadcast({
                type: 'performance',
                data: performance
            });
        });

        this.monitor.on('heartbeat', (health) => {
            this.broadcast({
                type: 'heartbeat',
                data: health
            });
        });
    }

    broadcast(message) {
        const data = JSON.stringify(message);
        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    }

    start(port = 8080) {
        this.server.listen(port, () => {
            console.log(`
╔════════════════════════════════════════════════════════════╗
║         📊 MONITORING SERVER STARTED                       ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║   Dashboard:    http://localhost:${port}                       ║
║   API:          http://localhost:${port}/api                   ║
║   WebSocket:    ws://localhost:${port}                        ║
║                                                            ║
║   Endpoints:                                               ║
║   • GET  /api/metrics      - System metrics               ║
║   • GET  /api/dashboard    - Dashboard data               ║
║   • GET  /api/health       - Health check                 ║
║   • GET  /api/trades       - Trade history                ║
║   • GET  /api/positions    - Open positions               ║
║   • GET  /api/alerts       - Active alerts                ║
║   • POST /api/emergency-stop - Emergency halt             ║
║                                                            ║
║   Real-time updates via WebSocket                         ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
            `);
        });
    }

    stop() {
        this.monitor.stop();
        this.server.close();
        console.log('📊 Monitoring server stopped');
    }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const port = process.env.MONITORING_PORT || 8080;
    const server = new MonitoringServer();
    server.start(port);

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n📊 Shutting down monitoring server...');
        server.stop();
        process.exit(0);
    });
}

export default MonitoringServer;