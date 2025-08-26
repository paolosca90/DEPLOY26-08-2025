import { api, APIError } from "encore.dev/api";
import { analysisDB } from "./db";
import { TradingStrategy } from "./trading-strategies";
import { recordSignalPerformance } from "./analytics-tracker";
import { executeMT5Order } from "./mt5-bridge";
import { user } from "~encore/clients";

interface ExecuteRequest {
  tradeId: string;
  lotSize?: number;
  strategy?: TradingStrategy;
}

interface ExecuteResponse {
  success: boolean;
  orderId?: number;
  executionPrice?: number;
  strategy?: TradingStrategy;
  estimatedHoldingTime?: string;
  error?: string;
}

// Executes a trading signal on MetaTrader 5.
export const execute = api<ExecuteRequest, ExecuteResponse>(
  { 
    expose: true, 
    method: "POST", 
    path: "/analysis/execute"
  },
  async (req) => {
    const { tradeId, lotSize: requestedLotSize, strategy: requestedStrategy } = req;

    if (!tradeId || tradeId.trim() === "") {
      throw APIError.invalidArgument("Trade ID is required");
    }

    try {
      // Fetch the trading signal from database
      const signal = await analysisDB.queryRow`
        SELECT * FROM trading_signals 
        WHERE trade_id = ${tradeId}
      `;

      if (!signal) {
        console.error(`Trading signal not found: ${tradeId}`);
        throw APIError.notFound(`Trading signal ${tradeId} not found. The signal may have expired or been removed.`);
      }

      // Check if signal has already been executed
      if (signal.executed_at) {
        console.error(`Trading signal already executed: ${tradeId} at ${signal.executed_at}`);
        throw APIError.alreadyExists(`Trading signal ${tradeId} has already been executed at ${new Date(signal.executed_at).toLocaleString()}`);
      }

      // Validate signal data
      if (!signal.symbol || !signal.direction || !signal.entry_price) {
        console.error(`Invalid signal data for ${tradeId}:`, signal);
        throw APIError.invalidArgument("Trading signal contains invalid data");
      }

      // Use requested lot size or recommended lot size from signal
      const lotSize = requestedLotSize || signal.recommended_lot_size || 0.1;
      
      // Use requested strategy or strategy from signal
      const strategy = (requestedStrategy || signal.strategy || TradingStrategy.INTRADAY);

      // Validate lot size
      if (isNaN(lotSize) || lotSize <= 0 || lotSize > 100) {
        throw APIError.invalidArgument(`Invalid lot size: ${lotSize}. Must be between 0.01 and 100.`);
      }

      // Fetch the MT5 configuration from the single source of truth
      const { config: mt5Config } = await user.getMt5Config();
      if (!mt5Config) {
        throw APIError.failedPrecondition("MT5 configuration is not set up.");
      }

      console.log(`EXECUTING ${strategy} trade ${tradeId}: ${signal.direction} ${signal.symbol} ${lotSize} lots`);

      // Execute the order on MT5
      const executionResult = await executeMT5Order({
        symbol: signal.symbol,
        direction: signal.direction as "LONG" | "SHORT",
        lotSize: lotSize,
        entryPrice: signal.entry_price,
        takeProfit: signal.take_profit,
        stopLoss: signal.stop_loss,
        comment: `AI Trade ${tradeId}`
      }, mt5Config);

      if (!executionResult.success) {
        throw APIError.internal(`Failed to execute trade on MT5: ${executionResult.error}`);
      }

      // Update the signal as executed
      await analysisDB.exec`
        UPDATE trading_signals 
        SET executed_at = NOW(), 
            mt5_order_id = ${executionResult.orderId},
            execution_price = ${executionResult.executionPrice},
            lot_size = ${lotSize},
            strategy = ${strategy},
            status = 'executed'
        WHERE trade_id = ${tradeId} AND executed_at IS NULL
      `;
      console.log(`✅ Successfully updated signal ${tradeId} as EXECUTED with Order ID: ${executionResult.orderId}`);

      // Record performance tracking for ML improvement
      await recordSignalPerformance({
        tradeId,
        symbol: signal.symbol,
        predictedDirection: signal.direction as "LONG" | "SHORT",
        predictedConfidence: signal.confidence,
        executionTime: new Date(),
        marketConditionsAtEntry: signal.analysis_data?.enhancedTechnical?.marketContext || {},
        technicalIndicatorsAtEntry: signal.analysis_data?.technical || {}
      });

      const estimatedHoldingTime = getEstimatedHoldingTime(strategy, signal.max_holding_hours);

      return {
        success: true,
        orderId: executionResult.orderId,
        executionPrice: executionResult.executionPrice,
        strategy,
        estimatedHoldingTime,
      };

    } catch (error) {
      console.error(`Error executing trade ${tradeId}:`, error);
      
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw APIError.internal(`Failed to execute trade: ${errorMessage}`);
    }
  }
);

function getEstimatedHoldingTime(strategy: TradingStrategy, maxHours: number): string {
  switch (strategy) {
    case TradingStrategy.SCALPING:
      return "1-15 minutes";
    case TradingStrategy.INTRADAY:
      return "1-6 hours";
    default:
      return `Up to ${maxHours} hours`;
  }
}
