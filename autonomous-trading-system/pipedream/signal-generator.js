import { AISignalGenerator } from '../src/modules/aiSignalGenerator.js';
import { defaultConfig } from '../src/config/config.js';

export default defineComponent({
  name: "AI Signal Generator",
  description: "Generates trading signals from market opportunities using AI",
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
      openaiApiKey: process.env.OPENAI_API_KEY,
      testMode: process.env.TEST_MODE !== 'false',
      minConfidence: parseFloat(process.env.MIN_CONFIDENCE || '0.65')
    };

    const generator = new AISignalGenerator(config);

    try {
      // Get opportunities from previous step or webhook
      const opportunities = steps.trigger?.event?.body?.opportunities || [];

      if (opportunities.length === 0) {
        return { message: "No opportunities to analyze", signals: [] };
      }

      const signals = [];

      for (const opportunity of opportunities) {
        if (opportunity.score > 0.7) {
          console.log(`Analyzing opportunity: ${opportunity.symbol} (score: ${opportunity.score})`);

          const signal = await generator.generateSignal(opportunity);

          if (signal.finalDecision.action !== 'HOLD' && signal.finalDecision.confidence > config.minConfidence) {
            signals.push({
              symbol: opportunity.symbol,
              signal: signal.finalDecision,
              analysis: {
                strategySignals: signal.strategySignals,
                ensembleSignal: signal.ensembleSignal,
                validation: signal.validation
              },
              timestamp: signal.timestamp
            });
          }
        }
      }

      console.log(`Generated ${signals.length} actionable signals from ${opportunities.length} opportunities`);

      return {
        signals,
        summary: {
          totalOpportunities: opportunities.length,
          signalsGenerated: signals.length,
          avgConfidence: signals.length > 0 ?
            signals.reduce((sum, s) => sum + s.signal.confidence, 0) / signals.length : 0
        }
      };

    } catch (error) {
      console.error('Signal generator error:', error);
      throw error;
    }
  }
});