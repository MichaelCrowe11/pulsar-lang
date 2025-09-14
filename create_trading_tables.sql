-- Trading System Database Schema
-- Run this in your PostgreSQL database

-- Trades table - stores all executed trades
CREATE TABLE IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    quantity DECIMAL(20,8) NOT NULL,
    price DECIMAL(20,8) NOT NULL,
    executed_price DECIMAL(20,8),
    executed_quantity DECIMAL(20,8),
    fees DECIMAL(20,8) DEFAULT 0,
    order_id VARCHAR(100),
    status VARCHAR(20),
    exchange VARCHAR(50),
    mode VARCHAR(10) DEFAULT 'MOCK',
    pnl DECIMAL(20,8) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Portfolio table - tracks current positions
CREATE TABLE IF NOT EXISTS portfolio (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) UNIQUE NOT NULL,
    quantity DECIMAL(20,8) DEFAULT 0,
    avg_price DECIMAL(20,8) DEFAULT 0,
    total_cost DECIMAL(20,8) DEFAULT 0,
    current_price DECIMAL(20,8) DEFAULT 0,
    unrealized_pnl DECIMAL(20,8) DEFAULT 0,
    realized_pnl DECIMAL(20,8) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0,
    total_pnl DECIMAL(20,8) DEFAULT 0,
    daily_pnl DECIMAL(20,8) DEFAULT 0,
    max_drawdown DECIMAL(10,4) DEFAULT 0,
    sharpe_ratio DECIMAL(10,4) DEFAULT 0,
    portfolio_value DECIMAL(20,8) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Risk metrics table
CREATE TABLE IF NOT EXISTS risk_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    portfolio_value DECIMAL(20,8),
    daily_var DECIMAL(20,8), -- Value at Risk
    position_count INTEGER,
    max_position_size DECIMAL(20,8),
    correlation_risk DECIMAL(5,2),
    leverage_ratio DECIMAL(5,2),
    exposure_limit DECIMAL(20,8)
);

-- Alert log table
CREATE TABLE IF NOT EXISTS alert_log (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    alert_type VARCHAR(50),
    severity VARCHAR(20),
    message TEXT,
    trade_id INTEGER REFERENCES trades(id),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP
);

-- Market data table (for backtesting and analysis)
CREATE TABLE IF NOT EXISTS market_data (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    symbol VARCHAR(20),
    open_price DECIMAL(20,8),
    high_price DECIMAL(20,8),
    low_price DECIMAL(20,8),
    close_price DECIMAL(20,8),
    volume DECIMAL(30,8),
    timeframe VARCHAR(10) -- 1m, 5m, 15m, 1h, etc.
);

-- System health table
CREATE TABLE IF NOT EXISTS system_health (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    component VARCHAR(50),
    status VARCHAR(20),
    response_time_ms INTEGER,
    error_count INTEGER DEFAULT 0,
    uptime_percentage DECIMAL(5,2)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_portfolio_symbol ON portfolio(symbol);
CREATE INDEX IF NOT EXISTS idx_market_data_symbol_time ON market_data(symbol, timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_date ON performance_metrics(date);

-- Create views for easy reporting
CREATE OR REPLACE VIEW daily_performance AS
SELECT
    DATE(timestamp) as trade_date,
    COUNT(*) as total_trades,
    SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
    SUM(CASE WHEN pnl < 0 THEN 1 ELSE 0 END) as losing_trades,
    ROUND(
        SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100,
        2
    ) as win_rate_percent,
    SUM(pnl) as daily_pnl,
    AVG(pnl) as avg_pnl_per_trade,
    MAX(pnl) as best_trade,
    MIN(pnl) as worst_trade
FROM trades
WHERE status = 'filled'
GROUP BY DATE(timestamp)
ORDER BY trade_date DESC;

CREATE OR REPLACE VIEW portfolio_summary AS
SELECT
    symbol,
    quantity,
    avg_price,
    current_price,
    (current_price - avg_price) * quantity as unrealized_pnl,
    ROUND(
        ((current_price - avg_price) / avg_price * 100),
        2
    ) as unrealized_pnl_percent,
    quantity * current_price as current_value,
    last_updated
FROM portfolio
WHERE quantity != 0;

-- Sample data insertion function
CREATE OR REPLACE FUNCTION update_portfolio_position(
    p_symbol VARCHAR(20),
    p_quantity DECIMAL(20,8),
    p_price DECIMAL(20,8),
    p_side VARCHAR(10)
) RETURNS VOID AS $$
DECLARE
    current_qty DECIMAL(20,8) := 0;
    current_avg DECIMAL(20,8) := 0;
    new_qty DECIMAL(20,8);
    new_avg DECIMAL(20,8);
BEGIN
    -- Get current position
    SELECT quantity, avg_price INTO current_qty, current_avg
    FROM portfolio WHERE symbol = p_symbol;

    IF NOT FOUND THEN
        current_qty := 0;
        current_avg := 0;
    END IF;

    -- Calculate new position
    IF p_side = 'BUY' THEN
        new_qty := current_qty + p_quantity;
        IF new_qty > 0 THEN
            new_avg := ((current_qty * current_avg) + (p_quantity * p_price)) / new_qty;
        END IF;
    ELSE -- SELL
        new_qty := current_qty - p_quantity;
        -- Average price stays the same for sells
        new_avg := current_avg;
    END IF;

    -- Update portfolio
    INSERT INTO portfolio (symbol, quantity, avg_price, last_updated)
    VALUES (p_symbol, new_qty, new_avg, NOW())
    ON CONFLICT (symbol)
    DO UPDATE SET
        quantity = new_qty,
        avg_price = CASE WHEN new_qty > 0 THEN new_avg ELSE 0 END,
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Sample queries for testing
-- INSERT INTO trades (symbol, side, quantity, price, executed_price, executed_quantity, status, exchange, mode)
-- VALUES ('BTC-USD', 'BUY', 0.001, 50000, 50000, 0.001, 'filled', 'Coinbase', 'MOCK');

COMMENT ON TABLE trades IS 'All trading transactions';
COMMENT ON TABLE portfolio IS 'Current positions and P&L';
COMMENT ON TABLE performance_metrics IS 'Daily performance statistics';
COMMENT ON TABLE risk_metrics IS 'Risk management data';
COMMENT ON TABLE alert_log IS 'System alerts and notifications';

-- Grant permissions (adjust username as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_pipedream_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_pipedream_user;