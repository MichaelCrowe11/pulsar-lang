// Enhanced Pipedream Workflow Step
// Copy this code into a new step in your Pipedream workflow

export default defineComponent({
  props: {
    // Exchange connections
    coinbase: {
      type: "app",
      app: "coinbase"
    },
    // Database for logging
    postgresql: {
      type: "app",
      app: "postgresql"
    },
    // Notifications
    slack: {
      type: "app",
      app: "slack"
    }
  },
  async run({ steps, $ }) {
    // Get the incoming trade data
    const trade = steps.trigger.event.body;

    console.log("🚀 Processing trade:", trade);

    // Validate required fields
    if (!trade.symbol || !trade.side || !trade.quantity || !trade.price) {
      return {
        status: "error",
        message: "Missing required fields: symbol, side, quantity, price"
      };
    }

    // Risk management
    const riskCheck = {
      positionSize: trade.quantity * trade.price,
      maxPosition: 1000, // $1000 max per trade
      approved: false
    };

    riskCheck.approved = riskCheck.positionSize <= riskCheck.maxPosition;

    if (!riskCheck.approved) {
      // Send alert to Slack
      await this.slack.sendMessage({
        channel: "trading-alerts",
        text: `🚨 TRADE REJECTED - Position size $${riskCheck.positionSize} exceeds limit of $${riskCheck.maxPosition}\\n\\nTrade: ${trade.side} ${trade.quantity} ${trade.symbol} @ $${trade.price}`
      });

      return {
        status: "rejected",
        reason: "Position size exceeds risk limit",
        trade: trade,
        riskCheck: riskCheck
      };
    }

    // Execute the trade (mock mode for safety)
    let executionResult;

    if (trade.mode === 'live' && process.env.ENABLE_LIVE_TRADING === 'true') {
      // LIVE TRADING - BE CAREFUL!
      try {
        // Example Coinbase order
        const order = {
          product_id: trade.symbol,
          side: trade.side.toLowerCase(),
          order_configuration: {
            limit_limit_gtc: {
              base_size: trade.quantity.toString(),
              limit_price: trade.price.toString()
            }
          }
        };

        const result = await this.coinbase.createOrder(order);

        executionResult = {
          orderId: result.order_id,
          status: result.status,
          executedPrice: result.average_filled_price || trade.price,
          executedQuantity: result.filled_size || trade.quantity,
          fees: result.fill_fees || 0,
          exchange: "Coinbase",
          mode: "LIVE"
        };

      } catch (error) {
        executionResult = {
          status: "failed",
          error: error.message,
          mode: "LIVE"
        };
      }

    } else {
      // MOCK TRADING (Safe mode)
      executionResult = {
        orderId: "MOCK_" + Date.now(),
        status: "filled",
        executedPrice: trade.price,
        executedQuantity: trade.quantity,
        fees: trade.price * trade.quantity * 0.001, // 0.1% fee
        exchange: "Mock",
        mode: "MOCK"
      };
    }

    // Calculate P&L if this was a closing trade
    const pnl = {
      gross: 0,
      net: 0,
      percentage: 0
    };

    // Store trade in database
    if (this.postgresql) {
      try {
        await this.postgresql.executeQuery({
          query: `
            INSERT INTO trades (
              timestamp, symbol, side, quantity, price,
              executed_price, executed_quantity, fees,
              order_id, status, exchange, mode, pnl
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          `,
          values: [
            new Date().toISOString(),
            trade.symbol,
            trade.side,
            trade.quantity,
            trade.price,
            executionResult.executedPrice,
            executionResult.executedQuantity,
            executionResult.fees,
            executionResult.orderId,
            executionResult.status,
            executionResult.exchange,
            executionResult.mode,
            pnl.net
          ]
        });
      } catch (dbError) {
        console.log("Database logging failed:", dbError.message);
      }
    }

    // Send success notification to Slack
    const notification = executionResult.status === "filled" ?
      `✅ TRADE EXECUTED\\n\\n📊 **Details:**\\n• Symbol: ${trade.symbol}\\n• Side: ${trade.side}\\n• Quantity: ${executionResult.executedQuantity}\\n• Price: $${executionResult.executedPrice}\\n• Value: $${(executionResult.executedPrice * executionResult.executedQuantity).toFixed(2)}\\n• Fees: $${executionResult.fees}\\n• Mode: ${executionResult.mode}\\n\\n🏦 Exchange: ${executionResult.exchange}\\n📝 Order ID: ${executionResult.orderId}` :
      `❌ TRADE FAILED\\n\\nError: ${executionResult.error}\\nTrade: ${trade.side} ${trade.quantity} ${trade.symbol}`;

    if (this.slack) {
      await this.slack.sendMessage({
        channel: "trading-alerts",
        text: notification
      });
    }

    // Return comprehensive result
    return {
      status: "completed",
      timestamp: new Date().toISOString(),
      trade: trade,
      execution: executionResult,
      risk: riskCheck,
      pnl: pnl,
      notifications_sent: true
    };
  }
});