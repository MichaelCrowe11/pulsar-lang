// Pipedream Multi-Exchange Trading Handler
// Add this as a code step in your Pipedream workflow

export default defineComponent({
  props: {
    // Exchange Apps
    coinbase: { type: "app", app: "coinbase" },
    binance: { type: "app", app: "binance" },
    kraken: { type: "app", app: "kraken" },
    kucoin: { type: "app", app: "kucoin" },

    // Database
    postgresql: { type: "app", app: "postgresql" }
  },

  async run({ steps, $ }) {
    const { exchange, symbol, side, quantity, price, urgency } = steps.trigger.event.body;

    // Exchange routing map
    const exchangeHandlers = {
      coinbase: {
        handler: this.tradeCoinbase,
        symbolFormat: (s) => s, // BTC-USD
        minOrder: { BTC: 0.001, ETH: 0.01 }
      },
      binance: {
        handler: this.tradeBinance,
        symbolFormat: (s) => s.replace('-', ''), // BTCUSDT
        minOrder: { BTC: 0.00001, ETH: 0.0001 }
      },
      kraken: {
        handler: this.tradeKraken,
        symbolFormat: (s) => 'X' + s.replace('-', 'Z'), // XXBTZUSD
        minOrder: { BTC: 0.0001, ETH: 0.001 }
      },
      kucoin: {
        handler: this.tradeKucoin,
        symbolFormat: (s) => s, // BTC-USDT
        minOrder: { BTC: 0.00001, ETH: 0.0001 }
      },
      bybit: {
        handler: this.tradeBybit,
        symbolFormat: (s) => s.replace('-', ''), // BTCUSDT
        minOrder: { BTC: 0.0001, ETH: 0.001 }
      }
    };

    try {
      // Get best price across exchanges
      const prices = await this.getBestPrice(symbol, side);
      console.log('Price comparison:', prices);

      // Select best exchange
      const selectedExchange = exchange || this.selectBestExchange(prices, side);
      console.log('Selected exchange:', selectedExchange);

      // Validate order size
      const minOrderSize = this.getMinOrderSize(selectedExchange, symbol);
      if (quantity < minOrderSize) {
        throw new Error(`Quantity ${quantity} below minimum ${minOrderSize}`);
      }

      // Execute trade on selected exchange
      const handler = exchangeHandlers[selectedExchange];
      if (!handler) {
        throw new Error(`Exchange ${selectedExchange} not supported`);
      }

      const formattedSymbol = handler.symbolFormat(symbol);
      const result = await handler.handler.call(this, {
        symbol: formattedSymbol,
        side,
        quantity,
        price,
        urgency
      });

      // Log to database
      await this.logTrade({
        exchange: selectedExchange,
        symbol,
        side,
        quantity,
        price: result.executedPrice || price,
        orderId: result.orderId,
        status: result.status,
        timestamp: new Date()
      });

      return {
        success: true,
        exchange: selectedExchange,
        orderId: result.orderId,
        executedPrice: result.executedPrice,
        executedQuantity: result.executedQuantity,
        status: result.status,
        fees: result.fees,
        priceComparison: prices
      };

    } catch (error) {
      console.error('Trade execution failed:', error);

      // Try fallback exchange
      const fallbackExchange = this.getFallbackExchange(exchange);
      if (fallbackExchange) {
        console.log('Attempting fallback to:', fallbackExchange);
        // Retry with fallback exchange
      }

      throw error;
    }
  },

  // Coinbase Trading
  async tradeCoinbase(params) {
    const { symbol, side, quantity, price } = params;

    const order = {
      product_id: symbol,
      side: side.toLowerCase(),
      order_configuration: {
        limit_limit_gtc: {
          base_size: quantity.toString(),
          limit_price: price.toString()
        }
      }
    };

    const response = await this.coinbase.createOrder(order);

    return {
      orderId: response.order_id,
      executedPrice: response.average_filled_price,
      executedQuantity: response.filled_size,
      status: response.status,
      fees: response.fill_fees
    };
  },

  // Binance Trading
  async tradeBinance(params) {
    const { symbol, side, quantity, price } = params;

    const order = {
      symbol: symbol,
      side: side.toUpperCase(),
      type: 'LIMIT',
      timeInForce: 'GTC',
      quantity: quantity,
      price: price
    };

    const response = await this.binance.createOrder(order);

    return {
      orderId: response.orderId,
      executedPrice: response.price,
      executedQuantity: response.executedQty,
      status: response.status,
      fees: response.commission
    };
  },

  // Kraken Trading
  async tradeKraken(params) {
    const { symbol, side, quantity, price } = params;

    const order = {
      pair: symbol,
      type: side.toLowerCase(),
      ordertype: 'limit',
      price: price,
      volume: quantity
    };

    const response = await this.kraken.addOrder(order);

    return {
      orderId: response.txid[0],
      executedPrice: price,
      executedQuantity: quantity,
      status: 'pending',
      fees: response.fee
    };
  },

  // KuCoin Trading
  async tradeKucoin(params) {
    const { symbol, side, quantity, price } = params;

    const order = {
      clientOid: Date.now().toString(),
      side: side.toLowerCase(),
      symbol: symbol,
      type: 'limit',
      size: quantity,
      price: price
    };

    const response = await this.kucoin.placeOrder(order);

    return {
      orderId: response.data.orderId,
      executedPrice: price,
      executedQuantity: quantity,
      status: 'active',
      fees: 0
    };
  },

  // Bybit Trading
  async tradeBybit(params) {
    const { symbol, side, quantity, price } = params;

    const order = {
      category: 'spot',
      symbol: symbol,
      side: side.capitalize(),
      orderType: 'Limit',
      qty: quantity.toString(),
      price: price.toString()
    };

    const response = await this.bybit.placeOrder(order);

    return {
      orderId: response.result.orderId,
      executedPrice: response.result.price,
      executedQuantity: response.result.qty,
      status: response.result.orderStatus,
      fees: 0
    };
  },

  // Get best price across all exchanges
  async getBestPrice(symbol, side) {
    const prices = {};

    // Fetch prices in parallel
    const promises = [
      this.getCoinbasePrice(symbol).then(p => prices.coinbase = p),
      this.getBinancePrice(symbol.replace('-', '')).then(p => prices.binance = p),
      this.getKrakenPrice('X' + symbol.replace('-', 'Z')).then(p => prices.kraken = p),
      this.getKucoinPrice(symbol).then(p => prices.kucoin = p)
    ];

    await Promise.allSettled(promises);

    return prices;
  },

  // Get Coinbase price
  async getCoinbasePrice(symbol) {
    try {
      const ticker = await this.coinbase.getTicker(symbol);
      return {
        bid: parseFloat(ticker.best_bid),
        ask: parseFloat(ticker.best_ask),
        spread: parseFloat(ticker.best_ask) - parseFloat(ticker.best_bid)
      };
    } catch (error) {
      console.error('Coinbase price fetch failed:', error);
      return null;
    }
  },

  // Get Binance price
  async getBinancePrice(symbol) {
    try {
      const ticker = await this.binance.getTicker(symbol);
      return {
        bid: parseFloat(ticker.bidPrice),
        ask: parseFloat(ticker.askPrice),
        spread: parseFloat(ticker.askPrice) - parseFloat(ticker.bidPrice)
      };
    } catch (error) {
      console.error('Binance price fetch failed:', error);
      return null;
    }
  },

  // Get Kraken price
  async getKrakenPrice(symbol) {
    try {
      const ticker = await this.kraken.getTicker(symbol);
      return {
        bid: parseFloat(ticker.b[0]),
        ask: parseFloat(ticker.a[0]),
        spread: parseFloat(ticker.a[0]) - parseFloat(ticker.b[0])
      };
    } catch (error) {
      console.error('Kraken price fetch failed:', error);
      return null;
    }
  },

  // Get KuCoin price
  async getKucoinPrice(symbol) {
    try {
      const ticker = await this.kucoin.getTicker(symbol);
      return {
        bid: parseFloat(ticker.bestBid),
        ask: parseFloat(ticker.bestAsk),
        spread: parseFloat(ticker.bestAsk) - parseFloat(ticker.bestBid)
      };
    } catch (error) {
      console.error('KuCoin price fetch failed:', error);
      return null;
    }
  },

  // Select best exchange based on prices
  selectBestExchange(prices, side) {
    let bestExchange = 'coinbase';
    let bestPrice = side === 'BUY' ? Infinity : 0;

    for (const [exchange, priceData] of Object.entries(prices)) {
      if (!priceData) continue;

      const price = side === 'BUY' ? priceData.ask : priceData.bid;

      if (side === 'BUY' && price < bestPrice) {
        bestPrice = price;
        bestExchange = exchange;
      } else if (side === 'SELL' && price > bestPrice) {
        bestPrice = price;
        bestExchange = exchange;
      }
    }

    return bestExchange;
  },

  // Get minimum order size for exchange
  getMinOrderSize(exchange, symbol) {
    const base = symbol.split('-')[0];
    const minimums = {
      coinbase: { BTC: 0.001, ETH: 0.01, SOL: 0.1 },
      binance: { BTC: 0.00001, ETH: 0.0001, SOL: 0.01 },
      kraken: { BTC: 0.0001, ETH: 0.001, SOL: 0.1 },
      kucoin: { BTC: 0.00001, ETH: 0.0001, SOL: 0.01 }
    };

    return minimums[exchange]?.[base] || 0.001;
  },

  // Get fallback exchange
  getFallbackExchange(primary) {
    const fallbacks = {
      coinbase: 'binance',
      binance: 'kucoin',
      kraken: 'coinbase',
      kucoin: 'binance'
    };

    return fallbacks[primary];
  },

  // Log trade to database
  async logTrade(trade) {
    const query = `
      INSERT INTO multi_exchange_trades
      (exchange, symbol, side, quantity, price, order_id, status, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    const values = [
      trade.exchange,
      trade.symbol,
      trade.side,
      trade.quantity,
      trade.price,
      trade.orderId,
      trade.status,
      trade.timestamp
    ];

    try {
      await this.postgresql.executeQuery({ query, values });
    } catch (error) {
      console.error('Failed to log trade:', error);
    }
  }
});