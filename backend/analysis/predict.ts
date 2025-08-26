import { api, APIError } from "encore.dev/api";
import { analysisDB } from "./db";
import { TradingStrategy } from "./trading-strategies";
import { TradingSignal, generateSignalForSymbol } from "./signal-generator";
import { getUnifiedTradingConfig } from "./config-helper";

interface PredictRequest {
  symbol: string;
  strategy?: TradingStrategy;
}

// Generates AI-powered trading predictions with automatic NY session closure.
export const predict = api<PredictRequest, TradingSignal>(
  { 
    expose: true, 
    method: "POST", 
    path: "/analysis/predict"
  },
  async (req) => {
    const { symbol, strategy: userStrategy } = req;
    
    if (!symbol || symbol.trim() === "") {
      throw APIError.invalidArgument("Symbol is required");
    }

    try {
      const { mt5Config, tradeParams } = await getUnifiedTradingConfig();

      const signal = await generateSignalForSymbol(symbol, mt5Config, tradeParams, userStrategy);

      // Check if the signal was generated with real MT5 data (same validation as auto-trading)
      if (signal.analysis.dataSource !== 'MT5') {
        throw APIError.unavailable(`Unable to generate signal for ${symbol} - MT5 data not available. Please check your MT5 connection.`);
      }

      // Insert the generated signal into the database
      await analysisDB.exec`
        INSERT INTO trading_signals (
          trade_id, user_id, symbol, direction, strategy, entry_price, take_profit, stop_loss, 
          confidence, risk_reward_ratio, recommended_lot_size, max_holding_hours,
          expires_at, analysis_data, created_at, status
        ) VALUES (
          ${signal.tradeId}, 1, ${signal.symbol}, ${signal.direction}, ${signal.strategy}, 
          ${signal.entryPrice}, ${signal.takeProfit}, ${signal.stopLoss}, 
          ${signal.confidence}, ${signal.riskRewardRatio}, ${signal.recommendedLotSize},
          ${signal.maxHoldingTime}, ${signal.expiresAt}, ${JSON.stringify(signal.analysis)}, NOW(), 'pending'
        )
      `;
      console.log(`✅ Successfully generated and stored ${signal.strategy} signal ${signal.tradeId} for ${symbol}`);

      return signal;

    } catch (error) {
      console.error(`Error generating prediction for ${symbol}:`, error);
      if (error && typeof error === 'object' && 'code' in error) throw error;
      const errorMessage = error instanceof Error ? error.message : `Failed to generate trading signal for ${symbol}.`;
      throw APIError.internal(errorMessage);
    }
  }
);
