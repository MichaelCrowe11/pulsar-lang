export class RiskManager {
    constructor(config) {
        this.config = config;
        this.maxDrawdown = config.maxDrawdown || 0.10;
        this.maxPositionSize = config.maxPositionSize || 0.25;
        this.maxDailyLoss = config.maxDailyLoss || 0.05;
        this.maxOpenPositions = config.maxOpenPositions || 5;
        this.correlationThreshold = config.correlationThreshold || 0.7;

        this.currentState = {
            drawdown: 0,
            dailyPnL: 0,
            openPositions: [],
            totalExposure: 0,
            peakEquity: config.initialCapital || 10000,
            currentEquity: config.initialCapital || 10000,
            dayStartEquity: config.initialCapital || 10000
        };

        this.riskMetrics = {
            var95: 0,
            cvar95: 0,
            sharpeRatio: 0,
            sortinoRatio: 0,
            calmarRatio: 0,
            maxDrawdown: 0,
            currentVolatility: 0
        };
    }

    async evaluateRisk(signal, marketData, portfolio) {
        const riskAssessment = {
            approved: false,
            adjustedSize: 0,
            reasons: [],
            metrics: {},
            recommendations: []
        };

        // Kelly Criterion for position sizing
        const kellySize = this.calculateKellySize(signal, marketData);

        // Value at Risk calculation
        const var95 = this.calculateVaR(signal, marketData, portfolio);

        // Check all risk constraints
        const constraints = this.checkRiskConstraints(signal, marketData, portfolio);

        // Position correlation check
        const correlationRisk = this.checkCorrelation(signal, portfolio);

        // Calculate optimal position size
        const optimalSize = this.calculateOptimalSize(
            kellySize,
            constraints,
            correlationRisk,
            signal
        );

        riskAssessment.adjustedSize = optimalSize;
        riskAssessment.approved = optimalSize > 0 && constraints.allPassed;
        riskAssessment.metrics = {
            kellySize,
            var95,
            correlationRisk,
            currentDrawdown: this.currentState.drawdown,
            dailyPnL: this.currentState.dailyPnL
        };

        if (!constraints.allPassed) {
            riskAssessment.reasons = constraints.violations;
        }

        return riskAssessment;
    }

    calculateKellySize(signal, marketData) {
        // Kelly formula: f = (p * b - q) / b
        // f = fraction of capital to bet
        // p = probability of winning
        // b = ratio of win to loss
        // q = probability of losing (1 - p)

        const winProbability = signal.confidence;
        const lossProbability = 1 - winProbability;
        const winLossRatio = signal.riskReward || 2;

        const kellyFraction = (winProbability * winLossRatio - lossProbability) / winLossRatio;

        // Apply Kelly fraction scaling (use 25% of Kelly for safety)
        const safeKelly = Math.max(0, Math.min(kellyFraction * 0.25, this.maxPositionSize));

        return safeKelly;
    }

    calculateVaR(signal, marketData, portfolio, confidenceLevel = 0.95) {
        // Historical VaR calculation
        const returns = marketData?.historicalReturns || [];
        if (returns.length < 20) {
            // Use a default VaR estimate based on signal size
            return signal.size * 0.02; // 2% VaR estimate
        }

        // Sort returns and find percentile
        const sortedReturns = returns.sort((a, b) => a - b);
        const varIndex = Math.floor((1 - confidenceLevel) * sortedReturns.length);
        const var95 = Math.abs(sortedReturns[varIndex]);

        // Adjust for position size and leverage
        const positionVar = var95 * signal.size * (signal.leverage || 1);

        return positionVar;
    }

    checkRiskConstraints(signal, marketData, portfolio) {
        const constraints = {
            allPassed: true,
            violations: []
        };

        // Check maximum drawdown
        if (this.currentState.drawdown > this.maxDrawdown * 0.8) {
            constraints.allPassed = false;
            constraints.violations.push(`Approaching max drawdown: ${(this.currentState.drawdown * 100).toFixed(2)}%`);
        }

        // Check daily loss limit
        if (this.currentState.dailyPnL < -this.maxDailyLoss * this.currentState.dayStartEquity) {
            constraints.allPassed = false;
            constraints.violations.push(`Daily loss limit reached: ${(this.currentState.dailyPnL).toFixed(2)}`);
        }

        // Check position count
        if (portfolio.openPositions.length >= this.maxOpenPositions) {
            constraints.allPassed = false;
            constraints.violations.push(`Maximum open positions reached: ${portfolio.openPositions.length}`);
        }

        // Check total exposure
        const totalExposure = portfolio.openPositions.reduce((sum, pos) => sum + pos.size, 0);
        if (totalExposure + signal.size > 1.0) {
            constraints.allPassed = false;
            constraints.violations.push(`Total exposure would exceed 100%: ${((totalExposure + signal.size) * 100).toFixed(2)}%`);
        }

        // Check liquidity
        if (marketData?.liquidity && marketData.liquidity < signal.size * this.currentState.currentEquity) {
            constraints.allPassed = false;
            constraints.violations.push('Insufficient market liquidity for position size');
        }

        return constraints;
    }

    checkCorrelation(signal, portfolio) {
        // Calculate correlation with existing positions
        const correlations = portfolio.openPositions.map(position => {
            // Simplified correlation check based on asset type
            if (position.symbol === signal.symbol) return 1.0;
            if (position.asset === signal.asset) return 0.8;
            if (position.sector === signal.sector) return 0.6;
            return 0.3;
        });

        const maxCorrelation = Math.max(...correlations, 0);

        return {
            maxCorrelation,
            isHighlyCorrelated: maxCorrelation > this.correlationThreshold,
            adjustmentFactor: maxCorrelation > this.correlationThreshold ? 0.5 : 1.0
        };
    }

    calculateOptimalSize(kellySize, constraints, correlationRisk, signal) {
        let optimalSize = kellySize;

        // Apply correlation adjustment
        optimalSize *= correlationRisk.adjustmentFactor;

        // Apply volatility adjustment
        const volatilityMultiplier = this.getVolatilityAdjustment(signal);
        optimalSize *= volatilityMultiplier;

        // Apply drawdown protection
        if (this.currentState.drawdown > 0.05) {
            const drawdownMultiplier = 1 - (this.currentState.drawdown / this.maxDrawdown);
            optimalSize *= Math.max(0.3, drawdownMultiplier);
        }

        // Ensure within limits
        optimalSize = Math.max(0, Math.min(optimalSize, this.maxPositionSize));

        // Round to reasonable precision
        return Math.floor(optimalSize * 1000) / 1000;
    }

    getVolatilityAdjustment(signal) {
        const currentVol = signal.volatility || this.riskMetrics.currentVolatility;
        const targetVol = this.config.targetVolatility || 0.15;

        if (currentVol === 0) return 1.0;

        // Reduce size when volatility is high
        return Math.min(1.0, targetVol / currentVol);
    }

    updateMetrics(portfolio, marketData) {
        // Update equity and drawdown
        this.currentState.currentEquity = portfolio.totalValue;

        if (this.currentState.currentEquity > this.currentState.peakEquity) {
            this.currentState.peakEquity = this.currentState.currentEquity;
        }

        this.currentState.drawdown =
            (this.currentState.peakEquity - this.currentState.currentEquity) / this.currentState.peakEquity;

        // Update daily P&L
        this.currentState.dailyPnL =
            this.currentState.currentEquity - this.currentState.dayStartEquity;

        // Calculate Sharpe ratio
        this.calculateSharpeRatio(portfolio.returns);

        // Update volatility
        this.riskMetrics.currentVolatility = this.calculateVolatility(portfolio.returns);
    }

    calculateSharpeRatio(returns, riskFreeRate = 0.02) {
        if (!returns || returns.length < 30) return 0;

        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const excessReturns = returns.map(r => r - riskFreeRate / 365);
        const stdDev = this.calculateStdDev(excessReturns);

        this.riskMetrics.sharpeRatio = stdDev > 0 ?
            (avgReturn - riskFreeRate / 365) / stdDev * Math.sqrt(365) : 0;

        return this.riskMetrics.sharpeRatio;
    }

    calculateVolatility(returns) {
        if (!returns || returns.length < 2) return 0;
        return this.calculateStdDev(returns) * Math.sqrt(365);
    }

    calculateStdDev(values) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(value => Math.pow(value - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
        return Math.sqrt(avgSquareDiff);
    }

    resetDailyMetrics() {
        this.currentState.dayStartEquity = this.currentState.currentEquity;
        this.currentState.dailyPnL = 0;
    }

    getEmergencyStop() {
        return {
            shouldStop: this.currentState.drawdown > this.maxDrawdown,
            reason: this.currentState.drawdown > this.maxDrawdown ?
                `Maximum drawdown exceeded: ${(this.currentState.drawdown * 100).toFixed(2)}%` : null,
            metrics: this.riskMetrics,
            state: this.currentState
        };
    }
}

export default RiskManager;