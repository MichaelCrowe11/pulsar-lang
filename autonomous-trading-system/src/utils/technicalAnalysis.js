export function calculateSupport(candles) {
    // Find local minima (support levels)
    const lows = candles.map(c => c.low);
    const supportLevels = [];

    for (let i = 2; i < lows.length - 2; i++) {
        if (lows[i] < lows[i-1] && lows[i] < lows[i-2] &&
            lows[i] < lows[i+1] && lows[i] < lows[i+2]) {
            supportLevels.push(lows[i]);
        }
    }

    // Return the strongest (most recent) support level
    return supportLevels.length > 0 ? Math.min(...supportLevels.slice(-3)) : 0;
}

export function calculateResistance(candles) {
    // Find local maxima (resistance levels)
    const highs = candles.map(c => c.high);
    const resistanceLevels = [];

    for (let i = 2; i < highs.length - 2; i++) {
        if (highs[i] > highs[i-1] && highs[i] > highs[i-2] &&
            highs[i] > highs[i+1] && highs[i] > highs[i+2]) {
            resistanceLevels.push(highs[i]);
        }
    }

    // Return the strongest (most recent) resistance level
    return resistanceLevels.length > 0 ? Math.max(...resistanceLevels.slice(-3)) : 0;
}