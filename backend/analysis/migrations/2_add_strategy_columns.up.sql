ALTER TABLE trading_signals 
ADD COLUMN strategy VARCHAR(20) DEFAULT 'INTRADAY',
ADD COLUMN risk_reward_ratio DOUBLE PRECISION,
ADD COLUMN recommended_lot_size DOUBLE PRECISION,
ADD COLUMN max_holding_hours DOUBLE PRECISION DEFAULT 8.0,
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN status VARCHAR(20) DEFAULT 'pending';

CREATE INDEX idx_trading_signals_strategy ON trading_signals(strategy);
CREATE INDEX idx_trading_signals_expires_at ON trading_signals(expires_at);
CREATE INDEX idx_trading_signals_status ON trading_signals(status);
