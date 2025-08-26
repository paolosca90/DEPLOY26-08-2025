-- Machine Learning Performance Tracking
CREATE TABLE ml_model_metrics (
  id BIGSERIAL PRIMARY KEY,
  model_name VARCHAR(100) NOT NULL,
  model_version VARCHAR(50) NOT NULL,
  metric_type VARCHAR(50) NOT NULL, -- accuracy, precision, recall, f1_score, etc.
  metric_value DOUBLE PRECISION NOT NULL,
  training_date TIMESTAMP WITH TIME ZONE NOT NULL,
  validation_score DOUBLE PRECISION,
  test_score DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Feature Importance Tracking
CREATE TABLE ml_feature_importance (
  id BIGSERIAL PRIMARY KEY,
  model_name VARCHAR(100) NOT NULL,
  model_version VARCHAR(50) NOT NULL,
  feature_name VARCHAR(100) NOT NULL,
  importance_score DOUBLE PRECISION NOT NULL,
  feature_type VARCHAR(50) NOT NULL, -- technical, sentiment, volume, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Prediction Accuracy Tracking
CREATE TABLE ml_prediction_accuracy (
  id BIGSERIAL PRIMARY KEY,
  trade_id VARCHAR(50) NOT NULL,
  predicted_direction VARCHAR(10) NOT NULL,
  actual_direction VARCHAR(10),
  predicted_confidence DOUBLE PRECISION NOT NULL,
  actual_profit_loss DOUBLE PRECISION,
  prediction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  outcome_date TIMESTAMP WITH TIME ZONE,
  accuracy_score DOUBLE PRECISION,
  model_version VARCHAR(50) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  timeframe VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Market Pattern Recognition
CREATE TABLE ml_market_patterns (
  id BIGSERIAL PRIMARY KEY,
  pattern_name VARCHAR(100) NOT NULL,
  pattern_type VARCHAR(50) NOT NULL, -- trend, reversal, continuation, etc.
  symbol VARCHAR(20) NOT NULL,
  timeframe VARCHAR(10) NOT NULL,
  confidence_score DOUBLE PRECISION NOT NULL,
  success_rate DOUBLE PRECISION NOT NULL,
  avg_profit DOUBLE PRECISION NOT NULL,
  pattern_data JSONB NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Learning Progress Tracking
CREATE TABLE ml_learning_progress (
  id BIGSERIAL PRIMARY KEY,
  model_name VARCHAR(100) NOT NULL,
  training_epoch INTEGER NOT NULL,
  training_loss DOUBLE PRECISION NOT NULL,
  validation_loss DOUBLE PRECISION NOT NULL,
  learning_rate DOUBLE PRECISION NOT NULL,
  batch_size INTEGER NOT NULL,
  training_samples INTEGER NOT NULL,
  validation_samples INTEGER NOT NULL,
  training_time_seconds DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Model Performance Over Time
CREATE TABLE ml_performance_timeline (
  id BIGSERIAL PRIMARY KEY,
  model_name VARCHAR(100) NOT NULL,
  date_period DATE NOT NULL,
  total_predictions INTEGER NOT NULL,
  correct_predictions INTEGER NOT NULL,
  accuracy_rate DOUBLE PRECISION NOT NULL,
  avg_confidence DOUBLE PRECISION NOT NULL,
  total_profit_loss DOUBLE PRECISION NOT NULL,
  sharpe_ratio DOUBLE PRECISION,
  max_drawdown DOUBLE PRECISION,
  win_rate DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Adaptive Learning Parameters
CREATE TABLE ml_adaptive_parameters (
  id BIGSERIAL PRIMARY KEY,
  model_name VARCHAR(100) NOT NULL,
  parameter_name VARCHAR(100) NOT NULL,
  parameter_value DOUBLE PRECISION NOT NULL,
  parameter_type VARCHAR(50) NOT NULL, -- learning_rate, regularization, etc.
  adaptation_reason VARCHAR(200),
  performance_before DOUBLE PRECISION,
  performance_after DOUBLE PRECISION,
  adapted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_ml_model_metrics_model_name ON ml_model_metrics(model_name);
CREATE INDEX idx_ml_model_metrics_created_at ON ml_model_metrics(created_at);
CREATE INDEX idx_ml_feature_importance_model_name ON ml_feature_importance(model_name);
CREATE INDEX idx_ml_prediction_accuracy_trade_id ON ml_prediction_accuracy(trade_id);
CREATE INDEX idx_ml_prediction_accuracy_symbol ON ml_prediction_accuracy(symbol);
CREATE INDEX idx_ml_prediction_accuracy_prediction_date ON ml_prediction_accuracy(prediction_date);
CREATE INDEX idx_ml_market_patterns_symbol ON ml_market_patterns(symbol);
CREATE INDEX idx_ml_market_patterns_detected_at ON ml_market_patterns(detected_at);
CREATE INDEX idx_ml_learning_progress_model_name ON ml_learning_progress(model_name);
CREATE INDEX idx_ml_performance_timeline_model_name ON ml_performance_timeline(model_name);
CREATE INDEX idx_ml_performance_timeline_date_period ON ml_performance_timeline(date_period);
CREATE INDEX idx_ml_adaptive_parameters_model_name ON ml_adaptive_parameters(model_name);
