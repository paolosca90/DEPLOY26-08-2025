-- Tabella per segnali AI avanzati con sistema di confidence
CREATE TABLE IF NOT EXISTS ai_signals (
    id SERIAL PRIMARY KEY,
    signal_id VARCHAR(255) UNIQUE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
    confidence DECIMAL(5,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    
    -- Prezzi di trading
    entry_price DECIMAL(15,5) NOT NULL,
    take_profit DECIMAL(15,5) NOT NULL,
    stop_loss DECIMAL(15,5) NOT NULL,
    risk_reward_ratio DECIMAL(8,2) NOT NULL,
    
    -- Strategia e timeframe
    strategy VARCHAR(100) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    
    -- Analisi tecnica (JSON)
    technical_analysis JSONB NOT NULL,
    confidence_factors JSONB NOT NULL,
    
    -- Stati e esecuzione
    should_execute BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'GENERATED' CHECK (status IN ('GENERATED', 'EXECUTED', 'CLOSED', 'STOPPED')),
    
    -- Risultati esecuzione (JSON, nullable)
    execution_result JSONB NULL,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_ai_signals_symbol ON ai_signals(symbol);
CREATE INDEX IF NOT EXISTS idx_ai_signals_confidence ON ai_signals(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_ai_signals_created_at ON ai_signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_signals_status ON ai_signals(status);
CREATE INDEX IF NOT EXISTS idx_ai_signals_should_execute ON ai_signals(should_execute);

-- Indice composto per query frequenti
CREATE INDEX IF NOT EXISTS idx_ai_signals_symbol_confidence_created ON ai_signals(symbol, confidence DESC, created_at DESC);

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_ai_signals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_signals_updated_at_trigger
    BEFORE UPDATE ON ai_signals
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_signals_updated_at();

-- Tabella per tracking delle performance ML
CREATE TABLE IF NOT EXISTS ml_performance_tracking (
    id SERIAL PRIMARY KEY,
    signal_id VARCHAR(255) REFERENCES ai_signals(signal_id),
    
    -- Dati del trade
    symbol VARCHAR(20) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    entry_price DECIMAL(15,5) NOT NULL,
    exit_price DECIMAL(15,5),
    lot_size DECIMAL(10,2) NOT NULL,
    
    -- Risultati
    pnl DECIMAL(15,2),
    pnl_pips DECIMAL(10,2),
    success BOOLEAN, -- TRUE se profitto, FALSE se loss
    
    -- Timing
    entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
    exit_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    
    -- Fattori che hanno contribuito al risultato
    confidence_at_entry DECIMAL(5,2) NOT NULL,
    market_conditions JSONB, -- Volatilità, spread, news events
    
    -- Feedback per il modello ML
    ml_feedback JSONB, -- Dati per migliorare il modello
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indici per la tabella performance
CREATE INDEX IF NOT EXISTS idx_ml_performance_symbol ON ml_performance_tracking(symbol);
CREATE INDEX IF NOT EXISTS idx_ml_performance_entry_time ON ml_performance_tracking(entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_ml_performance_success ON ml_performance_tracking(success);
CREATE INDEX IF NOT EXISTS idx_ml_performance_confidence ON ml_performance_tracking(confidence_at_entry DESC);

-- Vista per statistiche aggregate
CREATE OR REPLACE VIEW ml_performance_stats AS
SELECT 
    symbol,
    COUNT(*) as total_trades,
    COUNT(CASE WHEN success = TRUE THEN 1 END) as winning_trades,
    COUNT(CASE WHEN success = FALSE THEN 1 END) as losing_trades,
    ROUND(
        COUNT(CASE WHEN success = TRUE THEN 1 END)::DECIMAL / COUNT(*) * 100, 2
    ) as success_rate_percent,
    ROUND(AVG(pnl), 2) as avg_pnl,
    ROUND(SUM(pnl), 2) as total_pnl,
    ROUND(AVG(confidence_at_entry), 2) as avg_confidence,
    ROUND(AVG(duration_minutes), 2) as avg_duration_minutes,
    MAX(entry_time) as last_trade_time,
    COUNT(CASE WHEN entry_time >= NOW() - INTERVAL '24 hours' THEN 1 END) as trades_today,
    COUNT(CASE WHEN entry_time >= NOW() - INTERVAL '7 days' THEN 1 END) as trades_this_week
FROM ml_performance_tracking
WHERE exit_time IS NOT NULL -- Solo trade chiusi
GROUP BY symbol;

-- Tabella per configurazioni dinamiche del sistema AI
CREATE TABLE IF NOT EXISTS ai_system_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Configurazioni iniziali
INSERT INTO ai_system_config (key, value, description) VALUES 
('min_confidence_threshold', '60', 'Confidence minima per eseguire un trade automaticamente'),
('max_daily_trades', '15', 'Numero massimo di trade al giorno'),
('risk_per_trade_percent', '2', 'Percentuale di rischio per trade'),
('enabled_symbols', '["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "EURGBP", "EURJPY", "GBPJPY", "NQ", "ES", "XAUUSD", "CL"]', 'Asset abilitati per trading AI'),
('learning_enabled', 'true', 'Se il sistema deve apprendere dai risultati'),
('model_retrain_frequency_hours', '24', 'Ogni quante ore ri-addestrare il modello');

COMMENT ON TABLE ai_signals IS 'Segnali AI generati con sistema di confidence scoring avanzato';
COMMENT ON TABLE ml_performance_tracking IS 'Tracking delle performance per machine learning feedback loop';
COMMENT ON TABLE ai_system_config IS 'Configurazioni dinamiche del sistema AI';