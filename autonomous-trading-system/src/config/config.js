export const defaultConfig = {
    // Trading parameters
    testMode: true,
    initialCapital: 10000,
    symbols: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],

    // Risk management
    maxDrawdown: 0.10,
    maxPositionSize: 0.25,
    maxDailyLoss: 0.05,
    maxOpenPositions: 5,
    minConfidence: 0.65,
    targetVolatility: 0.15,
    maxVolatility: 0.30,

    // Position management
    trailingStopDistance: 0.02,
    takeProfitMultiplier: 2.5,

    // Execution
    slippageTolerance: 0.002,
    maxOrderSize: 5000,
    maxRetries: 3,
    orderTimeout: 30000,

    // Timing
    scanInterval: 60000,
    positionCheckInterval: 300000,
    performanceAnalysisInterval: 3600000,

    // Circuit breaker
    maxFailures: 5,
    timeWindow: 300000,
    cooldownPeriod: 600000,
    maxDrawdownTrigger: 0.08,
    maxDailyLossTrigger: 0.06,
    consecutiveLossesTrigger: 8,
    volatilityTrigger: 0.5,

    // Performance
    riskFreeRate: 0.02,
    targetSharpe: 2.0
};

export function validateConfig(config) {
    const errors = [];

    if (config.maxDrawdown <= 0 || config.maxDrawdown > 1) {
        errors.push('maxDrawdown must be between 0 and 1');
    }

    if (config.maxPositionSize <= 0 || config.maxPositionSize > 1) {
        errors.push('maxPositionSize must be between 0 and 1');
    }

    if (config.minConfidence < 0 || config.minConfidence > 1) {
        errors.push('minConfidence must be between 0 and 1');
    }

    if (!config.testMode) {
        if (!config.openaiApiKey) {
            errors.push('OpenAI API key is required for live trading');
        }
    }

    return errors;
}