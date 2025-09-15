import { MarketScanner } from '../src/modules/marketScanner.js';
import { defaultConfig } from '../src/config/config.js';

export default defineComponent({
  name: "Market Scanner",
  description: "Scans cryptocurrency markets for trading opportunities",
  version: "0.1.0",
  props: {
    timer: {
      type: "$.interface.timer",
      default: {
        intervalSeconds: 60 // Run every 60 seconds
      }
    }
  },
  async run({ steps, $ }) {
    const config = {
      ...defaultConfig,
      symbols: process.env.SYMBOLS?.split(',') || ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
      testMode: process.env.TEST_MODE !== 'false'
    };

    const scanner = new MarketScanner(config);

    try {
      const results = await scanner.scan();

      console.log(`Scanned ${results.markets.length} markets, found ${results.opportunities.length} opportunities`);

      // Store results for next workflow
      return {
        timestamp: results.timestamp,
        markets: results.markets,
        opportunities: results.opportunities,
        summary: {
          totalMarkets: results.markets.length,
          totalOpportunities: results.opportunities.length,
          highScoreOpportunities: results.opportunities.filter(o => o.score > 0.8).length
        }
      };
    } catch (error) {
      console.error('Market scanner error:', error);
      throw error;
    }
  }
});