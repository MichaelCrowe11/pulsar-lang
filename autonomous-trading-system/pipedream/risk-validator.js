import { RiskManager } from '../src/modules/riskManager.js';
import { CircuitBreaker } from '../src/modules/circuitBreaker.js';
import { defaultConfig } from '../src/config/config.js';

export default defineComponent({
  name: "Risk Validator",
  description: "Validates trading signals against risk parameters",
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
      maxDrawdown: parseFloat(process.env.MAX_DRAWDOWN || '0.10'),
      maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '0.25'),
      maxDailyLoss: parseFloat(process.env.MAX_DAILY_LOSS || '0.05')
    };

    const riskManager = new RiskManager(config);
    const circuitBreaker = new CircuitBreaker(config);

    try {
      // Check circuit breaker status first
      const cbStatus = circuitBreaker.checkStatus();
      if (cbStatus.isTripped) {
        console.log(`Circuit breaker is tripped: ${cbStatus.reason}`);
        return {
          approved: false,
          reason: 'Circuit breaker activated',
          circuitBreakerStatus: cbStatus
        };
      }

      // Get signals from previous step
      const signals = steps.trigger?.event?.body?.signals || [];

      if (signals.length === 0) {
        return { message: "No signals to validate", validatedSignals: [] };
      }

      const validatedSignals = [];
      const mockPortfolio = { openPositions: [] }; // In production, get from state

      for (const signalData of signals) {
        const { signal, symbol } = signalData;

        console.log(`Validating ${symbol} signal: ${signal.action} (confidence: ${signal.confidence})`);

        // Create mock market data for risk assessment
        const mockMarketData = {
          markets: [{
            score: 0.8,
            indicators: { atr: 0.15 }
          }]
        };

        const riskAssessment = await riskManager.evaluateRisk(
          signal,
          mockMarketData,
          mockPortfolio
        );

        if (riskAssessment.approved && riskAssessment.adjustedSize > 0) {
          validatedSignals.push({
            ...signalData,
            riskAssessment,
            approvedSize: riskAssessment.adjustedSize
          });

          console.log(`✅ ${symbol} approved with size ${riskAssessment.adjustedSize}`);
        } else {
          console.log(`❌ ${symbol} rejected: ${riskAssessment.reasons.join(', ')}`);
        }
      }

      return {
        validatedSignals,
        summary: {
          totalSignals: signals.length,
          approvedSignals: validatedSignals.length,
          rejectedSignals: signals.length - validatedSignals.length
        },
        circuitBreakerStatus: cbStatus
      };

    } catch (error) {
      console.error('Risk validator error:', error);
      circuitBreaker.reportError(error);
      throw error;
    }
  }
});