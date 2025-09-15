export class MarketMakingStrategy {
    constructor(config) {
        this.config = config;
        this.spreadTarget = 0.002; // 0.2% spread target
        this.inventoryLimit = 0.5; // Max 50% inventory imbalance
    }

    async analyze(marketData) {
        try {
            const orderbook = marketData.orderbook || {};
            const inventory = marketData.inventory || { long: 0, short: 0 };
            
            const spread = this.calculateSpread(orderbook);
            const imbalance = this.calculateImbalance(inventory);
            const signal = this.generateMarketMakingSignal(spread, imbalance, orderbook);

            return signal;
        } catch (error) {
            return { action: 'HOLD', confidence: 0, error: error.message };
        }
    }

    calculateSpread(orderbook) {
        const bestBid = orderbook.bids?.[0]?.[0] || 0;
        const bestAsk = orderbook.asks?.[0]?.[0] || 0;
        
        if (bestBid === 0 || bestAsk === 0) return 0;
        return (bestAsk - bestBid) / bestBid;
    }

    calculateImbalance(inventory) {
        const total = inventory.long + inventory.short;
        if (total === 0) return 0;
        return (inventory.long - inventory.short) / total;
    }

    generateMarketMakingSignal(spread, imbalance, orderbook) {
        let action = 'HOLD';
        let confidence = 0;

        // Wide spread opportunity
        if (spread > this.spreadTarget * 2) {
            // Place orders on both sides
            if (Math.abs(imbalance) < this.inventoryLimit) {
                action = imbalance > 0 ? 'SELL' : 'BUY';
                confidence = Math.min(spread / (this.spreadTarget * 3), 0.8);
            }
        }

        // Inventory rebalancing
        if (Math.abs(imbalance) > this.inventoryLimit * 0.8) {
            action = imbalance > 0 ? 'SELL' : 'BUY';
            confidence = Math.min(Math.abs(imbalance), 0.7);
        }

        return {
            action,
            confidence,
            spread,
            imbalance,
            targetSpread: this.spreadTarget
        };
    }
}

export default MarketMakingStrategy;