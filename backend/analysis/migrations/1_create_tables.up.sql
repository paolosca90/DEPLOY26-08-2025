CREATE TABLE trading_signals (
  id BIGSERIAL PRIMARY KEY,
  trade_id VARCHAR(50) UNIQUE NOT NULL,
  user_id BIGINT NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  direction VARCHAR(10) NOT NULL,
  entry_price DOUBLE PRECISION NOT NULL,
  take_profit DOUBLE PRECISION NOT NULL,
  stop_loss DOUBLE PRECISION NOT NULL,
  confidence INTEGER NOT NULL,
  analysis_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  executed_at TIMESTAMP WITH TIME ZONE,
  mt5_order_id BIGINT,
  execution_price DOUBLE PRECISION,
  lot_size DOUBLE PRECISION,
  closed_at TIMESTAMP WITH TIME ZONE,
  profit_loss DOUBLE PRECISION
);

CREATE TABLE market_data_cache (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  timeframe VARCHAR(10) NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE ai_model_performance (
  id BIGSERIAL PRIMARY KEY,
  model_version VARCHAR(50) NOT NULL,
  trade_id VARCHAR(50) NOT NULL,
  predicted_direction VARCHAR(10) NOT NULL,
  actual_direction VARCHAR(10),
  confidence INTEGER NOT NULL,
  profit_loss DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trading_signals_trade_id ON trading_signals(trade_id);
CREATE INDEX idx_trading_signals_user_id ON trading_signals(user_id);
CREATE INDEX idx_trading_signals_symbol ON trading_signals(symbol);
CREATE INDEX idx_trading_signals_created_at ON trading_signals(created_at);
CREATE INDEX idx_market_data_cache_symbol_timeframe ON market_data_cache(symbol, timeframe);
CREATE INDEX idx_ai_model_performance_model_version ON ai_model_performance(model_version);
