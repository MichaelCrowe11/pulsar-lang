import { RSI, MACD, BollingerBands, ATR, StochasticRSI } from 'technicalindicators';
import { calculateSupport, calculateResistance } from '../utils/technicalAnalysis.js';
import { getMarketData } from '../utils/dataFetcher.js';

export class MarketScanner {
    constructor(config) {
        this.config = config;
        this.timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
        this.symbols = config.symbols || ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'];
        this.scanInterval = config.scanInterval || 60000; // 60 seconds
    }

    async scan() {
        const timestamp = Date.now();
        const signals = {
            timestamp,
            markets: [],
            opportunities: []
        };

        for (const symbol of this.symbols) {
            const marketAnalysis = await this.analyzeMarket(symbol);
            signals.markets.push(marketAnalysis);

            if (marketAnalysis.score > 0.7) {
                signals.opportunities.push({
                    symbol,
                    score: marketAnalysis.score,
                    action: marketAnalysis.recommendation,
                    indicators: marketAnalysis.indicators,
                    patterns: marketAnalysis.patterns
                });
            }
        }

        return signals;
    }

    async analyzeMarket(symbol) {
        const data = await getMarketData(symbol, this.timeframes);

        const indicators = await this.calculateIndicators(data);
        const patterns = await this.detectPatterns(data);
        const microstructure = await this.analyzeMicrostructure(data);
        const sentiment = await this.analyzeSentiment(symbol);

        const score = this.generateCompositeScore({
            indicators,
            patterns,
            microstructure,
            sentiment
        });

        return {
            symbol,
            timestamp: Date.now(),
            indicators,
            patterns,
            microstructure,
            sentiment,
            score,
            recommendation: this.generateRecommendation(score, indicators, patterns)
        };
    }

    async calculateIndicators(data) {
        const closes = data['1h'].map(candle => candle.close);
        const highs = data['1h'].map(candle => candle.high);
        const lows = data['1h'].map(candle => candle.low);
        const volumes = data['1h'].map(candle => candle.volume);

        const rsi = RSI.calculate({ values: closes, period: 14 });
        const macd = MACD.calculate({
            values: closes,
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9
        });
        const bb = BollingerBands.calculate({
            values: closes,
            period: 20,
            stdDev: 2
        });
        const atr = ATR.calculate({
            high: highs,
            low: lows,
            close: closes,
            period: 14
        });
        const stochRsi = StochasticRSI.calculate({
            values: closes,
            rsiPeriod: 14,
            stochasticPeriod: 14,
            kPeriod: 3,
            dPeriod: 3
        });

        return {
            rsi: rsi[rsi.length - 1],
            macd: macd[macd.length - 1],
            bollingerBands: bb[bb.length - 1],
            atr: atr[atr.length - 1],
            stochasticRsi: stochRsi[stochRsi.length - 1],
            volume: {
                current: volumes[volumes.length - 1],
                average: volumes.slice(-20).reduce((a, b) => a + b, 0) / 20,
                trend: this.calculateVolumeTrend(volumes)
            }
        };
    }

    async detectPatterns(data) {
        const patterns = {
            triangles: this.detectTriangles(data),
            headAndShoulders: this.detectHeadAndShoulders(data),
            doubleTop: this.detectDoubleTop(data),
            doubleBottom: this.detectDoubleBottom(data),
            breakouts: this.detectBreakouts(data),
            support: calculateSupport(data['1h']),
            resistance: calculateResistance(data['1h'])
        };

        return patterns;
    }

    async analyzeMicrostructure(data) {
        const orderBook = data.orderBook || {};
        const trades = data.recentTrades || [];

        return {
            spread: this.calculateSpread(orderBook),
            depth: this.analyzeOrderBookDepth(orderBook),
            imbalance: this.detectOrderImbalance(orderBook),
            liquidations: this.trackLiquidations(trades),
            whaleActivity: this.detectWhaleActivity(trades)
        };
    }

    async analyzeSentiment(symbol) {
        // In production, integrate with social media APIs, news APIs, etc.
        return {
            social: 0.6,  // Placeholder
            news: 0.5,     // Placeholder
            fear_greed: 0.55, // Placeholder
            overall: 0.55
        };
    }

    generateCompositeScore(analysis) {
        const weights = {
            indicators: 0.4,
            patterns: 0.3,
            microstructure: 0.2,
            sentiment: 0.1
        };

        let score = 0;

        // Technical indicators scoring
        if (analysis.indicators.rsi < 30) score += 0.2 * weights.indicators;
        if (analysis.indicators.rsi > 70) score -= 0.2 * weights.indicators;
        if (analysis.indicators.macd?.MACD > analysis.indicators.macd?.signal) {
            score += 0.3 * weights.indicators;
        }

        // Pattern scoring
        if (analysis.patterns.breakouts?.bullish) score += 0.4 * weights.patterns;
        if (analysis.patterns.breakouts?.bearish) score -= 0.4 * weights.patterns;

        // Microstructure scoring
        if (analysis.microstructure.imbalance > 0.6) score += 0.3 * weights.microstructure;

        // Sentiment scoring
        score += analysis.sentiment.overall * weights.sentiment;

        return Math.max(0, Math.min(1, score));
    }

    generateRecommendation(score, indicators, patterns) {
        if (score > 0.7) {
            if (indicators.rsi < 30 && patterns.support) {
                return 'STRONG_BUY';
            }
            return 'BUY';
        } else if (score < 0.3) {
            if (indicators.rsi > 70 && patterns.resistance) {
                return 'STRONG_SELL';
            }
            return 'SELL';
        }
        return 'HOLD';
    }

    // Pattern detection methods
    detectTriangles(data) {
        // Simplified triangle pattern detection
        const highs = data['1h'].slice(-20).map(c => c.high);
        const lows = data['1h'].slice(-20).map(c => c.low);

        const highTrend = this.calculateTrend(highs);
        const lowTrend = this.calculateTrend(lows);

        if (Math.abs(highTrend) < 0.01 && lowTrend > 0.01) {
            return { type: 'ascending', strength: 0.7 };
        } else if (highTrend < -0.01 && Math.abs(lowTrend) < 0.01) {
            return { type: 'descending', strength: 0.7 };
        } else if (highTrend < -0.01 && lowTrend > 0.01) {
            return { type: 'symmetrical', strength: 0.8 };
        }
        return null;
    }

    detectHeadAndShoulders(data) {
        // Simplified H&S pattern detection
        const prices = data['1h'].slice(-30).map(c => c.close);
        // Implementation would involve finding three peaks with middle highest
        return null;
    }

    detectDoubleTop(data) {
        const prices = data['1h'].slice(-30).map(c => c.high);
        // Find two similar peaks
        return null;
    }

    detectDoubleBottom(data) {
        const prices = data['1h'].slice(-30).map(c => c.low);
        // Find two similar troughs
        return null;
    }

    detectBreakouts(data) {
        const current = data['1h'][data['1h'].length - 1];
        const resistance = calculateResistance(data['1h']);
        const support = calculateSupport(data['1h']);

        return {
            bullish: current.close > resistance * 1.02,
            bearish: current.close < support * 0.98,
            resistance,
            support,
            strength: 0
        };
    }

    // Utility methods
    calculateTrend(values) {
        const n = values.length;
        const sumX = n * (n - 1) / 2;
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
        const sumX2 = n * (n - 1) * (2 * n - 1) / 6;

        return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    }

    calculateVolumeTrend(volumes) {
        const recent = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
        const previous = volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
        return (recent - previous) / previous;
    }

    calculateSpread(orderBook) {
        if (!orderBook.asks || !orderBook.bids) return 0;
        const bestAsk = orderBook.asks[0]?.[0] || 0;
        const bestBid = orderBook.bids[0]?.[0] || 0;
        return bestAsk - bestBid;
    }

    analyzeOrderBookDepth(orderBook) {
        if (!orderBook.asks || !orderBook.bids) return { buyDepth: 0, sellDepth: 0 };

        const buyDepth = orderBook.bids.slice(0, 10).reduce((sum, [price, size]) => sum + size, 0);
        const sellDepth = orderBook.asks.slice(0, 10).reduce((sum, [price, size]) => sum + size, 0);

        return { buyDepth, sellDepth, ratio: buyDepth / (sellDepth || 1) };
    }

    detectOrderImbalance(orderBook) {
        const depth = this.analyzeOrderBookDepth(orderBook);
        return depth.ratio > 1.5 ? 1 : depth.ratio < 0.67 ? -1 : 0;
    }

    trackLiquidations(trades) {
        // Detect large market sells that might indicate liquidations
        return trades.filter(t => t.size > 10000 && t.side === 'sell').length;
    }

    detectWhaleActivity(trades) {
        const largeTrades = trades.filter(t => t.size > 50000);
        return {
            count: largeTrades.length,
            netFlow: largeTrades.reduce((sum, t) => sum + (t.side === 'buy' ? t.size : -t.size), 0)
        };
    }
}

export default MarketScanner;