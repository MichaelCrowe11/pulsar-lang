export class MeanReversionStrategy {
    constructor(config) {
        this.config = config;
        this.bollingerMultiplier = 2;
        this.rsiOversold = 30;
        this.rsiOverbought = 70;
    }

    async analyze(marketData) {
        try {
            const indicators = marketData.markets[0]?.indicators || {};
            const price = indicators.price || 0;
            const rsi = indicators.rsi || 50;
            const bollinger = indicators.bollingerBands || {};

            // Calculate mean reversion signal
            const reversionScore = this.calculateReversionScore(
                price,
                bollinger.upper || price,
                bollinger.lower || price,
                bollinger.middle || price,
                rsi
            );

            let action = 'HOLD';
            let confidence = 0;

            if (reversionScore > 0.5) {
                action = 'BUY';
                confidence = Math.min(reversionScore, 0.9);
            } else if (reversionScore < -0.5) {
                action = 'SELL';
                confidence = Math.min(Math.abs(reversionScore), 0.9);
            }

            return {
                action,
                confidence,
                score: reversionScore,
                indicators: { rsi, bollinger }
            };
        } catch (error) {
            return { action: 'HOLD', confidence: 0, error: error.message };
        }
    }

    calculateReversionScore(price, upperBand, lowerBand, middleBand, rsi) {
        let score = 0;

        // Bollinger band position
        const bandPosition = (price - lowerBand) / (upperBand - lowerBand);
        if (bandPosition < 0.2) score += 0.5;
        else if (bandPosition > 0.8) score -= 0.5;

        // Distance from middle band
        const distanceFromMiddle = Math.abs(price - middleBand) / middleBand;
        if (distanceFromMiddle > 0.02) score += 0.25;

        // RSI extremes
        if (rsi < this.rsiOversold) score += 0.5;
        else if (rsi > this.rsiOverbought) score -= 0.5;

        return Math.max(-1, Math.min(1, score));
    }
}

export default MeanReversionStrategy;