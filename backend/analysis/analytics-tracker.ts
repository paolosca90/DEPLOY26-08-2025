import { analysisDB } from "./db";
import type { TradingSignal } from "./signal-generator";

export interface SignalAnalyticsData {
  symbol: string;
  success: boolean;
  signal?: TradingSignal;
  error?: string;
  generationTime: number;
  marketConditions?: {
    sessionType: string;
    volatilityState: string;
    trendAlignment: string;
    confluence: number;
  };
  timestamp: Date;
}

export interface SignalPerformanceData {
  tradeId: string;
  symbol: string;
  predictedDirection: "LONG" | "SHORT";
  actualDirection?: "LONG" | "SHORT";
  predictedConfidence: number;
  actualProfitLoss?: number;
  executionTime?: Date;
  closeTime?: Date;
  marketConditionsAtEntry: any;
  marketConditionsAtExit?: any;
  technicalIndicatorsAtEntry: any;
  technicalIndicatorsAtExit?: any;
}

export async function recordSignalAnalytics(data: SignalAnalyticsData): Promise<void> {
  try {
    await analysisDB.exec`
      INSERT INTO signal_analytics (
        symbol,
        success,
        signal_data,
        error_message,
        generation_time_ms,
        market_conditions,
        created_at
      ) VALUES (
        ${data.symbol},
        ${data.success},
        ${data.signal ? JSON.stringify(data.signal) : null},
        ${data.error || null},
        ${data.generationTime},
        ${data.marketConditions ? JSON.stringify(data.marketConditions) : null},
        ${data.timestamp}
      )
    `;
    
    console.log(`📊 Recorded analytics for ${data.symbol}: ${data.success ? 'SUCCESS' : 'FAILED'}`);
  } catch (error) {
    console.error('Error recording signal analytics:', error);
  }
}

export async function recordSignalPerformance(data: SignalPerformanceData): Promise<void> {
  try {
    await analysisDB.exec`
      INSERT INTO signal_performance_tracking (
        trade_id,
        symbol,
        predicted_direction,
        actual_direction,
        predicted_confidence,
        actual_profit_loss,
        execution_time,
        close_time,
        market_conditions_entry,
        market_conditions_exit,
        technical_indicators_entry,
        technical_indicators_exit,
        created_at
      ) VALUES (
        ${data.tradeId},
        ${data.symbol},
        ${data.predictedDirection},
        ${data.actualDirection || null},
        ${data.predictedConfidence},
        ${data.actualProfitLoss || null},
        ${data.executionTime || null},
        ${data.closeTime || null},
        ${JSON.stringify(data.marketConditionsAtEntry)},
        ${data.marketConditionsAtExit ? JSON.stringify(data.marketConditionsAtExit) : null},
        ${JSON.stringify(data.technicalIndicatorsAtEntry)},
        ${data.technicalIndicatorsAtExit ? JSON.stringify(data.technicalIndicatorsAtExit) : null},
        NOW()
      )
    `;
    
    console.log(`📈 Recorded performance tracking for trade ${data.tradeId}`);
  } catch (error) {
    console.error('Error recording signal performance:', error);
  }
}

export async function getSignalAnalytics(timeframe: 'hour' | 'day' | 'week' | 'month' = 'day') {
  const timeCondition = getTimeCondition(timeframe);
  
  try {
    // Get success rate by symbol
    const successRateBySymbol = await analysisDB.queryAll`
      SELECT 
        symbol,
        COUNT(*) as total_signals,
        COUNT(CASE WHEN success = true THEN 1 END) as successful_signals,
        CAST(COUNT(CASE WHEN success = true THEN 1 END) AS DOUBLE PRECISION) / CAST(COUNT(*) AS DOUBLE PRECISION) * 100 as success_rate,
        CAST(AVG(generation_time_ms) AS DOUBLE PRECISION) as avg_generation_time
      FROM signal_analytics 
      WHERE created_at >= ${timeCondition}
      GROUP BY symbol
      ORDER BY success_rate DESC
    `;
    
    // Get performance by market conditions
    const performanceByConditions = await analysisDB.queryAll`
      SELECT 
        market_conditions->>'sessionType' as session_type,
        market_conditions->>'volatilityState' as volatility_state,
        COUNT(*) as signal_count,
        CAST(AVG(CAST((signal_data->>'confidence')::text AS DOUBLE PRECISION)) AS DOUBLE PRECISION) as avg_confidence,
        COUNT(CASE WHEN success = true THEN 1 END) as successful_count
      FROM signal_analytics 
      WHERE created_at >= ${timeCondition} AND market_conditions IS NOT NULL
      GROUP BY market_conditions->>'sessionType', market_conditions->>'volatilityState'
      ORDER BY signal_count DESC
    `;
    
    // Get trend analysis
    const trendAnalysis = await analysisDB.queryAll`
      SELECT 
        DATE_TRUNC('hour', created_at) as hour_bucket,
        COUNT(*) as signals_generated,
        CAST(AVG(CAST((signal_data->>'confidence')::text AS DOUBLE PRECISION)) AS DOUBLE PRECISION) as avg_confidence,
        COUNT(CASE WHEN success = true THEN 1 END) as successful_signals
      FROM signal_analytics 
      WHERE created_at >= ${timeCondition} AND signal_data IS NOT NULL
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour_bucket DESC
      LIMIT 24
    `;
    
    return {
      successRateBySymbol: successRateBySymbol.map(row => ({
        symbol: row.symbol,
        totalSignals: Number(row.total_signals),
        successfulSignals: Number(row.successful_signals),
        successRate: Number(row.success_rate),
        avgGenerationTime: Number(row.avg_generation_time)
      })),
      performanceByConditions: performanceByConditions.map(row => ({
        sessionType: row.session_type,
        volatilityState: row.volatility_state,
        signalCount: Number(row.signal_count),
        avgConfidence: Number(row.avg_confidence),
        successfulCount: Number(row.successful_count)
      })),
      trendAnalysis: trendAnalysis.map(row => ({
        hour: row.hour_bucket,
        signalsGenerated: Number(row.signals_generated),
        avgConfidence: Number(row.avg_confidence),
        successfulSignals: Number(row.successful_signals)
      }))
    };
  } catch (error) {
    console.error('Error getting signal analytics:', error);
    return {
      successRateBySymbol: [],
      performanceByConditions: [],
      trendAnalysis: []
    };
  }
}

export async function getMLTrainingData() {
  try {
    // Get comprehensive training data for ML model improvement
    const trainingData = await analysisDB.queryAll`
      SELECT 
        spt.trade_id,
        spt.symbol,
        spt.predicted_direction,
        spt.actual_direction,
        spt.predicted_confidence,
        spt.actual_profit_loss,
        spt.market_conditions_entry,
        spt.technical_indicators_entry,
        spt.execution_time,
        spt.close_time,
        sa.generation_time_ms,
        sa.market_conditions as generation_market_conditions
      FROM signal_performance_tracking spt
      LEFT JOIN signal_analytics sa ON sa.signal_data->>'tradeId' = spt.trade_id
      WHERE spt.actual_profit_loss IS NOT NULL
      AND spt.close_time IS NOT NULL
      ORDER BY spt.close_time DESC
      LIMIT 1000
    `;
    
    return trainingData.map(row => ({
      tradeId: row.trade_id,
      symbol: row.symbol,
      predictedDirection: row.predicted_direction,
      actualDirection: row.actual_direction,
      predictedConfidence: Number(row.predicted_confidence),
      actualProfitLoss: Number(row.actual_profit_loss),
      marketConditionsEntry: row.market_conditions_entry,
      technicalIndicatorsEntry: row.technical_indicators_entry,
      executionTime: row.execution_time,
      closeTime: row.close_time,
      generationTime: Number(row.generation_time_ms),
      generationMarketConditions: row.generation_market_conditions,
      wasCorrect: row.predicted_direction === row.actual_direction,
      wasProfitable: Number(row.actual_profit_loss) > 0
    }));
  } catch (error) {
    console.error('Error getting ML training data:', error);
    return [];
  }
}

function getTimeCondition(timeframe: 'hour' | 'day' | 'week' | 'month'): Date {
  const now = new Date();
  switch (timeframe) {
    case 'hour':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case 'day':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}

export async function updateSignalOutcome(tradeId: string, actualDirection: "LONG" | "SHORT", profitLoss: number) {
  try {
    // Get the original signal data
    const signal = await analysisDB.queryRow`
      SELECT * FROM trading_signals WHERE trade_id = ${tradeId}
    `;
    
    if (!signal) {
      console.error(`Signal not found for trade ID: ${tradeId}`);
      return;
    }
    
    // Update the performance tracking
    await analysisDB.exec`
      UPDATE signal_performance_tracking 
      SET 
        actual_direction = ${actualDirection},
        actual_profit_loss = ${profitLoss},
        close_time = NOW()
      WHERE trade_id = ${tradeId}
    `;
    
    // Record this outcome for ML learning
    await recordSignalPerformance({
      tradeId,
      symbol: signal.symbol,
      predictedDirection: signal.direction,
      actualDirection,
      predictedConfidence: signal.confidence,
      actualProfitLoss: profitLoss,
      executionTime: signal.executed_at ? new Date(signal.executed_at) : undefined,
      closeTime: new Date(),
      marketConditionsAtEntry: signal.analysis_data?.enhancedTechnical?.marketContext || {},
      technicalIndicatorsAtEntry: signal.analysis_data?.technical || {}
    });
    
    console.log(`📊 Updated signal outcome for ${tradeId}: ${actualDirection}, P/L: ${profitLoss}`);
  } catch (error) {
    console.error('Error updating signal outcome:', error);
  }
}
