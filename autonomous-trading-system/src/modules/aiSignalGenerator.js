import OpenAI from 'openai';
import { MomentumStrategy } from '../strategies/momentum.js';
import { MeanReversionStrategy } from '../strategies/meanReversion.js';
import { TrendFollowingStrategy } from '../strategies/trendFollowing.js';
import { ArbitrageStrategy } from '../strategies/arbitrage.js';
import { MarketMakingStrategy } from '../strategies/marketMaking.js';

export class AISignalGenerator {
    constructor(config) {
        this.config = config;
        this.openai = new OpenAI({ apiKey: config.openaiApiKey });

        this.strategies = {
            momentum: {
                instance: new MomentumStrategy(config),
                weight: 0.25,
                performance: { sharpe: 0, winRate: 0, pnl: 0 }
            },
            meanReversion: {
                instance: new MeanReversionStrategy(config),
                weight: 0.20,
                performance: { sharpe: 0, winRate: 0, pnl: 0 }
            },
            trendFollowing: {
                instance: new TrendFollowingStrategy(config),
                weight: 0.30,
                performance: { sharpe: 0, winRate: 0, pnl: 0 }
            },
            arbitrage: {
                instance: new ArbitrageStrategy(config),
                weight: 0.15,
                performance: { sharpe: 0, winRate: 0, pnl: 0 }
            },
            marketMaking: {
                instance: new MarketMakingStrategy(config),
                weight: 0.10,
                performance: { sharpe: 0, winRate: 0, pnl: 0 }
            }
        };
    }

    async generateSignal(marketData) {
        const strategySignals = await this.runStrategies(marketData);
        const ensembleSignal = this.createEnsembleSignal(strategySignals);
        const aiDecision = await this.getAIDecision(marketData, strategySignals, ensembleSignal);
        const validation = await this.validateSignal(aiDecision, marketData);

        return {
            primarySignal: aiDecision,
            strategySignals,
            ensembleSignal,
            validation,
            finalDecision: validation.approved ? aiDecision : { action: 'HOLD', confidence: 0 },
            timestamp: Date.now()
        };
    }

    async runStrategies(marketData) {
        const signals = {};

        for (const [name, strategy] of Object.entries(this.strategies)) {
            try {
                const signal = await strategy.instance.analyze(marketData);
                signals[name] = {
                    ...signal,
                    weight: strategy.weight,
                    performance: strategy.performance
                };
            } catch (error) {
                console.error(`Strategy ${name} failed:`, error);
                signals[name] = {
                    action: 'HOLD',
                    confidence: 0,
                    weight: strategy.weight,
                    error: error.message
                };
            }
        }

        return signals;
    }

    createEnsembleSignal(strategySignals) {
        let buyScore = 0;
        let sellScore = 0;
        let totalWeight = 0;

        for (const signal of Object.values(strategySignals)) {
            if (signal.action === 'BUY') {
                buyScore += signal.confidence * signal.weight;
            } else if (signal.action === 'SELL') {
                sellScore += signal.confidence * signal.weight;
            }
            totalWeight += signal.weight;
        }

        const netScore = (buyScore - sellScore) / totalWeight;

        return {
            action: netScore > 0.2 ? 'BUY' : netScore < -0.2 ? 'SELL' : 'HOLD',
            confidence: Math.abs(netScore),
            buyScore: buyScore / totalWeight,
            sellScore: sellScore / totalWeight,
            netScore
        };
    }

    async getAIDecision(marketData, strategySignals, ensembleSignal) {
        // In test mode or when API key is invalid, use ensemble signal
        if (!this.config.openaiApiKey || this.config.openaiApiKey === 'mock-key' || this.config.testMode) {
            return {
                action: ensembleSignal.action || 'HOLD',
                confidence: ensembleSignal.confidence || 0,
                size: 0.1,
                reasoning: 'Test mode - using ensemble signal',
                riskReward: 2.0,
                expectedReturn: 0.02,
                stopLoss: null,
                takeProfit: null
            };
        }

        const prompt = this.buildAIPrompt(marketData, strategySignals, ensembleSignal);

        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4-turbo-preview",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert quantitative trading AI optimizing for risk-adjusted returns. Analyze trading signals and provide decisions in JSON format."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.2,
                response_format: { type: "json_object" }
            });

            const decision = JSON.parse(response.choices[0].message.content);

            return {
                action: decision.action || 'HOLD',
                confidence: decision.confidence || 0,
                size: Math.min(decision.size || 0.1, 1.0),
                reasoning: decision.reasoning || '',
                riskReward: decision.riskReward || 1,
                expectedReturn: decision.expectedReturn || 0,
                stopLoss: decision.stopLoss,
                takeProfit: decision.takeProfit
            };
        } catch (error) {
            console.error('AI decision failed:', error);
            return {
                action: ensembleSignal.action || 'HOLD',
                confidence: ensembleSignal.confidence || 0,
                size: 0.1,
                reasoning: 'AI failed - using ensemble signal',
                riskReward: 2.0,
                expectedReturn: 0,
                stopLoss: null,
                takeProfit: null
            };
        }
    }

    buildAIPrompt(marketData, strategySignals, ensembleSignal) {
        return `
        Analyze these trading signals and provide a decision:

        Market Conditions:
        - Symbol: ${marketData.symbol}
        - Current Price: ${marketData.markets[0]?.indicators?.price || 'N/A'}
        - RSI: ${marketData.markets[0]?.indicators?.rsi || 'N/A'}
        - MACD: ${JSON.stringify(marketData.markets[0]?.indicators?.macd || {})}
        - Volume Trend: ${marketData.markets[0]?.indicators?.volume?.trend || 'N/A'}
        - Market Score: ${marketData.markets[0]?.score || 0}

        Strategy Signals:
        ${JSON.stringify(strategySignals, null, 2)}

        Ensemble Signal:
        ${JSON.stringify(ensembleSignal, null, 2)}

        Instructions:
        1. Evaluate each strategy signal considering their historical performance
        2. Consider the current market regime (trending/ranging/volatile)
        3. Calculate appropriate position size based on confidence and risk
        4. Determine stop loss and take profit levels
        5. Account for risk/reward ratio (minimum 1:2)

        Return JSON with:
        {
            "action": "BUY/SELL/HOLD",
            "confidence": 0.0-1.0,
            "size": 0.1-1.0 (position size as fraction of capital),
            "reasoning": "brief explanation",
            "riskReward": ratio,
            "expectedReturn": percentage,
            "stopLoss": price level,
            "takeProfit": price level
        }

        Optimize for Sharpe ratio > 2.0 and maximum drawdown < 10%.
        `;
    }

    async validateSignal(signal, marketData) {
        const validation = {
            approved: true,
            reasons: [],
            adjustments: {}
        };

        // Confidence threshold check
        if (signal.confidence < this.config.minConfidence) {
            validation.approved = false;
            validation.reasons.push(`Confidence ${signal.confidence} below minimum ${this.config.minConfidence}`);
        }

        // Risk/reward check
        if (signal.riskReward < 1.5) {
            validation.approved = false;
            validation.reasons.push(`Risk/reward ratio ${signal.riskReward} below minimum 1.5`);
        }

        // Market conditions check
        if (marketData.markets[0]?.score < 0.5 && signal.action !== 'HOLD') {
            validation.approved = false;
            validation.reasons.push('Poor market conditions for trading');
        }

        // Volatility check
        const volatility = marketData.markets[0]?.indicators?.atr;
        if (volatility && volatility > this.config.maxVolatility) {
            validation.adjustments.size = signal.size * 0.5;
            validation.reasons.push('High volatility - reducing position size');
        }

        return validation;
    }

    updateStrategyPerformance(strategyName, performance) {
        if (this.strategies[strategyName]) {
            this.strategies[strategyName].performance = performance;

            // Dynamically adjust weights based on performance
            this.rebalanceStrategyWeights();
        }
    }

    rebalanceStrategyWeights() {
        const performances = Object.values(this.strategies).map(s => s.performance.sharpe || 0);
        const totalPerformance = Math.max(performances.reduce((a, b) => a + b, 0), 1);

        for (const strategy of Object.values(this.strategies)) {
            const performanceScore = Math.max(strategy.performance.sharpe || 0, 0.1);
            strategy.weight = performanceScore / totalPerformance;
        }
    }
}

export default AISignalGenerator;