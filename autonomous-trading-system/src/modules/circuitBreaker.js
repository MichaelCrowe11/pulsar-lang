export class CircuitBreaker {
    constructor(config) {
        this.config = config;
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.failures = [];
        this.lastFailureTime = null;

        // Configuration
        this.maxFailures = config.maxFailures || 5;
        this.timeWindow = config.timeWindow || 300000; // 5 minutes
        this.cooldownPeriod = config.cooldownPeriod || 600000; // 10 minutes
        this.maxDrawdownTrigger = config.maxDrawdownTrigger || 0.08; // 8%
        this.maxDailyLossTrigger = config.maxDailyLossTrigger || 0.06; // 6%
        this.consecutiveLossesTrigger = config.consecutiveLossesTrigger || 8;
        this.volatilityTrigger = config.volatilityTrigger || 0.5; // 50%

        // Tracking
        this.consecutiveLosses = 0;
        this.dailyLoss = 0;
        this.currentDrawdown = 0;
        this.marketVolatility = 0;

        // Emergency contacts/webhooks
        this.emergencyWebhook = config.emergencyWebhook;
        this.notificationThreshold = config.notificationThreshold || 0.05;
    }

    checkStatus() {
        this.cleanOldFailures();

        return {
            state: this.state,
            isTripped: this.state === 'OPEN',
            reason: this.getStateReason(),
            failures: this.failures.length,
            consecutiveLosses: this.consecutiveLosses,
            currentDrawdown: this.currentDrawdown,
            timeUntilReset: this.getTimeUntilReset()
        };
    }

    reportError(error) {
        this.failures.push({
            timestamp: Date.now(),
            error: error.message || error,
            type: 'ERROR'
        });

        this.lastFailureTime = Date.now();
        console.error(`🚨 Circuit Breaker - Error reported: ${error.message || error}`);

        this.evaluateState();
    }

    reportTradeLoss(amount, isConsecutive = false) {
        this.dailyLoss += Math.abs(amount);

        if (isConsecutive) {
            this.consecutiveLosses++;
        } else {
            this.consecutiveLosses = 0;
        }

        this.failures.push({
            timestamp: Date.now(),
            error: `Trade loss: $${amount.toFixed(2)}`,
            type: 'TRADE_LOSS',
            amount
        });

        console.log(`📉 Circuit Breaker - Trade loss reported: $${amount.toFixed(2)} (Consecutive: ${this.consecutiveLosses})`);

        this.evaluateState();
    }

    reportDrawdown(drawdown) {
        this.currentDrawdown = drawdown;

        if (drawdown > this.notificationThreshold) {
            console.warn(`⚠️ Drawdown warning: ${(drawdown * 100).toFixed(2)}%`);
        }

        this.evaluateState();
    }

    reportVolatility(volatility) {
        this.marketVolatility = volatility;
        this.evaluateState();
    }

    evaluateState() {
        if (this.state === 'OPEN') {
            this.checkRecovery();
            return;
        }

        // Check for circuit breaker triggers
        const triggers = this.checkTriggers();

        if (triggers.shouldTrip) {
            this.tripBreaker(triggers.reasons);
        } else if (this.state === 'HALF_OPEN') {
            // Successful operation in half-open state
            this.reset();
        }
    }

    checkTriggers() {
        const reasons = [];
        let shouldTrip = false;

        // Error rate trigger
        if (this.failures.length >= this.maxFailures) {
            reasons.push(`Too many failures: ${this.failures.length}/${this.maxFailures}`);
            shouldTrip = true;
        }

        // Drawdown trigger
        if (this.currentDrawdown > this.maxDrawdownTrigger) {
            reasons.push(`Maximum drawdown exceeded: ${(this.currentDrawdown * 100).toFixed(2)}%`);
            shouldTrip = true;
        }

        // Daily loss trigger
        if (this.dailyLoss > this.maxDailyLossTrigger * 10000) { // Assuming $10k base
            reasons.push(`Daily loss limit exceeded: $${this.dailyLoss.toFixed(2)}`);
            shouldTrip = true;
        }

        // Consecutive losses trigger
        if (this.consecutiveLosses >= this.consecutiveLossesTrigger) {
            reasons.push(`Too many consecutive losses: ${this.consecutiveLosses}`);
            shouldTrip = true;
        }

        // Market volatility trigger
        if (this.marketVolatility > this.volatilityTrigger) {
            reasons.push(`Excessive market volatility: ${(this.marketVolatility * 100).toFixed(1)}%`);
            shouldTrip = true;
        }

        return { shouldTrip, reasons };
    }

    tripBreaker(reasons) {
        this.state = 'OPEN';
        this.lastFailureTime = Date.now();

        const message = `🛑 CIRCUIT BREAKER ACTIVATED!\nReasons: ${reasons.join(', ')}\nTimestamp: ${new Date().toISOString()}`;

        console.error(message);

        // Send emergency notification
        this.sendEmergencyNotification(message, reasons);

        // Log the trip event
        this.failures.push({
            timestamp: Date.now(),
            error: 'Circuit breaker tripped',
            type: 'CIRCUIT_TRIP',
            reasons
        });
    }

    checkRecovery() {
        if (!this.lastFailureTime) return;

        const timeSinceFailure = Date.now() - this.lastFailureTime;

        if (timeSinceFailure > this.cooldownPeriod) {
            this.state = 'HALF_OPEN';
            console.log('🔄 Circuit breaker entering HALF_OPEN state for testing');
        }
    }

    reset() {
        this.state = 'CLOSED';
        this.failures = [];
        this.consecutiveLosses = 0;
        this.lastFailureTime = null;

        console.log('✅ Circuit breaker reset - Normal operations resumed');
    }

    forceReset() {
        this.reset();
        this.dailyLoss = 0;
        this.currentDrawdown = 0;

        console.log('🔧 Circuit breaker manually reset');
    }

    cleanOldFailures() {
        const cutoff = Date.now() - this.timeWindow;
        this.failures = this.failures.filter(failure => failure.timestamp > cutoff);
    }

    getStateReason() {
        switch (this.state) {
            case 'OPEN':
                return 'Circuit breaker tripped - Trading halted for safety';
            case 'HALF_OPEN':
                return 'Testing system recovery - Limited trading allowed';
            case 'CLOSED':
                return 'Normal operations';
            default:
                return 'Unknown state';
        }
    }

    getTimeUntilReset() {
        if (this.state !== 'OPEN' || !this.lastFailureTime) return 0;

        const timeSinceFailure = Date.now() - this.lastFailureTime;
        const timeRemaining = this.cooldownPeriod - timeSinceFailure;

        return Math.max(0, timeRemaining);
    }

    async sendEmergencyNotification(message, reasons) {
        try {
            if (this.emergencyWebhook) {
                const payload = {
                    timestamp: new Date().toISOString(),
                    level: 'CRITICAL',
                    system: 'Autonomous Trading System',
                    event: 'Circuit Breaker Activation',
                    message,
                    reasons,
                    metrics: {
                        failures: this.failures.length,
                        consecutiveLosses: this.consecutiveLosses,
                        currentDrawdown: this.currentDrawdown,
                        dailyLoss: this.dailyLoss,
                        marketVolatility: this.marketVolatility
                    }
                };

                // Mock webhook call - replace with actual HTTP request
                console.log('📧 Emergency notification sent:', JSON.stringify(payload, null, 2));
            }

            // Additional notification methods (email, SMS, etc.) could be added here

        } catch (error) {
            console.error('Failed to send emergency notification:', error);
        }
    }

    getDiagnostics() {
        return {
            state: this.state,
            config: {
                maxFailures: this.maxFailures,
                timeWindow: this.timeWindow,
                cooldownPeriod: this.cooldownPeriod,
                maxDrawdownTrigger: this.maxDrawdownTrigger,
                maxDailyLossTrigger: this.maxDailyLossTrigger,
                consecutiveLossesTrigger: this.consecutiveLossesTrigger,
                volatilityTrigger: this.volatilityTrigger
            },
            current: {
                failures: this.failures.length,
                consecutiveLosses: this.consecutiveLosses,
                dailyLoss: this.dailyLoss,
                currentDrawdown: this.currentDrawdown,
                marketVolatility: this.marketVolatility,
                lastFailureTime: this.lastFailureTime,
                timeUntilReset: this.getTimeUntilReset()
            },
            recentFailures: this.failures.slice(-10).map(f => ({
                timestamp: new Date(f.timestamp).toISOString(),
                type: f.type,
                error: f.error
            }))
        };
    }

    // Health check for monitoring systems
    getHealthStatus() {
        const diagnostics = this.getDiagnostics();

        let health = 'HEALTHY';
        const warnings = [];

        if (this.state === 'OPEN') {
            health = 'CRITICAL';
            warnings.push('Circuit breaker is tripped');
        } else if (this.state === 'HALF_OPEN') {
            health = 'WARNING';
            warnings.push('Circuit breaker in recovery mode');
        }

        if (this.failures.length > this.maxFailures * 0.7) {
            health = health === 'HEALTHY' ? 'WARNING' : health;
            warnings.push('Approaching failure threshold');
        }

        if (this.currentDrawdown > this.maxDrawdownTrigger * 0.8) {
            health = health === 'HEALTHY' ? 'WARNING' : health;
            warnings.push('Approaching drawdown limit');
        }

        if (this.consecutiveLosses > this.consecutiveLossesTrigger * 0.7) {
            health = health === 'HEALTHY' ? 'WARNING' : health;
            warnings.push('Multiple consecutive losses detected');
        }

        return {
            status: health,
            warnings,
            uptime: this.state === 'CLOSED' ? 'Normal' : 'Degraded',
            lastCheck: new Date().toISOString(),
            diagnostics
        };
    }

    // Manual controls for emergency situations
    emergencyStop(reason = 'Manual emergency stop') {
        this.tripBreaker([reason]);
        console.log(`🛑 EMERGENCY STOP ACTIVATED: ${reason}`);
    }

    // Reset daily metrics (should be called at start of each trading day)
    resetDailyMetrics() {
        this.dailyLoss = 0;
        console.log('📅 Daily metrics reset for new trading day');
    }
}

export default CircuitBreaker;