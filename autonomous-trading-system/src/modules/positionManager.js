export class PositionManager {
    constructor(config) {
        this.config = config;
        this.positions = new Map();
        this.trailingStopDistance = config.trailingStopDistance || 0.02;
        this.takeProfitMultiplier = config.takeProfitMultiplier || 2.5;
        this.partialTakeProfitLevels = [1.5, 2.0, 2.5];
        this.partialTakeProfitSizes = [0.33, 0.33, 0.34];
    }

    async addPosition(order) {
        const position = {
            id: order.orderId,
            symbol: order.symbol,
            side: order.side,
            entryPrice: order.price,
            currentPrice: order.price,
            amount: order.filled,
            remainingAmount: order.filled,
            entryTime: Date.now(),
            stopLoss: order.stopLoss || this.calculateStopLoss(order),
            takeProfit: order.takeProfit || this.calculateTakeProfit(order),
            trailingStop: null,
            highWaterMark: order.price,
            lowWaterMark: order.price,
            pnl: 0,
            pnlPercent: 0,
            status: 'open',
            partialFills: []
        };

        this.positions.set(position.id, position);
        console.log(`📊 Position opened: ${position.side} ${position.amount} ${position.symbol} @ ${position.entryPrice}`);

        return position;
    }

    async updateAllPositions() {
        const updates = [];

        for (const [id, position] of this.positions) {
            if (position.status === 'open') {
                const update = await this.updatePosition(id);
                updates.push(update);
            }
        }

        return updates;
    }

    async updatePosition(positionId) {
        const position = this.positions.get(positionId);
        if (!position) return null;

        try {
            // Get current market price (mock for now)
            const currentPrice = await this.getCurrentPrice(position.symbol);
            position.currentPrice = currentPrice;

            // Update P&L
            this.updatePnL(position);

            // Check for stop loss
            if (this.shouldTriggerStopLoss(position)) {
                return await this.closePosition(positionId, 'Stop loss triggered');
            }

            // Check for take profit
            if (this.shouldTriggerTakeProfit(position)) {
                return await this.handleTakeProfit(position);
            }

            // Update trailing stop
            this.updateTrailingStop(position);

            // Check trailing stop
            if (this.shouldTriggerTrailingStop(position)) {
                return await this.closePosition(positionId, 'Trailing stop triggered');
            }

            return {
                id: positionId,
                updated: true,
                position: { ...position }
            };

        } catch (error) {
            console.error(`Error updating position ${positionId}:`, error);
            return {
                id: positionId,
                error: error.message
            };
        }
    }

    updatePnL(position) {
        const multiplier = position.side === 'buy' ? 1 : -1;
        const priceDiff = (position.currentPrice - position.entryPrice) * multiplier;

        position.pnl = priceDiff * position.remainingAmount;
        position.pnlPercent = (priceDiff / position.entryPrice) * 100;

        // Update high/low water marks
        if (position.currentPrice > position.highWaterMark) {
            position.highWaterMark = position.currentPrice;
        }
        if (position.currentPrice < position.lowWaterMark) {
            position.lowWaterMark = position.currentPrice;
        }
    }

    shouldTriggerStopLoss(position) {
        if (!position.stopLoss) return false;

        if (position.side === 'buy') {
            return position.currentPrice <= position.stopLoss;
        } else {
            return position.currentPrice >= position.stopLoss;
        }
    }

    shouldTriggerTakeProfit(position) {
        if (!position.takeProfit) return false;

        if (position.side === 'buy') {
            return position.currentPrice >= position.takeProfit;
        } else {
            return position.currentPrice <= position.takeProfit;
        }
    }

    shouldTriggerTrailingStop(position) {
        if (!position.trailingStop) return false;

        if (position.side === 'buy') {
            return position.currentPrice <= position.trailingStop;
        } else {
            return position.currentPrice >= position.trailingStop;
        }
    }

    updateTrailingStop(position) {
        // Only update trailing stop if position is profitable
        if (position.pnlPercent <= 0) return;

        const distance = position.entryPrice * this.trailingStopDistance;

        if (position.side === 'buy') {
            const newStop = position.currentPrice - distance;
            if (!position.trailingStop || newStop > position.trailingStop) {
                position.trailingStop = newStop;
                console.log(`🎯 Trailing stop updated for ${position.symbol}: ${newStop.toFixed(2)}`);
            }
        } else {
            const newStop = position.currentPrice + distance;
            if (!position.trailingStop || newStop < position.trailingStop) {
                position.trailingStop = newStop;
                console.log(`🎯 Trailing stop updated for ${position.symbol}: ${newStop.toFixed(2)}`);
            }
        }
    }

    async handleTakeProfit(position) {
        // Implement partial take profit
        const profitLevel = this.getCurrentProfitLevel(position);

        if (profitLevel >= 0 && !position.partialFills[profitLevel]) {
            const partialAmount = position.amount * this.partialTakeProfitSizes[profitLevel];

            // Execute partial close
            const result = await this.partialClose(position, partialAmount);

            position.partialFills[profitLevel] = true;
            position.remainingAmount -= partialAmount;

            console.log(`💰 Partial profit taken: ${partialAmount} ${position.symbol} @ level ${profitLevel + 1}`);

            if (position.remainingAmount <= 0.001) {
                return await this.closePosition(position.id, 'Full take profit reached');
            }

            return result;
        }

        return { id: position.id, updated: false };
    }

    getCurrentProfitLevel(position) {
        const profitRatio = position.pnlPercent / 100;

        for (let i = 0; i < this.partialTakeProfitLevels.length; i++) {
            const level = this.partialTakeProfitLevels[i];
            const riskRewardRatio = profitRatio / Math.abs(this.calculateRiskPercent(position));

            if (riskRewardRatio >= level && !position.partialFills[i]) {
                return i;
            }
        }

        return -1;
    }

    calculateRiskPercent(position) {
        if (!position.stopLoss) return 0.02; // Default 2% risk

        const riskAmount = Math.abs(position.entryPrice - position.stopLoss);
        return riskAmount / position.entryPrice;
    }

    calculateStopLoss(order) {
        const stopDistance = order.price * 0.02; // 2% stop loss
        return order.side === 'buy' ?
            order.price - stopDistance :
            order.price + stopDistance;
    }

    calculateTakeProfit(order) {
        const profitDistance = order.price * 0.05; // 5% take profit
        return order.side === 'buy' ?
            order.price + profitDistance :
            order.price - profitDistance;
    }

    async partialClose(position, amount) {
        // Mock partial close
        console.log(`Partially closing ${amount} of ${position.symbol}`);

        return {
            id: position.id,
            partialClose: true,
            amount,
            price: position.currentPrice,
            pnl: (position.currentPrice - position.entryPrice) * amount * (position.side === 'buy' ? 1 : -1)
        };
    }

    async closePosition(positionId, reason = '') {
        const position = this.positions.get(positionId);
        if (!position) return null;

        position.status = 'closed';
        position.closeTime = Date.now();
        position.closeReason = reason;

        const duration = (position.closeTime - position.entryTime) / 1000 / 60; // minutes

        console.log(`
            📊 Position closed: ${position.symbol}
            Reason: ${reason}
            P&L: $${position.pnl.toFixed(2)} (${position.pnlPercent.toFixed(2)}%)
            Duration: ${duration.toFixed(1)} minutes
        `);

        this.positions.delete(positionId);

        return {
            id: positionId,
            closed: true,
            pnl: position.pnl,
            pnlPercent: position.pnlPercent,
            duration,
            reason
        };
    }

    async closeAllPositions(reason = 'Manual close all') {
        const results = [];

        for (const [id, position] of this.positions) {
            if (position.status === 'open') {
                const result = await this.closePosition(id, reason);
                results.push(result);
            }
        }

        return results;
    }

    async getCurrentPrice(symbol) {
        // Mock price with small random movement
        const basePrice = 50000; // Mock BTC price
        const randomMovement = (Math.random() - 0.5) * 0.01; // ±0.5% movement
        return basePrice * (1 + randomMovement);
    }

    getOpenPositions() {
        return Array.from(this.positions.values()).filter(p => p.status === 'open');
    }

    getTotalExposure() {
        return this.getOpenPositions().reduce((total, position) => {
            return total + (position.currentPrice * position.remainingAmount);
        }, 0);
    }

    getPositionStats() {
        const positions = Array.from(this.positions.values());
        const closedPositions = positions.filter(p => p.status === 'closed');

        const wins = closedPositions.filter(p => p.pnl > 0);
        const losses = closedPositions.filter(p => p.pnl < 0);

        return {
            total: positions.length,
            open: this.getOpenPositions().length,
            closed: closedPositions.length,
            wins: wins.length,
            losses: losses.length,
            winRate: closedPositions.length > 0 ? wins.length / closedPositions.length : 0,
            totalPnL: closedPositions.reduce((sum, p) => sum + p.pnl, 0),
            avgWin: wins.length > 0 ? wins.reduce((sum, p) => sum + p.pnl, 0) / wins.length : 0,
            avgLoss: losses.length > 0 ? losses.reduce((sum, p) => sum + p.pnl, 0) / losses.length : 0
        };
    }
}

export default PositionManager;