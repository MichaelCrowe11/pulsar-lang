export async function getMarketData(symbol, timeframes) {
    // Mock market data for testing
    const basePrice = symbol.includes('BTC') ? 50000 :
                     symbol.includes('ETH') ? 3000 : 100;

    const mockData = {};

    for (const timeframe of timeframes) {
        const candles = [];
        const candleCount = 100;

        for (let i = 0; i < candleCount; i++) {
            const timestamp = Date.now() - (candleCount - i) * getTimeframeMs(timeframe);
            const randomFactor = 1 + (Math.random() - 0.5) * 0.02; // ±1% random movement
            const price = basePrice * randomFactor;

            candles.push({
                timestamp,
                open: price,
                high: price * (1 + Math.random() * 0.01),
                low: price * (1 - Math.random() * 0.01),
                close: price,
                volume: Math.random() * 1000000
            });
        }

        mockData[timeframe] = candles;
    }

    // Add mock orderbook
    mockData.orderBook = {
        bids: Array.from({length: 20}, (_, i) => [basePrice * (1 - (i + 1) * 0.001), Math.random() * 100]),
        asks: Array.from({length: 20}, (_, i) => [basePrice * (1 + (i + 1) * 0.001), Math.random() * 100])
    };

    // Add mock recent trades
    mockData.recentTrades = Array.from({length: 50}, () => ({
        timestamp: Date.now() - Math.random() * 3600000,
        price: basePrice * (1 + (Math.random() - 0.5) * 0.01),
        size: Math.random() * 10000,
        side: Math.random() > 0.5 ? 'buy' : 'sell'
    }));

    return mockData;
}

function getTimeframeMs(timeframe) {
    const timeframes = {
        '1m': 60 * 1000,
        '5m': 5 * 60 * 1000,
        '15m': 15 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '4h': 4 * 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000
    };
    return timeframes[timeframe] || 60000;
}