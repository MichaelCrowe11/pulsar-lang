import dotenv from 'dotenv';
import { MarketScanner } from './modules/marketScanner.js';
import { AISignalGenerator } from './modules/aiSignalGenerator.js';
import { RiskManager } from './modules/riskManager.js';
import { OrderExecutor } from './modules/orderExecutor.js';
import { PositionManager } from './modules/positionManager.js';
import { PerformanceAnalyzer } from './modules/performanceAnalyzer.js';
import { CircuitBreaker } from './modules/circuitBreaker.js';

dotenv.config();

class AutonomousTradingSystem {
    constructor() {
        this.config = this.loadConfig();
        this.isRunning = false;
        this.testMode = this.config.testMode !== false;

        // Initialize all modules
        this.initializeModules();

        // System state
        this.state = {
            startTime: Date.now(),
            totalTrades: 0,
            successfulTrades: 0,
            totalPnL: 0,
            currentEquity: this.config.initialCapital || 10000,
            peakEquity: this.config.initialCapital || 10000,
            positions: [],
            lastSignal: null,
            lastError: null
        };

        console.log(`🚀 Autonomous Trading System initialized in ${this.testMode ? 'TEST' : 'LIVE'} mode`);
    }

    loadConfig() {
        return {
            // Trading configuration
            testMode: process.env.TEST_MODE !== 'false',
            initialCapital: parseFloat(process.env.INITIAL_CAPITAL || '10000'),
            symbols: (process.env.SYMBOLS || 'BTC/USDT,ETH/USDT,SOL/USDT').split(','),

            // API Keys
            openaiApiKey: process.env.OPENAI_API_KEY,
            coinbaseApiKey: process.env.COINBASE_API_KEY,
            coinbaseSecret: process.env.COINBASE_SECRET,
            binanceApiKey: process.env.BINANCE_API_KEY,
            binanceSecret: process.env.BINANCE_SECRET,
            krakenApiKey: process.env.KRAKEN_API_KEY,
            krakenSecret: process.env.KRAKEN_SECRET,

            // Risk parameters
            maxDrawdown: parseFloat(process.env.MAX_DRAWDOWN || '0.10'),
            maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '0.25'),
            maxDailyLoss: parseFloat(process.env.MAX_DAILY_LOSS || '0.05'),
            maxOpenPositions: parseInt(process.env.MAX_OPEN_POSITIONS || '5'),
            minConfidence: parseFloat(process.env.MIN_CONFIDENCE || '0.65'),
            targetVolatility: parseFloat(process.env.TARGET_VOLATILITY || '0.15'),
            maxVolatility: parseFloat(process.env.MAX_VOLATILITY || '0.30'),

            // Execution parameters
            slippageTolerance: parseFloat(process.env.SLIPPAGE_TOLERANCE || '0.002'),
            maxOrderSize: parseFloat(process.env.MAX_ORDER_SIZE || '5000'),

            // Timing parameters
            scanInterval: parseInt(process.env.SCAN_INTERVAL || '60000'),
            positionCheckInterval: parseInt(process.env.POSITION_CHECK_INTERVAL || '300000'),
            performanceAnalysisInterval: parseInt(process.env.PERFORMANCE_INTERVAL || '3600000')
        };
    }

    initializeModules() {
        this.marketScanner = new MarketScanner(this.config);
        this.signalGenerator = new AISignalGenerator(this.config);
        this.riskManager = new RiskManager(this.config);
        this.orderExecutor = new OrderExecutor(this.config);
        this.positionManager = new PositionManager(this.config);
        this.performanceAnalyzer = new PerformanceAnalyzer(this.config);
        this.circuitBreaker = new CircuitBreaker(this.config);
    }

    async start() {
        if (this.isRunning) {
            console.log('System is already running');
            return;
        }

        this.isRunning = true;
        console.log('🎯 Starting Autonomous Trading System...');

        // Start all loops
        this.startTradingLoop();
        this.startPositionManagementLoop();
        this.startPerformanceAnalysisLoop();

        // Set up graceful shutdown
        this.setupShutdownHandlers();
    }

    async startTradingLoop() {
        while (this.isRunning) {
            try {
                // Check circuit breaker
                const circuitStatus = this.circuitBreaker.checkStatus();
                if (circuitStatus.isTripped) {
                    console.log(`⚠️ Circuit breaker tripped: ${circuitStatus.reason}`);
                    await this.delay(60000);
                    continue;
                }

                // Scan markets
                console.log('🔍 Scanning markets...');
                const marketData = await this.marketScanner.scan();

                // Process each market opportunity
                for (const opportunity of marketData.opportunities) {
                    await this.processOpportunity(opportunity);
                }

                // Wait for next scan
                await this.delay(this.config.scanInterval);

            } catch (error) {
                console.error('Trading loop error:', error);
                this.state.lastError = error.message;
                this.circuitBreaker.reportError(error);
                await this.delay(5000);
            }
        }
    }

    async processOpportunity(marketData) {
        try {
            // Generate trading signal
            console.log(`📊 Analyzing ${marketData.symbol}...`);
            const signal = await this.signalGenerator.generateSignal(marketData);

            // Check if we should trade
            if (signal.finalDecision.action === 'HOLD') {
                console.log(`✋ Holding on ${marketData.symbol} (confidence: ${signal.finalDecision.confidence.toFixed(2)})`);
                return;
            }

            // Evaluate risk
            const riskAssessment = await this.riskManager.evaluateRisk(
                signal.finalDecision,
                marketData,
                { openPositions: this.state.positions }
            );

            if (!riskAssessment.approved) {
                console.log(`❌ Risk check failed: ${riskAssessment.reasons.join(', ')}`);
                return;
            }

            // Execute order
            console.log(`🎯 Executing ${signal.finalDecision.action} order for ${marketData.symbol}`);
            const order = await this.orderExecutor.executeOrder(
                signal.finalDecision,
                riskAssessment
            );

            if (order.success) {
                console.log(`✅ Order executed: ${order.side} ${order.filled} @ ${order.price}`);

                // Add to position manager
                await this.positionManager.addPosition(order);

                // Update state
                this.state.totalTrades++;
                this.state.successfulTrades++;
                this.state.lastSignal = signal;
                this.state.positions.push(order);
            } else {
                console.log(`❌ Order failed: ${order.error}`);
            }

        } catch (error) {
            console.error(`Error processing ${marketData.symbol}:`, error);
            this.circuitBreaker.reportError(error);
        }
    }

    async startPositionManagementLoop() {
        while (this.isRunning) {
            try {
                await this.delay(this.config.positionCheckInterval);

                console.log('📈 Managing positions...');
                const updates = await this.positionManager.updateAllPositions();

                // Update state with position changes
                for (const update of updates) {
                    if (update.closed) {
                        this.state.totalPnL += update.pnl;
                        this.state.positions = this.state.positions.filter(
                            p => p.orderId !== update.orderId
                        );
                    }
                }

                // Update risk metrics
                await this.riskManager.updateMetrics(
                    {
                        totalValue: this.state.currentEquity,
                        returns: this.performanceAnalyzer.getDailyReturns()
                    },
                    {}
                );

                // Check for emergency stop
                const emergencyStop = this.riskManager.getEmergencyStop();
                if (emergencyStop.shouldStop) {
                    console.log(`🛑 EMERGENCY STOP: ${emergencyStop.reason}`);
                    await this.shutdown();
                }

            } catch (error) {
                console.error('Position management error:', error);
            }
        }
    }

    async startPerformanceAnalysisLoop() {
        while (this.isRunning) {
            try {
                await this.delay(this.config.performanceAnalysisInterval);

                console.log('📊 Analyzing performance...');
                const analysis = await this.performanceAnalyzer.analyze({
                    trades: this.state.totalTrades,
                    pnl: this.state.totalPnL,
                    equity: this.state.currentEquity,
                    positions: this.state.positions
                });

                // Update strategy weights based on performance
                for (const [strategy, performance] of Object.entries(analysis.strategyPerformance)) {
                    this.signalGenerator.updateStrategyPerformance(strategy, performance);
                }

                // Log performance summary
                console.log(`
                    📈 Performance Update:
                    - Total P&L: $${this.state.totalPnL.toFixed(2)}
                    - Current Equity: $${this.state.currentEquity.toFixed(2)}
                    - Win Rate: ${((this.state.successfulTrades / Math.max(this.state.totalTrades, 1)) * 100).toFixed(1)}%
                    - Sharpe Ratio: ${analysis.sharpeRatio.toFixed(2)}
                    - Max Drawdown: ${(analysis.maxDrawdown * 100).toFixed(2)}%
                `);

                // Optimize if needed
                if (analysis.shouldOptimize) {
                    await this.performanceAnalyzer.optimizeStrategies();
                }

            } catch (error) {
                console.error('Performance analysis error:', error);
            }
        }
    }

    setupShutdownHandlers() {
        const shutdownHandler = async (signal) => {
            console.log(`\n⚠️ Received ${signal}, shutting down gracefully...`);
            await this.shutdown();
            process.exit(0);
        };

        process.on('SIGINT', shutdownHandler);
        process.on('SIGTERM', shutdownHandler);
    }

    async shutdown() {
        console.log('🛑 Shutting down trading system...');
        this.isRunning = false;

        // Close all positions
        try {
            await this.positionManager.closeAllPositions('System shutdown');
        } catch (error) {
            console.error('Error closing positions:', error);
        }

        // Save final state
        await this.saveState();

        console.log('✅ Shutdown complete');
    }

    async saveState() {
        const state = {
            ...this.state,
            shutdownTime: Date.now(),
            finalStats: {
                runtime: Date.now() - this.state.startTime,
                totalReturn: (this.state.currentEquity - this.config.initialCapital) / this.config.initialCapital,
                executorStats: this.orderExecutor.getStats(),
                riskMetrics: this.riskManager.riskMetrics
            }
        };

        // In production, save to database or file
        console.log('Final state:', JSON.stringify(state, null, 2));
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Start the system
async function main() {
    const tradingSystem = new AutonomousTradingSystem();

    // Display startup message
    console.log(`
╔══════════════════════════════════════════╗
║   AUTONOMOUS TRADING SYSTEM v1.0.0       ║
║   Mode: ${tradingSystem.testMode ? 'TEST' : 'LIVE'}                            ║
║   Capital: $${tradingSystem.config.initialCapital}                    ║
║   Symbols: ${tradingSystem.config.symbols.join(', ')}     ║
╚══════════════════════════════════════════╝
    `);

    // Start trading
    await tradingSystem.start();
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export default AutonomousTradingSystem;