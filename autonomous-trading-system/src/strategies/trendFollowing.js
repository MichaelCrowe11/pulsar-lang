export class TrendFollowingStrategy {
    constructor(config) {
        this.config = config;
        this.trendStrengthThreshold = 0.6;
        this.adxThreshold = 25;
    }

    async analyze(marketData) {
        try {
            const indicators = marketData.markets[0]?.indicators || {};
            const trend = this.identifyTrend(indicators);
            const trendStrength = this.calculateTrendStrength(indicators);

            let action = 'HOLD';
            let confidence = 0;

            if (trend === 'up' && trendStrength > this.trendStrengthThreshold) {
                action = 'BUY';
                confidence = Math.min(trendStrength, 0.95);
            } else if (trend === 'down' && trendStrength > this.trendStrengthThreshold) {
                action = 'SELL';
                confidence = Math.min(trendStrength, 0.95);
            }

            return {
                action,
                confidence,
                trend,
                trendStrength,
                indicators: {
                    adx: indicators.adx || 0,
                    ema: indicators.ema || 0
                }
            };
        } catch (error) {
            return { action: 'HOLD', confidence: 0, error: error.message };
        }
    }

    identifyTrend(indicators) {
        const price = indicators.price || 0;
        const ema20 = indicators.ema20 || price;
        const ema50 = indicators.ema50 || price;
        const ema200 = indicators.ema200 || price;

        if (price > ema20 && ema20 > ema50 && ema50 > ema200) {
            return 'up';
        } else if (price < ema20 && ema20 < ema50 && ema50 < ema200) {
            return 'down';
        }
        return 'neutral';
    }

    calculateTrendStrength(indicators) {
        let strength = 0;
        const adx = indicators.adx || 0;
        const macd = indicators.macd || {};

        // ADX strength
        if (adx > this.adxThreshold) {
            strength += Math.min((adx - this.adxThreshold) / 25, 0.5);
        }

        // MACD alignment
        if (macd.histogram > 0 && macd.signal > 0) {
            strength += 0.3;
        }

        // Moving average alignment
        const price = indicators.price || 0;
        const ema20 = indicators.ema20 || price;
        const ema50 = indicators.ema50 || price;

        const shortTermTrend = (price - ema20) / ema20;
        const mediumTermTrend = (ema20 - ema50) / ema50;

        if (Math.sign(shortTermTrend) === Math.sign(mediumTermTrend)) {
            strength += 0.2;
        }

        return Math.min(strength, 1);
    }
}

export default TrendFollowingStrategy;