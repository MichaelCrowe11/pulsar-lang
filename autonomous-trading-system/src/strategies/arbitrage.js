export class ArbitrageStrategy {
    constructor(config) {
        this.config = config;
        this.minSpread = 0.002; // 0.2% minimum spread
        this.maxLatency = 100; // 100ms max latency
    }

    async analyze(marketData) {
        try {
            const opportunities = await this.findArbitrageOpportunities(marketData);
            
            if (opportunities.length === 0) {
                return { action: 'HOLD', confidence: 0 };
            }

            const bestOpportunity = opportunities[0];
            return {
                action: bestOpportunity.action,
                confidence: Math.min(bestOpportunity.profit / 0.01, 0.95),
                spread: bestOpportunity.spread,
                profit: bestOpportunity.profit,
                exchanges: bestOpportunity.exchanges
            };
        } catch (error) {
            return { action: 'HOLD', confidence: 0, error: error.message };
        }
    }

    async findArbitrageOpportunities(marketData) {
        const opportunities = [];
        const exchanges = marketData.exchanges || [];

        if (exchanges.length < 2) return opportunities;

        // Compare prices across exchanges
        for (let i = 0; i < exchanges.length; i++) {
            for (let j = i + 1; j < exchanges.length; j++) {
                const spread = this.calculateSpread(
                    exchanges[i].bid,
                    exchanges[j].ask
                );

                if (spread > this.minSpread) {
                    opportunities.push({
                        action: 'BUY',
                        spread,
                        profit: spread - 0.002, // Account for fees
                        exchanges: {
                            buy: exchanges[j].name,
                            sell: exchanges[i].name
                        }
                    });
                }
            }
        }

        return opportunities.sort((a, b) => b.profit - a.profit);
    }

    calculateSpread(bid, ask) {
        if (!bid || !ask || bid <= 0 || ask <= 0) return 0;
        return (bid - ask) / ask;
    }
}

export default ArbitrageStrategy;