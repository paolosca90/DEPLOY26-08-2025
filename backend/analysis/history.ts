import { api } from "encore.dev/api";
import { analysisDB } from "./db";
import { TradingSignal } from "./signal-generator";

interface ListHistoryResponse {
  signals: TradingSignal[];
}

// Retrieves the trading history.
export const listHistory = api<void, ListHistoryResponse>({
  method: "GET",
  path: "/analysis/history",
  expose: true,
}, async () => {
  const signals = await analysisDB.queryAll`
    SELECT 
      trade_id,
      symbol,
      direction,
      strategy,
      CAST(entry_price AS DOUBLE PRECISION) as entry_price,
      CAST(take_profit AS DOUBLE PRECISION) as take_profit,
      CAST(stop_loss AS DOUBLE PRECISION) as stop_loss,
      confidence,
      CAST(risk_reward_ratio AS DOUBLE PRECISION) as risk_reward_ratio,
      CAST(recommended_lot_size AS DOUBLE PRECISION) as recommended_lot_size,
      CAST(max_holding_hours AS DOUBLE PRECISION) as "maxHoldingTime",
      expires_at as "expiresAt",
      analysis_data->>'chartUrl' as "chartUrl",
      analysis_data->>'strategyRecommendation' as "strategyRecommendation",
      analysis_data,
      created_at,
      executed_at,
      CAST(execution_price AS DOUBLE PRECISION) as execution_price,
      CAST(profit_loss AS DOUBLE PRECISION) as profit_loss,
      status,
      closed_at
    FROM trading_signals
    ORDER BY created_at DESC
    LIMIT 50
  `;

  // Transform the data to match the expected TradingSignal interface
  const transformedSignals = signals.map(signal => ({
    tradeId: signal.trade_id,
    symbol: signal.symbol,
    direction: signal.direction,
    strategy: signal.strategy,
    entryPrice: Number(signal.entry_price),
    takeProfit: Number(signal.take_profit),
    stopLoss: Number(signal.stop_loss),
    confidence: Number(signal.confidence),
    riskRewardRatio: Number(signal.risk_reward_ratio),
    recommendedLotSize: Number(signal.recommended_lot_size),
    maxHoldingTime: Number(signal.maxHoldingTime),
    expiresAt: new Date(signal.expiresAt),
    chartUrl: signal.chartUrl,
    strategyRecommendation: signal.strategyRecommendation,
    analysis: {
      ...signal.analysis_data,
      createdAt: signal.created_at,
      executedAt: signal.executed_at,
      executionPrice: signal.execution_price ? Number(signal.execution_price) : undefined,
      profitLoss: signal.profit_loss ? Number(signal.profit_loss) : undefined,
      status: signal.status,
      closedAt: signal.closed_at
    }
  }));

  return { signals: transformedSignals as TradingSignal[] };
});
