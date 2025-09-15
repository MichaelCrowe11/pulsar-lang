import EventEmitter from 'events';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class MonitoringSystem extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.metrics = {
            trades: [],
            positions: [],
            performance: {
                totalPnL: 0,
                winRate: 0,
                sharpeRatio: 0,
                maxDrawdown: 0,
                dailyReturns: []
            },
            alerts: [],
            systemHealth: {
                uptime: Date.now(),
                lastHeartbeat: Date.now(),
                apiHealth: {},
                circuitBreakerStatus: 'CLOSED'
            }
        };

        this.alertThresholds = {
            maxLossPerTrade: config.maxLossPerTrade || 100,
            maxDailyLoss: config.maxDailyLoss || 500,
            maxDrawdown: config.maxDrawdown || 0.10,
            minWinRate: config.minWinRate || 0.50,
            apiErrorThreshold: 5,
            latencyThreshold: 1000 // ms
        };

        this.startMonitoring();
    }

    startMonitoring() {
        // Heartbeat check every 30 seconds
        this.heartbeatInterval = setInterval(() => {
            this.checkSystemHealth();
        }, 30000);

        // Performance analysis every 5 minutes
        this.performanceInterval = setInterval(() => {
            this.analyzePerformance();
        }, 300000);

        // Alert check every minute
        this.alertInterval = setInterval(() => {
            this.checkAlerts();
        }, 60000);

        console.log('📊 Monitoring system started');
    }

    // Record new trade
    recordTrade(trade) {
        this.metrics.trades.push({
            ...trade,
            timestamp: Date.now()
        });

        // Check for immediate alerts
        this.checkTradeAlerts(trade);

        // Update performance metrics
        this.updatePerformanceMetrics();

        // Emit trade event
        this.emit('trade', trade);

        // Log to file
        this.logToFile('trades', trade);
    }

    // Record position update
    updatePosition(position) {
        const existingIndex = this.metrics.positions.findIndex(
            p => p.symbol === position.symbol
        );

        if (existingIndex >= 0) {
            this.metrics.positions[existingIndex] = position;
        } else {
            this.metrics.positions.push(position);
        }

        // Check position alerts
        this.checkPositionAlerts(position);

        // Emit position update
        this.emit('position-update', position);
    }

    // Check system health
    async checkSystemHealth() {
        const health = {
            timestamp: Date.now(),
            uptime: Date.now() - this.metrics.systemHealth.uptime,
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
        };

        // Check API connections
        health.apis = await this.checkAPIConnections();

        // Check circuit breaker
        health.circuitBreaker = this.checkCircuitBreaker();

        this.metrics.systemHealth.lastHeartbeat = Date.now();
        this.metrics.systemHealth.apiHealth = health.apis;

        // Alert if unhealthy
        if (!this.isSystemHealthy(health)) {
            this.createAlert('CRITICAL', 'System health degraded', health);
        }

        this.emit('heartbeat', health);
        return health;
    }

    // Check API connections
    async checkAPIConnections() {
        const apis = {
            openai: { status: 'unknown', latency: 0 },
            coinbase: { status: 'unknown', latency: 0 },
            binance: { status: 'unknown', latency: 0 }
        };

        // Mock API checks (replace with actual API health checks)
        for (const api of Object.keys(apis)) {
            const start = Date.now();
            try {
                // Simulate API check
                await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
                apis[api].status = 'healthy';
                apis[api].latency = Date.now() - start;
            } catch (error) {
                apis[api].status = 'error';
                apis[api].error = error.message;
            }
        }

        return apis;
    }

    // Check circuit breaker status
    checkCircuitBreaker() {
        // This would connect to actual circuit breaker
        return {
            status: this.metrics.systemHealth.circuitBreakerStatus,
            failures: 0,
            lastFailure: null
        };
    }

    // Analyze performance
    analyzePerformance() {
        const trades = this.metrics.trades;
        if (trades.length === 0) return;

        // Calculate win rate
        const wins = trades.filter(t => t.pnl > 0).length;
        this.metrics.performance.winRate = wins / trades.length;

        // Calculate total P&L
        this.metrics.performance.totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);

        // Calculate Sharpe ratio (simplified)
        const returns = trades.map(t => t.pnl || 0);
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const stdDev = Math.sqrt(
            returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
        );
        this.metrics.performance.sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

        // Calculate max drawdown
        let peak = 0;
        let maxDrawdown = 0;
        let cumulative = 0;

        for (const trade of trades) {
            cumulative += trade.pnl || 0;
            if (cumulative > peak) {
                peak = cumulative;
            }
            const drawdown = peak > 0 ? (peak - cumulative) / peak : 0;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }
        this.metrics.performance.maxDrawdown = maxDrawdown;

        // Check performance alerts
        this.checkPerformanceAlerts();

        this.emit('performance-update', this.metrics.performance);
    }

    // Check for trade-specific alerts
    checkTradeAlerts(trade) {
        // Large loss alert
        if (trade.pnl < -this.alertThresholds.maxLossPerTrade) {
            this.createAlert('HIGH', `Large loss on ${trade.symbol}`, {
                loss: trade.pnl,
                threshold: this.alertThresholds.maxLossPerTrade
            });
        }

        // Successful trade notification
        if (trade.pnl > this.alertThresholds.maxLossPerTrade * 2) {
            this.createAlert('INFO', `Profitable trade on ${trade.symbol}`, {
                profit: trade.pnl
            });
        }
    }

    // Check position alerts
    checkPositionAlerts(position) {
        // Position size alert
        if (position.size > this.config.maxPositionSize) {
            this.createAlert('MEDIUM', `Position size exceeded for ${position.symbol}`, {
                size: position.size,
                max: this.config.maxPositionSize
            });
        }

        // Unrealized loss alert
        if (position.unrealizedPnL < -this.alertThresholds.maxLossPerTrade) {
            this.createAlert('HIGH', `Large unrealized loss on ${position.symbol}`, {
                unrealizedPnL: position.unrealizedPnL
            });
        }
    }

    // Check performance alerts
    checkPerformanceAlerts() {
        const perf = this.metrics.performance;

        // Win rate alert
        if (perf.winRate < this.alertThresholds.minWinRate) {
            this.createAlert('MEDIUM', 'Win rate below threshold', {
                winRate: perf.winRate,
                threshold: this.alertThresholds.minWinRate
            });
        }

        // Drawdown alert
        if (perf.maxDrawdown > this.alertThresholds.maxDrawdown) {
            this.createAlert('HIGH', 'Maximum drawdown exceeded', {
                drawdown: perf.maxDrawdown,
                threshold: this.alertThresholds.maxDrawdown
            });
        }

        // Daily loss alert
        const todaysPnL = this.getTodaysPnL();
        if (todaysPnL < -this.alertThresholds.maxDailyLoss) {
            this.createAlert('CRITICAL', 'Daily loss limit reached', {
                loss: todaysPnL,
                limit: this.alertThresholds.maxDailyLoss
            });
        }
    }

    // Get today's P&L
    getTodaysPnL() {
        const today = new Date().setHours(0, 0, 0, 0);
        const todaysTrades = this.metrics.trades.filter(t => t.timestamp >= today);
        return todaysTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    }

    // Check all alerts
    checkAlerts() {
        // Remove old alerts (older than 24 hours)
        const cutoff = Date.now() - 86400000;
        this.metrics.alerts = this.metrics.alerts.filter(a => a.timestamp > cutoff);

        // Check for critical conditions
        if (this.metrics.systemHealth.circuitBreakerStatus === 'OPEN') {
            this.createAlert('CRITICAL', 'Circuit breaker is OPEN - trading halted');
        }

        // API health check
        const unhealthyAPIs = Object.entries(this.metrics.systemHealth.apiHealth)
            .filter(([_, health]) => health.status === 'error');

        if (unhealthyAPIs.length > 0) {
            this.createAlert('HIGH', 'API connection issues', {
                apis: unhealthyAPIs.map(([name]) => name)
            });
        }
    }

    // Create alert
    createAlert(severity, message, details = {}) {
        const alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            severity,
            message,
            details,
            timestamp: Date.now(),
            acknowledged: false
        };

        this.metrics.alerts.push(alert);

        // Emit alert event
        this.emit('alert', alert);

        // Log alert
        this.logToFile('alerts', alert);

        // Send notifications for high/critical alerts
        if (severity === 'HIGH' || severity === 'CRITICAL') {
            this.sendNotification(alert);
        }

        console.log(`🚨 Alert [${severity}]: ${message}`);
        return alert;
    }

    // Send notification (webhook, email, etc)
    async sendNotification(alert) {
        // Implement actual notification logic here
        // For now, just console log
        console.log('📧 Notification sent:', alert);

        // Webhook example:
        if (this.config.webhookUrl) {
            try {
                // await fetch(this.config.webhookUrl, {
                //     method: 'POST',
                //     headers: { 'Content-Type': 'application/json' },
                //     body: JSON.stringify(alert)
                // });
            } catch (error) {
                console.error('Failed to send webhook:', error);
            }
        }
    }

    // Check if system is healthy
    isSystemHealthy(health) {
        // Check API health
        const healthyAPIs = Object.values(health.apis)
            .filter(api => api.status === 'healthy').length;
        const totalAPIs = Object.keys(health.apis).length;

        if (healthyAPIs < totalAPIs / 2) return false;

        // Check memory usage (alert if > 90%)
        const memoryUsage = health.memory.heapUsed / health.memory.heapTotal;
        if (memoryUsage > 0.9) return false;

        // Check circuit breaker
        if (health.circuitBreaker.status === 'OPEN') return false;

        return true;
    }

    // Log to file
    logToFile(type, data) {
        const logDir = path.join(__dirname, '../../logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const date = new Date().toISOString().split('T')[0];
        const logFile = path.join(logDir, `${type}_${date}.json`);

        const logEntry = {
            timestamp: Date.now(),
            type,
            data
        };

        // Append to log file
        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    }

    // Get current metrics
    getMetrics() {
        return {
            ...this.metrics,
            summary: {
                totalTrades: this.metrics.trades.length,
                openPositions: this.metrics.positions.filter(p => p.status === 'open').length,
                totalPnL: this.metrics.performance.totalPnL,
                todaysPnL: this.getTodaysPnL(),
                activeAlerts: this.metrics.alerts.filter(a => !a.acknowledged).length,
                systemStatus: this.metrics.systemHealth.circuitBreakerStatus === 'CLOSED' ? 'TRADING' : 'HALTED'
            }
        };
    }

    // Get dashboard data
    getDashboardData() {
        const metrics = this.getMetrics();
        return {
            timestamp: Date.now(),
            summary: metrics.summary,
            performance: metrics.performance,
            recentTrades: metrics.trades.slice(-10),
            positions: metrics.positions,
            alerts: metrics.alerts.filter(a => !a.acknowledged).slice(-5),
            systemHealth: {
                uptime: Date.now() - metrics.systemHealth.uptime,
                apis: metrics.systemHealth.apiHealth,
                circuitBreaker: metrics.systemHealth.circuitBreakerStatus
            }
        };
    }

    // Acknowledge alert
    acknowledgeAlert(alertId) {
        const alert = this.metrics.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledgedAt = Date.now();
        }
        return alert;
    }

    // Stop monitoring
    stop() {
        clearInterval(this.heartbeatInterval);
        clearInterval(this.performanceInterval);
        clearInterval(this.alertInterval);
        console.log('📊 Monitoring system stopped');
    }
}

export default MonitoringSystem;