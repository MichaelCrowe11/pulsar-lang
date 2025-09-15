import { PositionManager } from '../src/modules/positionManager.js';
import { PerformanceAnalyzer } from '../src/modules/performanceAnalyzer.js';
import { defaultConfig } from '../src/config/config.js';

export default defineComponent({
  name: "Position Manager",
  description: "Manages open positions with trailing stops and performance tracking",
  version: "0.1.0",
  props: {
    timer: {
      type: "$.interface.timer",
      default: {
        intervalSeconds: 300 // Run every 5 minutes
      }
    }
  },
  async run({ steps, $ }) {
    const config = {
      ...defaultConfig,
      trailingStopDistance: parseFloat(process.env.TRAILING_STOP_DISTANCE || '0.02'),
      takeProfitMultiplier: parseFloat(process.env.TAKE_PROFIT_MULTIPLIER || '2.5')
    };

    const positionManager = new PositionManager(config);
    const performanceAnalyzer = new PerformanceAnalyzer(config);

    try {
      // In production, load positions from state storage
      const openPositions = positionManager.getOpenPositions();

      if (openPositions.length === 0) {
        return { message: "No open positions to manage", updates: [] };
      }

      console.log(`Managing ${openPositions.length} open positions`);

      // Update all positions
      const updates = await positionManager.updateAllPositions();

      // Track closed positions
      const closedPositions = updates.filter(u => u.closed);
      const activeUpdates = updates.filter(u => u.updated && !u.closed);

      // Analyze performance if we have closed positions
      let performanceAnalysis = null;
      if (closedPositions.length > 0) {
        const portfolioData = {
          trades: closedPositions.length,
          pnl: closedPositions.reduce((sum, p) => sum + p.pnl, 0),
          equity: config.initialCapital + closedPositions.reduce((sum, p) => sum + p.pnl, 0),
          positions: closedPositions
        };

        performanceAnalysis = await performanceAnalyzer.analyze(portfolioData);
        console.log(`Performance update: PnL ${portfolioData.pnl.toFixed(2)}, Sharpe: ${performanceAnalysis.sharpeRatio.toFixed(2)}`);
      }

      const summary = {
        totalPositions: openPositions.length,
        activeUpdates: activeUpdates.length,
        closedPositions: closedPositions.length,
        totalPnL: closedPositions.reduce((sum, p) => sum + p.pnl, 0),
        positionStats: positionManager.getPositionStats()
      };

      console.log(`Position management summary: ${summary.closedPositions} closed, ${summary.totalPnL.toFixed(2)} PnL`);

      return {
        updates,
        summary,
        performanceAnalysis,
        positionStats: positionManager.getPositionStats()
      };

    } catch (error) {
      console.error('Position manager error:', error);
      throw error;
    }
  }
});