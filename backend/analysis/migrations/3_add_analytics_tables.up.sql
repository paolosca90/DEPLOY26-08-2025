-- Signal Analytics Table for tracking signal generation
CREATE TABLE signal_analytics (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  success BOOLEAN NOT NULL,
  signal_data JSONB,
  error_message TEXT,
  generation_time_ms INTEGER NOT NULL,
  market_conditions JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Signal Performance Tracking for ML improvement
CREATE TABLE signal_performance_tracking (
  id BIGSERIAL PRIMARY KEY,
  trade_id VARCHAR(50) NOT NULL UNIQUE,
  symbol VARCHAR(20) NOT NULL,
  predicted_direction VARCHAR(10) NOT NULL,
  actual_direction VARCHAR(10),
  predicted_confidence DOUBLE PRECISION NOT NULL,
  actual_profit_loss DOUBLE PRECISION,
  execution_time TIMESTAMP WITH TIME ZONE,
  close_time TIMESTAMP WITH TIME ZONE,
  market_conditions_entry JSONB NOT NULL,
  market_conditions_exit JSONB,
  technical_indicators_entry JSONB NOT NULL,
  technical_indicators_exit JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Aggregated Signal Generation Analytics
CREATE TABLE signal_generation_analytics (
  id BIGSERIAL PRIMARY KEY,
  generation_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  total_signals_generated INTEGER NOT NULL,
  avg_confidence DOUBLE PRECISION NOT NULL,
  avg_generation_time_ms DOUBLE PRECISION NOT NULL,
  long_signals_count INTEGER NOT NULL,
  short_signals_count INTEGER NOT NULL,
  strategy_distribution JSONB NOT NULL,
  session_distribution JSONB NOT NULL,
  symbols_analyzed JSONB NOT NULL,
  market_conditions_summary JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ML Model Performance Metrics
CREATE TABLE ml_model_performance_detailed (
  id BIGSERIAL PRIMARY KEY,
  model_version VARCHAR(50) NOT NULL,
  evaluation_date TIMESTAMP WITH TIME ZONE NOT NULL,
  symbol VARCHAR(20),
  strategy VARCHAR(20),
  session_type VARCHAR(20),
  accuracy DOUBLE PRECISION NOT NULL,
  precision_score DOUBLE PRECISION NOT NULL,
  recall_score DOUBLE PRECISION NOT NULL,
  f1_score DOUBLE PRECISION NOT NULL,
  profit_factor DOUBLE PRECISION,
  sharpe_ratio DOUBLE PRECISION,
  max_drawdown DOUBLE PRECISION,
  total_trades INTEGER NOT NULL,
  winning_trades INTEGER NOT NULL,
  avg_profit_per_trade DOUBLE PRECISION,
  confidence_calibration JSONB, -- For confidence vs actual performance analysis
  feature_importance JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Real-time Signal Quality Metrics
CREATE TABLE signal_quality_metrics (
  id BIGSERIAL PRIMARY KEY,
  measurement_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  signal_strength DOUBLE PRECISION NOT NULL, -- 0-1 scale
  market_noise_level DOUBLE PRECISION NOT NULL,
  trend_clarity DOUBLE PRECISION NOT NULL,
  volume_confirmation DOUBLE PRECISION NOT NULL,
  technical_alignment DOUBLE PRECISION NOT NULL,
  sentiment_score DOUBLE PRECISION,
  volatility_adjusted_confidence DOUBLE PRECISION NOT NULL,
  multi_timeframe_confluence DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_signal_analytics_symbol_created ON signal_analytics(symbol, created_at);
CREATE INDEX idx_signal_analytics_success_created ON signal_analytics(success, created_at);
CREATE INDEX idx_signal_performance_trade_id ON signal_performance_tracking(trade_id);
CREATE INDEX idx_signal_performance_symbol_close ON signal_performance_tracking(symbol, close_time);
CREATE INDEX idx_signal_generation_timestamp ON signal_generation_analytics(generation_timestamp);
CREATE INDEX idx_ml_performance_model_date ON ml_model_performance_detailed(model_version, evaluation_date);
CREATE INDEX idx_signal_quality_symbol_timestamp ON signal_quality_metrics(symbol, measurement_timestamp);

-- Partial indexes for better performance on common queries (without NOW() function)
CREATE INDEX idx_signal_analytics_successful_recent ON signal_analytics(symbol, created_at) 
WHERE success = true;

CREATE INDEX idx_signal_performance_completed ON signal_performance_tracking(symbol, close_time, actual_profit_loss) 
WHERE close_time IS NOT NULL AND actual_profit_loss IS NOT NULL;
