export class MomentumStrategy {
    constructor(config) {
        this.config = config;
        this.lookbackPeriod = 20;
        this.momentumThreshold = 0.02;
        this.volumeMultiplier = 1.5;
    }

    async analyze(marketData) {
        try {
            const indicators = marketData.markets[0]?.indicators || {};
            const price = indicators.price || 0;
            const rsi = indicators.rsi || 50;
            const macd = indicators.macd || {};
            const volume = indicators.volume || {};

            // Calculate momentum score
            const momentumScore = this.calculateMomentumScore(
                price,
                indicators.sma20 || price,
                indicators.sma50 || price,
                rsi,
                macd
            );

            // Volume confirmation
            const volumeConfirmed = volume.current > (volume.average * this.volumeMultiplier);

            // Determine action
            let action = 'HOLD';
            let confidence = 0;

            if (momentumScore > 0.5 && volumeConfirmed) {
                action = 'BUY';
                confidence = Math.min(momentumScore, 0.95);
            } else if (momentumScore < -0.5 && volumeConfirmed) {
                action = 'SELL';
                confidence = Math.min(Math.abs(momentumScore), 0.95);
            }

            return {
                action,
                confidence,
                score: momentumScore,
                indicators: {
                    rsi,
                    macd: macd.histogram || 0,
                    volumeRatio: volume.current / volume.average
                }
            };
        } catch (error) {
            console.error('Momentum strategy error:', error);
            return { action: 'HOLD', confidence: 0, error: error.message };
        }
    }

    calculateMomentumScore(price, sma20, sma50, rsi, macd) {
        let score = 0;

        // Price vs moving averages
        if (price > sma20) score += 0.25;
        if (price > sma50) score += 0.25;
        if (sma20 > sma50) score += 0.25;

        // RSI momentum
        if (rsi > 50 && rsi < 70) score += 0.25;
        else if (rsi > 70) score += 0.1;
        else if (rsi < 30) score -= 0.5;

        // MACD momentum
        if (macd.histogram > 0) score += 0.25;
        if (macd.signal > 0) score += 0.25;

        return Math.max(-1, Math.min(1, score));
    }
}

export default MomentumStrategy;