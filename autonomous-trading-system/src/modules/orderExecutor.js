import ccxt from 'ccxt';

export class OrderExecutor {
    constructor(config) {
        this.config = config;
        this.exchanges = {};
        this.testMode = config.testMode !== false;

        // Initialize exchange connections
        this.initializeExchanges();

        // Order routing configuration
        this.routingConfig = {
            slippageTolerance: config.slippageTolerance || 0.002,
            maxRetries: config.maxRetries || 3,
            orderTimeout: config.orderTimeout || 30000,
            smartRouting: config.smartRouting !== false,
            splitOrderThreshold: config.splitOrderThreshold || 10000
        };

        // Execution statistics
        this.stats = {
            totalOrders: 0,
            successfulOrders: 0,
            failedOrders: 0,
            totalSlippage: 0,
            avgExecutionTime: 0
        };
    }

    initializeExchanges() {
        const exchangeConfigs = {
            coinbase: {
                apiKey: this.config.coinbaseApiKey,
                secret: this.config.coinbaseSecret,
                enableRateLimit: true,
                options: { defaultType: 'spot' }
            },
            binance: {
                apiKey: this.config.binanceApiKey,
                secret: this.config.binanceSecret,
                enableRateLimit: true,
                options: { defaultType: 'spot' }
            },
            kraken: {
                apiKey: this.config.krakenApiKey,
                secret: this.config.krakenSecret,
                enableRateLimit: true
            }
        };

        for (const [name, config] of Object.entries(exchangeConfigs)) {
            try {
                if (config.apiKey && config.secret) {
                    this.exchanges[name] = new ccxt[name](config);
                    if (this.testMode) {
                        this.exchanges[name].setSandboxMode(true);
                    }
                }
            } catch (error) {
                console.error(`Failed to initialize ${name}:`, error);
            }
        }
    }

    async executeOrder(signal, riskParams) {
        const startTime = Date.now();

        try {
            // Select best exchange for execution
            const exchange = await this.selectBestExchange(signal);

            if (!exchange) {
                return this.createMockOrder(signal, riskParams);
            }

            // Calculate order parameters
            const orderParams = await this.calculateOrderParams(signal, riskParams, exchange);

            // Check if order should be split
            if (this.shouldSplitOrder(orderParams)) {
                return await this.executeSplitOrder(orderParams, exchange);
            }

            // Execute single order
            const order = await this.executeSingleOrder(orderParams, exchange);

            // Update statistics
            this.updateStats(order, startTime);

            return order;

        } catch (error) {
            console.error('Order execution failed:', error);
            this.stats.failedOrders++;

            return {
                success: false,
                error: error.message,
                signal,
                timestamp: Date.now()
            };
        }
    }

    async selectBestExchange(signal) {
        if (this.testMode) {
            return null; // Use mock orders in test mode
        }

        const availableExchanges = Object.entries(this.exchanges).filter(([_, ex]) => ex);

        if (availableExchanges.length === 0) {
            return null;
        }

        if (!this.routingConfig.smartRouting) {
            return availableExchanges[0][1];
        }

        // Compare exchanges for best execution
        const exchangeScores = await Promise.all(
            availableExchanges.map(async ([name, exchange]) => {
                try {
                    const orderbook = await exchange.fetchOrderBook(signal.symbol);
                    const ticker = await exchange.fetchTicker(signal.symbol);

                    const spread = (orderbook.asks[0][0] - orderbook.bids[0][0]) / ticker.last;
                    const liquidity = orderbook.bids.slice(0, 5).reduce((sum, [_, vol]) => sum + vol, 0);
                    const fee = exchange.fees.trading.taker;

                    return {
                        name,
                        exchange,
                        score: (liquidity * 100) - (spread * 1000) - (fee * 100),
                        spread,
                        liquidity,
                        fee
                    };
                } catch (error) {
                    return {
                        name,
                        exchange,
                        score: -Infinity
                    };
                }
            })
        );

        // Select exchange with highest score
        const bestExchange = exchangeScores.reduce((best, current) =>
            current.score > best.score ? current : best
        );

        console.log(`Selected ${bestExchange.name} for execution (score: ${bestExchange.score.toFixed(2)})`);
        return bestExchange.exchange;
    }

    async calculateOrderParams(signal, riskParams, exchange) {
        const balance = exchange ? await exchange.fetchBalance() : { USDT: { free: 10000 } };
        const availableBalance = balance.USDT?.free || 0;

        const positionSize = Math.min(
            availableBalance * riskParams.adjustedSize,
            this.config.maxOrderSize || 5000
        );

        const ticker = exchange ? await exchange.fetchTicker(signal.symbol) : { last: 50000 };
        const currentPrice = ticker.last;

        // Calculate order price based on signal type
        let orderPrice = currentPrice;
        if (signal.action === 'BUY') {
            orderPrice = currentPrice * (1 + this.routingConfig.slippageTolerance);
        } else if (signal.action === 'SELL') {
            orderPrice = currentPrice * (1 - this.routingConfig.slippageTolerance);
        }

        const amount = positionSize / orderPrice;

        return {
            symbol: signal.symbol,
            type: 'limit',
            side: signal.action.toLowerCase(),
            amount: this.roundAmount(amount, exchange),
            price: this.roundPrice(orderPrice, exchange),
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit,
            params: {
                timeInForce: 'IOC', // Immediate or cancel
                postOnly: false,
                reduceOnly: false
            }
        };
    }

    shouldSplitOrder(orderParams) {
        const orderValue = orderParams.amount * orderParams.price;
        return orderValue > this.routingConfig.splitOrderThreshold;
    }

    async executeSplitOrder(orderParams, exchange) {
        const numSplits = Math.ceil(
            (orderParams.amount * orderParams.price) / this.routingConfig.splitOrderThreshold
        );

        const splitAmount = orderParams.amount / numSplits;
        const orders = [];

        for (let i = 0; i < numSplits; i++) {
            const splitParams = {
                ...orderParams,
                amount: this.roundAmount(splitAmount, exchange),
                price: this.adjustPriceForSplit(orderParams.price, i, numSplits, orderParams.side)
            };

            try {
                const order = await this.executeSingleOrder(splitParams, exchange);
                orders.push(order);

                // Small delay between orders
                await this.delay(500);
            } catch (error) {
                console.error(`Split order ${i + 1}/${numSplits} failed:`, error);
            }
        }

        return {
            success: orders.length > 0,
            orders,
            totalFilled: orders.reduce((sum, o) => sum + (o.filled || 0), 0),
            avgPrice: this.calculateAvgPrice(orders),
            timestamp: Date.now()
        };
    }

    async executeSingleOrder(orderParams, exchange) {
        if (!exchange || this.testMode) {
            return this.createMockOrder(orderParams);
        }

        let attempt = 0;
        let lastError;

        while (attempt < this.routingConfig.maxRetries) {
            try {
                const order = await exchange.createOrder(
                    orderParams.symbol,
                    orderParams.type,
                    orderParams.side,
                    orderParams.amount,
                    orderParams.price,
                    orderParams.params
                );

                // Wait for order to fill or timeout
                const filledOrder = await this.waitForFill(order, exchange);

                // Place stop loss and take profit orders if filled
                if (filledOrder.filled > 0) {
                    await this.placeProtectionOrders(filledOrder, orderParams, exchange);
                }

                return {
                    success: true,
                    orderId: filledOrder.id,
                    symbol: filledOrder.symbol,
                    side: filledOrder.side,
                    price: filledOrder.price,
                    amount: filledOrder.amount,
                    filled: filledOrder.filled,
                    remaining: filledOrder.remaining,
                    status: filledOrder.status,
                    timestamp: filledOrder.timestamp
                };

            } catch (error) {
                lastError = error;
                attempt++;

                if (attempt < this.routingConfig.maxRetries) {
                    await this.delay(1000 * attempt);
                    // Adjust price for retry
                    orderParams.price = this.adjustPriceForRetry(orderParams.price, orderParams.side);
                }
            }
        }

        throw lastError || new Error('Order execution failed after retries');
    }

    async waitForFill(order, exchange) {
        const startTime = Date.now();

        while (Date.now() - startTime < this.routingConfig.orderTimeout) {
            const updatedOrder = await exchange.fetchOrder(order.id, order.symbol);

            if (updatedOrder.status === 'closed' || updatedOrder.status === 'canceled') {
                return updatedOrder;
            }

            await this.delay(1000);
        }

        // Cancel unfilled order
        try {
            await exchange.cancelOrder(order.id, order.symbol);
        } catch (error) {
            console.error('Failed to cancel order:', error);
        }

        return order;
    }

    async placeProtectionOrders(filledOrder, orderParams, exchange) {
        try {
            if (orderParams.stopLoss) {
                await exchange.createOrder(
                    filledOrder.symbol,
                    'stop_loss',
                    filledOrder.side === 'buy' ? 'sell' : 'buy',
                    filledOrder.filled,
                    orderParams.stopLoss
                );
            }

            if (orderParams.takeProfit) {
                await exchange.createOrder(
                    filledOrder.symbol,
                    'take_profit',
                    filledOrder.side === 'buy' ? 'sell' : 'buy',
                    filledOrder.filled,
                    orderParams.takeProfit
                );
            }
        } catch (error) {
            console.error('Failed to place protection orders:', error);
        }
    }

    createMockOrder(orderParams) {
        // Simulate order execution for testing
        const mockFillRate = 0.95 + Math.random() * 0.05;
        const mockSlippage = (Math.random() - 0.5) * 0.002;

        return {
            success: true,
            orderId: `mock_${Date.now()}`,
            symbol: orderParams.symbol || 'BTC/USDT',
            side: orderParams.side || orderParams.action?.toLowerCase() || 'buy',
            price: orderParams.price * (1 + mockSlippage),
            amount: orderParams.amount,
            filled: orderParams.amount * mockFillRate,
            remaining: orderParams.amount * (1 - mockFillRate),
            status: 'closed',
            testMode: true,
            timestamp: Date.now()
        };
    }

    roundAmount(amount, exchange) {
        if (!exchange) return Math.floor(amount * 100000000) / 100000000;
        const market = exchange.market(exchange.symbols[0]);
        const precision = market?.precision?.amount || 8;
        return parseFloat(amount.toFixed(precision));
    }

    roundPrice(price, exchange) {
        if (!exchange) return Math.floor(price * 100) / 100;
        const market = exchange.market(exchange.symbols[0]);
        const precision = market?.precision?.price || 2;
        return parseFloat(price.toFixed(precision));
    }

    adjustPriceForSplit(basePrice, index, total, side) {
        const adjustment = (index / total) * 0.001;
        return side === 'buy' ?
            basePrice * (1 + adjustment) :
            basePrice * (1 - adjustment);
    }

    adjustPriceForRetry(price, side) {
        return side === 'buy' ?
            price * 1.001 :
            price * 0.999;
    }

    calculateAvgPrice(orders) {
        const totalValue = orders.reduce((sum, o) => sum + (o.price * o.filled), 0);
        const totalAmount = orders.reduce((sum, o) => sum + o.filled, 0);
        return totalAmount > 0 ? totalValue / totalAmount : 0;
    }

    updateStats(order, startTime) {
        this.stats.totalOrders++;

        if (order.success) {
            this.stats.successfulOrders++;

            const executionTime = Date.now() - startTime;
            this.stats.avgExecutionTime =
                (this.stats.avgExecutionTime * (this.stats.successfulOrders - 1) + executionTime) /
                this.stats.successfulOrders;

            if (order.price && order.expectedPrice) {
                const slippage = Math.abs(order.price - order.expectedPrice) / order.expectedPrice;
                this.stats.totalSlippage += slippage;
            }
        } else {
            this.stats.failedOrders++;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.totalOrders > 0 ?
                this.stats.successfulOrders / this.stats.totalOrders : 0,
            avgSlippage: this.stats.successfulOrders > 0 ?
                this.stats.totalSlippage / this.stats.successfulOrders : 0
        };
    }
}

export default OrderExecutor;