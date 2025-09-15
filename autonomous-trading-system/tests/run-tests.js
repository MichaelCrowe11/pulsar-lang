import { MarketScanner } from '../src/modules/marketScanner.js';
import { AISignalGenerator } from '../src/modules/aiSignalGenerator.js';
import { RiskManager } from '../src/modules/riskManager.js';
import { OrderExecutor } from '../src/modules/orderExecutor.js';
import { PositionManager } from '../src/modules/positionManager.js';
import { PerformanceAnalyzer } from '../src/modules/performanceAnalyzer.js';
import { CircuitBreaker } from '../src/modules/circuitBreaker.js';
import { defaultConfig } from '../src/config/config.js';

class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    addTest(name, testFn) {
        this.tests.push({ name, testFn });
    }

    async runAll() {
        console.log('🧪 Running Autonomous Trading System Tests\n');

        for (const test of this.tests) {
            try {
                console.log(`Running: ${test.name}`);
                await test.testFn();
                console.log(`✅ PASSED: ${test.name}\n`);
                this.passed++;
            } catch (error) {
                console.log(`❌ FAILED: ${test.name}`);
                console.log(`   Error: ${error.message}\n`);
                this.failed++;
            }
        }

        console.log(`\n📊 Test Results:`);
        console.log(`   Passed: ${this.passed}`);
        console.log(`   Failed: ${this.failed}`);
        console.log(`   Total: ${this.tests.length}`);

        if (this.failed === 0) {
            console.log('🎉 All tests passed!');
        }
    }
}

const runner = new TestRunner();

// Test Market Scanner
runner.addTest('Market Scanner - Basic functionality', async () => {
    const scanner = new MarketScanner(defaultConfig);
    const results = await scanner.scan();

    if (!results.timestamp) throw new Error('Missing timestamp');
    if (!Array.isArray(results.markets)) throw new Error('Markets should be array');
    if (!Array.isArray(results.opportunities)) throw new Error('Opportunities should be array');
});

// Test AI Signal Generator
runner.addTest('AI Signal Generator - Mock signal generation', async () => {
    const config = { ...defaultConfig, openaiApiKey: 'mock-key' };
    const generator = new AISignalGenerator(config);

    const mockMarketData = {
        symbol: 'BTC/USDT',
        markets: [{
            indicators: {
                price: 50000,
                rsi: 45,
                macd: { histogram: 0.1, signal: 0.05 },
                volume: { trend: 'up' }
            },
            score: 0.8
        }]
    };

    const signal = await generator.generateSignal(mockMarketData);

    if (!signal.finalDecision) throw new Error('Missing final decision');
    if (!['BUY', 'SELL', 'HOLD'].includes(signal.finalDecision.action)) {
        throw new Error('Invalid action');
    }
});

// Test Risk Manager
runner.addTest('Risk Manager - Kelly sizing calculation', async () => {
    const riskManager = new RiskManager(defaultConfig);

    const mockSignal = {
        confidence: 0.7,
        riskReward: 2.0,
        size: 0.1,
        volatility: 0.2
    };

    const mockMarketData = {
        markets: [{
            score: 0.8,
            indicators: { atr: 0.15 }
        }]
    };

    const mockPortfolio = { openPositions: [] };

    const assessment = await riskManager.evaluateRisk(mockSignal, mockMarketData, mockPortfolio);

    if (typeof assessment.adjustedSize !== 'number') throw new Error('Missing adjusted size');
    if (typeof assessment.approved !== 'boolean') throw new Error('Missing approval status');
});

// Test Order Executor
runner.addTest('Order Executor - Mock order execution', async () => {
    const executor = new OrderExecutor({ ...defaultConfig, testMode: true });

    const mockSignal = {
        symbol: 'BTC/USDT',
        action: 'BUY',
        size: 0.1,
        price: 50000
    };

    const mockRiskParams = { adjustedSize: 0.1 };

    const order = await executor.executeOrder(mockSignal, mockRiskParams);

    if (!order.success) throw new Error('Order should succeed in test mode');
    if (!order.orderId) throw new Error('Missing order ID');
    if (!order.testMode) throw new Error('Should be in test mode');
});

// Test Position Manager
runner.addTest('Position Manager - Position lifecycle', async () => {
    const positionManager = new PositionManager(defaultConfig);

    const mockOrder = {
        orderId: 'test-123',
        symbol: 'BTC/USDT',
        side: 'buy',
        price: 50000,
        filled: 0.1
    };

    const position = await positionManager.addPosition(mockOrder);

    if (position.id !== mockOrder.orderId) throw new Error('Position ID mismatch');
    if (position.status !== 'open') throw new Error('Position should be open');

    const updates = await positionManager.updateAllPositions();
    if (!Array.isArray(updates)) throw new Error('Updates should be array');
});

// Test Performance Analyzer
runner.addTest('Performance Analyzer - Metrics calculation', async () => {
    const analyzer = new PerformanceAnalyzer(defaultConfig);

    const mockPortfolio = {
        trades: 10,
        pnl: 500,
        equity: 10500,
        positions: []
    };

    const analysis = await analyzer.analyze(mockPortfolio);

    if (typeof analysis.totalReturn !== 'number') throw new Error('Missing total return');
    if (typeof analysis.sharpeRatio !== 'number') throw new Error('Missing Sharpe ratio');
    if (typeof analysis.shouldOptimize !== 'boolean') throw new Error('Missing optimization flag');
});

// Test Circuit Breaker
runner.addTest('Circuit Breaker - State management', async () => {
    const circuitBreaker = new CircuitBreaker(defaultConfig);

    // Test initial state
    let status = circuitBreaker.checkStatus();
    if (status.state !== 'CLOSED') throw new Error('Should start in CLOSED state');

    // Test error reporting
    for (let i = 0; i < 6; i++) {
        circuitBreaker.reportError(new Error(`Test error ${i}`));
    }

    status = circuitBreaker.checkStatus();
    if (status.state !== 'OPEN') throw new Error('Should trip after max failures');

    // Test reset
    circuitBreaker.forceReset();
    status = circuitBreaker.checkStatus();
    if (status.state !== 'CLOSED') throw new Error('Should reset to CLOSED state');
});

// Test Integration
runner.addTest('Integration - Complete trading cycle', async () => {
    const testConfig = { ...defaultConfig, testMode: true, openaiApiKey: 'mock-key' };
    const scanner = new MarketScanner(testConfig);
    const generator = new AISignalGenerator(testConfig);
    const riskManager = new RiskManager(testConfig);
    const executor = new OrderExecutor(testConfig);
    const positionManager = new PositionManager(testConfig);

    // Create a proper mock market data structure
    const mockOpportunity = {
        symbol: 'BTC/USDT',
        score: 0.8,
        action: 'BUY',
        markets: [{
            indicators: {
                price: 50000,
                rsi: 45,
                macd: { histogram: 0.1, signal: 0.05 },
                volume: { trend: 'up' },
                atr: 0.15
            },
            score: 0.8
        }]
    };

    // Generate signal
    const signal = await generator.generateSignal(mockOpportunity);

    // Evaluate risk
    const riskAssessment = await riskManager.evaluateRisk(
        signal.finalDecision,
        mockOpportunity,
        { openPositions: [] }
    );

    // Execute order (if approved)
    if (riskAssessment.approved) {
        const order = await executor.executeOrder(signal.finalDecision, riskAssessment);
        if (order.success) {
            await positionManager.addPosition(order);
        }
    }

    console.log('   Complete trading cycle executed successfully');
});

// Run all tests
runner.runAll().catch(console.error);