# Autonomous Trading System

A sophisticated 24/7 AI-powered cryptocurrency trading system with risk management, multiple trading strategies, and circuit breaker protection.

## Features

### Core Components

- **Market Scanner**: Real-time market analysis with technical indicators and pattern detection
- **AI Signal Generator**: Ensemble of 5 trading strategies with AI decision making
- **Risk Manager**: Kelly Criterion position sizing, VaR calculation, and comprehensive risk controls
- **Order Executor**: Smart order routing across multiple exchanges with mock trading support
- **Position Manager**: Automated position management with trailing stops and partial profit taking
- **Performance Analyzer**: Real-time performance metrics with genetic algorithm optimization
- **Circuit Breaker**: Emergency stop system with multiple failure triggers

### Trading Strategies

1. **Momentum Strategy**: Trend-following based on RSI, MACD, and volume
2. **Mean Reversion Strategy**: Bollinger bands and RSI oversold/overbought conditions
3. **Trend Following Strategy**: EMA crossovers and ADX strength indicators
4. **Arbitrage Strategy**: Cross-exchange price differential detection
5. **Market Making Strategy**: Spread-based liquidity provision

### Risk Management Features

- Kelly Criterion position sizing
- Maximum drawdown protection (10%)
- Daily loss limits (5%)
- Position correlation analysis
- Volatility-based position adjustments
- Circuit breaker emergency stops

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

## Usage

### Test Mode (Default)

Run the system in test mode with mock trading:

```bash
npm start
```

### Run Tests

```bash
npm test
```

### Development Mode

```bash
npm run dev
```

## Configuration

### Environment Variables

```env
# API Keys
OPENAI_API_KEY=your_openai_api_key
COINBASE_API_KEY=your_coinbase_api_key
COINBASE_SECRET=your_coinbase_secret
BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET=your_binance_secret
KRAKEN_API_KEY=your_kraken_api_key
KRAKEN_SECRET=your_kraken_secret

# Trading Configuration
TEST_MODE=true
INITIAL_CAPITAL=10000
SYMBOLS=BTC/USDT,ETH/USDT,SOL/USDT
MAX_DRAWDOWN=0.10
MAX_POSITION_SIZE=0.25
MIN_CONFIDENCE=0.65

# Risk Parameters
MAX_DAILY_LOSS=0.05
MAX_OPEN_POSITIONS=5
TARGET_VOLATILITY=0.15
MAX_VOLATILITY=0.30

# Timing
SCAN_INTERVAL=60000
POSITION_CHECK_INTERVAL=300000
PERFORMANCE_INTERVAL=3600000
```

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Market Scanner │───▶│ Signal Generator│───▶│  Risk Manager   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                         │
┌─────────────────┐    ┌─────────────────┐              ▼
│Circuit Breaker  │◀───│ Position Manager│◀───┌─────────────────┐
└─────────────────┘    └─────────────────┘    │ Order Executor  │
         │                       │             └─────────────────┘
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│Emergency Stop   │    │Performance      │
│System           │    │Analyzer         │
└─────────────────┘    └─────────────────┘
```

## Performance Metrics

The system tracks comprehensive performance metrics:

- **Sharpe Ratio**: Risk-adjusted returns
- **Sortino Ratio**: Downside risk adjustment
- **Calmar Ratio**: Return vs maximum drawdown
- **Win Rate**: Percentage of profitable trades
- **Profit Factor**: Gross profit / gross loss
- **Maximum Drawdown**: Largest equity decline
- **Value at Risk (VaR)**: 95% confidence loss estimate

## Risk Controls

### Position-Level Risks
- Maximum position size: 25% of capital
- Kelly Criterion sizing with 25% scaling
- Correlation limits between positions
- Volatility-based adjustments

### Portfolio-Level Risks
- Maximum drawdown: 10%
- Daily loss limit: 5%
- Maximum open positions: 5
- Total exposure limit: 100%

### Circuit Breaker Triggers
- Consecutive failures: 5 errors in 5 minutes
- Maximum drawdown: 8%
- Daily loss: 6%
- Consecutive losses: 8 trades
- Market volatility: 50%

## Testing

The system includes comprehensive unit tests:

```bash
npm test
```

Tests cover:
- Market scanning functionality
- Signal generation with mock AI
- Risk management calculations
- Order execution simulation
- Position lifecycle management
- Performance analysis
- Circuit breaker state management
- Complete integration testing

## Deployment

### Pipedream Integration

The system is designed for deployment on Pipedream for 24/7 operation:

1. Export functions as Pipedream workflows
2. Configure webhook triggers
3. Set environment variables
4. Deploy with monitoring

### Local Development

For local development and testing:

```bash
# Start in development mode
npm run dev

# Run specific tests
npm test

# Check system status
curl http://localhost:3000/health
```

## Safety Features

1. **Test Mode Default**: All trading starts in simulation mode
2. **Circuit Breaker**: Automatic shutdown on risk threshold breaches
3. **Position Limits**: Hard caps on position sizes and exposure
4. **Emergency Stop**: Manual override capabilities
5. **Comprehensive Logging**: Full audit trail of all decisions

## Strategy Performance

The system continuously monitors and optimizes strategy performance:

- Dynamic weight adjustment based on historical performance
- Genetic algorithm parameter optimization
- Real-time strategy ensemble rebalancing
- Automatic strategy disabling for poor performers

## Monitoring

### Health Checks
- System uptime and status
- Circuit breaker state
- Position exposure
- Performance metrics
- Error rates

### Alerts
- Circuit breaker activation
- Performance degradation
- Risk threshold breaches
- System errors

## License

MIT License - See LICENSE file for details

## Disclaimer

This software is for educational and research purposes only. Cryptocurrency trading involves substantial risk of loss. The authors are not responsible for any financial losses incurred through the use of this software. Always test thoroughly in simulation mode before live trading.

## Support

For issues and questions:
1. Check the test suite for examples
2. Review the configuration documentation
3. Examine the comprehensive logging output
4. File issues with detailed error information