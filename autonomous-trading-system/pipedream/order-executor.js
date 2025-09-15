import { OrderExecutor } from '../src/modules/orderExecutor.js';
import { PositionManager } from '../src/modules/positionManager.js';
import { defaultConfig } from '../src/config/config.js';

export default defineComponent({
  name: "Order Executor",
  description: "Executes validated trading orders and manages positions",
  version: "0.1.0",
  props: {
    http: {
      type: "$.interface.http",
      customResponse: true
    }
  },
  async run({ steps, $ }) {
    const config = {
      ...defaultConfig,
      testMode: process.env.TEST_MODE !== 'false',
      coinbaseApiKey: process.env.COINBASE_API_KEY,
      coinbaseSecret: process.env.COINBASE_SECRET,
      binanceApiKey: process.env.BINANCE_API_KEY,
      binanceSecret: process.env.BINANCE_SECRET,
      krakenApiKey: process.env.KRAKEN_API_KEY,
      krakenSecret: process.env.KRAKEN_SECRET
    };

    const executor = new OrderExecutor(config);
    const positionManager = new PositionManager(config);

    try {
      // Get validated signals from previous step
      const validatedSignals = steps.trigger?.event?.body?.validatedSignals || [];

      if (validatedSignals.length === 0) {
        return { message: "No validated signals to execute", orders: [] };
      }

      const executedOrders = [];

      for (const signalData of validatedSignals) {
        const { signal, symbol, riskAssessment } = signalData;

        console.log(`Executing ${symbol}: ${signal.action} with size ${riskAssessment.adjustedSize}`);

        try {
          const order = await executor.executeOrder(signal, riskAssessment);

          if (order.success) {
            console.log(`✅ Order executed: ${order.orderId}`);

            // Add to position manager
            const position = await positionManager.addPosition(order);

            executedOrders.push({
              symbol,
              order,
              position,
              executedAt: Date.now()
            });

          } else {
            console.log(`❌ Order failed: ${order.error}`);
          }

        } catch (orderError) {
          console.error(`Order execution failed for ${symbol}:`, orderError);
        }
      }

      const summary = {
        totalSignals: validatedSignals.length,
        executedOrders: executedOrders.length,
        failedOrders: validatedSignals.length - executedOrders.length,
        totalValue: executedOrders.reduce((sum, o) => sum + (o.order.price * o.order.filled), 0)
      };

      console.log(`Execution summary: ${summary.executedOrders}/${summary.totalSignals} orders executed`);

      return {
        executedOrders,
        summary,
        executorStats: executor.getStats()
      };

    } catch (error) {
      console.error('Order executor error:', error);
      throw error;
    }
  }
});