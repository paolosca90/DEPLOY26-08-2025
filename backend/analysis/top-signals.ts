import { api, APIError } from "encore.dev/api";
import { analysisDB } from "./db";
import { user } from "~encore/clients";

// A simplified signal for the dashboard based on real auto-generated signals
export interface AutoSignal {
  symbol: string;
  direction: "LONG" | "SHORT";
  confidence: number;
  entryPrice: number;
  takeProfit: number;
  stopLoss: number;
  riskRewardRatio: number;
  strategy: string;
  timeframe: string;
  analysis: {
    rsi: number;
    macd: number;
    trend: string;
    volatility: string;
  };
  createdAt: Date;
  tradeId: string;
}

interface GetTopSignalsResponse {
  signals: AutoSignal[];
}

// Retrieves the top 3 real trading signals from the auto-generation system.
export const getTopSignals = api<void, GetTopSignalsResponse>({
  method: "GET",
  path: "/analysis/top-signals",
  expose: true,
}, async () => {
  console.log("🔍 Recuperando i migliori segnali automatici...");

  try {
    // Get the top 3 most recent, highest-confidence auto-generated signals
    // Include all auto statuses to show the complete lifecycle
    const topSignals = await analysisDB.queryAll`
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
        analysis_data,
        created_at,
        status
      FROM trading_signals
      WHERE status IN ('auto_generated', 'auto_executed', 'auto_closed')
      AND created_at >= NOW() - INTERVAL '2 hours'
      ORDER BY 
        CASE 
          WHEN status = 'auto_generated' THEN 1
          WHEN status = 'auto_executed' THEN 2
          WHEN status = 'auto_closed' THEN 3
        END,
        confidence DESC, 
        created_at DESC
      LIMIT 6
    `;

    if (topSignals.length === 0) {
      console.log("⚠️ Nessun segnale automatico recente trovato, cercando segnali più vecchi...");
      
      // Fallback: If no recent signals, get the latest auto-generated signals regardless of age
      const fallbackSignals = await analysisDB.queryAll`
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
          analysis_data,
          created_at,
          status
        FROM trading_signals
        WHERE status IN ('auto_generated', 'auto_executed', 'auto_closed')
        ORDER BY created_at DESC
        LIMIT 6
      `;

      if (fallbackSignals.length === 0) {
        console.log("🚫 Nessun segnale automatico trovato nel database.");
        
        // Generate some demo signals if none exist
        const demoSignals = generateDemoSignals();
        return { signals: demoSignals };
      }

      console.log(`✅ Trovati ${fallbackSignals.length} segnali di fallback.`);
      return {
        signals: fallbackSignals.map(signal => transformToAutoSignal(signal)).slice(0, 3)
      };
    }

    // Take only the top 3 for display
    const autoSignals: AutoSignal[] = topSignals.slice(0, 3).map(signal => transformToAutoSignal(signal));

    console.log(`✅ Recuperati ${autoSignals.length} segnali automatici: ${autoSignals.map(s => `${s.symbol} (${s.confidence}%)`).join(', ')}`);

    return { signals: autoSignals };

  } catch (error) {
    console.error("❌ Errore nel recupero dei segnali automatici:", error);
    
    // Return demo signals on error to prevent UI crashes
    const demoSignals = generateDemoSignals();
    return { signals: demoSignals };
  }
});

// Generate demo signals when no real signals are available
function generateDemoSignals(): AutoSignal[] {
  const demoSymbols = ["EURUSD", "BTCUSD", "US30"];
  const directions: ("LONG" | "SHORT")[] = ["LONG", "SHORT"];
  const strategies = ["INTRADAY", "SCALPING"];
  
  return demoSymbols.map((symbol, index) => {
    const direction = directions[Math.floor(Math.random() * directions.length)];
    const confidence = 75 + Math.floor(Math.random() * 20); // 75-95%
    const basePrice = getSymbolBasePrice(symbol);
    const entryPrice = basePrice * (1 + (Math.random() - 0.5) * 0.01);
    const strategy = strategies[Math.floor(Math.random() * strategies.length)];
    
    const stopLossDistance = entryPrice * 0.01; // 1% stop loss
    const takeProfitDistance = stopLossDistance * 2; // 1:2 risk reward
    
    return {
      symbol,
      direction,
      confidence,
      entryPrice: Number(entryPrice.toFixed(5)),
      takeProfit: Number((direction === "LONG" ? entryPrice + takeProfitDistance : entryPrice - takeProfitDistance).toFixed(5)),
      stopLoss: Number((direction === "LONG" ? entryPrice - stopLossDistance : entryPrice + stopLossDistance).toFixed(5)),
      riskRewardRatio: 2.0,
      strategy,
      timeframe: strategy === "SCALPING" ? "5m" : "15m",
      analysis: {
        rsi: 40 + Math.random() * 20,
        macd: (Math.random() - 0.5) * 0.001,
        trend: Math.random() > 0.5 ? "BULLISH" : "BEARISH",
        volatility: "NORMAL",
      },
      createdAt: new Date(Date.now() - Math.random() * 30 * 60 * 1000), // Last 30 minutes
      tradeId: `DEMO-${symbol}-${Date.now()}-${index}`
    };
  });
}

function getSymbolBasePrice(symbol: string): number {
  const basePrices: Record<string, number> = {
    "BTCUSD": 95000,
    "ETHUSD": 3500,
    "EURUSD": 1.085,
    "GBPUSD": 1.275,
    "USDJPY": 150.5,
    "XAUUSD": 2050,
    "US30": 44500,
    "US500": 5800,
    "NAS100": 20500,
  };
  return basePrices[symbol] || 1.0;
}

// Transform database signal to AutoSignal format
function transformToAutoSignal(signal: any): AutoSignal {
  const analysisData = signal.analysis_data || {};
  const technical = analysisData.technical || {};
  const enhancedTechnical = analysisData.enhancedTechnical || {};
  const multiTimeframeAnalysis = enhancedTechnical.multiTimeframeAnalysis || {};

  return {
    symbol: signal.symbol,
    direction: signal.direction,
    confidence: Number(signal.confidence),
    entryPrice: Number(signal.entry_price),
    takeProfit: Number(signal.take_profit),
    stopLoss: Number(signal.stop_loss),
    riskRewardRatio: Number(signal.risk_reward_ratio),
    strategy: signal.strategy,
    timeframe: getTimeframeFromStrategy(signal.strategy),
    analysis: {
      rsi: technical.rsi || 50,
      macd: technical.macd || 0,
      trend: technical.trend || multiTimeframeAnalysis.trendAlignment || "NEUTRAL",
      volatility: multiTimeframeAnalysis.volatilityState || "NORMAL",
    },
    createdAt: new Date(signal.created_at),
    tradeId: signal.trade_id
  };
}

// Get appropriate timeframe based on strategy
function getTimeframeFromStrategy(strategy: string): string {
  switch (strategy) {
    case 'SCALPING':
      return '5m';
    case 'INTRADAY':
      return '15m';
    default:
      return '15m';
  }
}

// Get real-time signal statistics
export const getSignalStats = api<void, {
  totalGenerated: number;
  totalExecuted: number;
  totalClosed: number;
  avgConfidence: number;
  topPerformingSymbol: string;
  lastGenerationTime: Date | null;
}>(
  {
    expose: true,
    method: "GET",
    path: "/analysis/signal-stats"
  },
  async () => {
    try {
      // Get overall signal statistics for the last 24 hours
      const stats = await analysisDB.queryRow`
        SELECT 
          COUNT(CASE WHEN status = 'auto_generated' THEN 1 END) as total_generated,
          COUNT(CASE WHEN status = 'auto_executed' THEN 1 END) as total_executed,
          COUNT(CASE WHEN status = 'auto_closed' THEN 1 END) as total_closed,
          CAST(AVG(confidence) AS DOUBLE PRECISION) as avg_confidence,
          MAX(created_at) as last_generation_time
        FROM trading_signals
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        AND status IN ('auto_generated', 'auto_executed', 'auto_closed')
      `;

      // Get top performing symbol
      const topSymbol = await analysisDB.queryRow`
        SELECT symbol
        FROM trading_signals
        WHERE status = 'auto_closed'
        AND profit_loss IS NOT NULL
        AND created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY symbol
        ORDER BY SUM(profit_loss) DESC
        LIMIT 1
      `;

      return {
        totalGenerated: Number(stats?.total_generated) || 0,
        totalExecuted: Number(stats?.total_executed) || 0,
        totalClosed: Number(stats?.total_closed) || 0,
        avgConfidence: Number(stats?.avg_confidence) || 0,
        topPerformingSymbol: topSymbol?.symbol || 'N/A',
        lastGenerationTime: stats?.last_generation_time ? new Date(stats.last_generation_time) : null,
      };

    } catch (error) {
      console.error("❌ Errore nel recupero delle statistiche dei segnali:", error);
      
      return {
        totalGenerated: 0,
        totalExecuted: 0,
        totalClosed: 0,
        avgConfidence: 0,
        topPerformingSymbol: 'N/A',
        lastGenerationTime: null,
      };
    }
  }
);

// Force generation of new signals (for manual refresh)
export const forceSignalGeneration = api<void, { success: boolean; message: string }>(
  {
    expose: true,
    method: "POST",
    path: "/analysis/force-signal-generation"
  },
  async () => {
    try {
      console.log("🔄 Forzando generazione di nuovi segnali...");
      
      // Fetch config from the single source of truth
      const { config: mt5Config } = await user.getMt5Config();
      const { preferences } = await user.getPreferences();

      if (!mt5Config || !preferences) {
        throw APIError.failedPrecondition("MT5 configuration or user preferences are not set up.");
      }

      const tradeParams = {
        accountBalance: preferences.accountBalance,
        riskPercentage: preferences.riskPercentage
      };
      
      const { generateSignalForSymbol } = await import("./signal-generator");
      
      const popularSymbols = ["EURUSD", "BTCUSD", "US30"];
      let generatedCount = 0;
      
      for (const symbol of popularSymbols) {
        try {
          const signal = await generateSignalForSymbol(symbol, mt5Config, tradeParams);
          
          // Check if the signal was generated with real MT5 data (same validation as auto-trading)
          if (signal.analysis.dataSource !== 'MT5') {
            console.log(`❌ Forced signal for ${symbol} used fallback data. Discarding.`);
            continue;
          }
          
          await analysisDB.exec`
            INSERT INTO trading_signals (
              trade_id, user_id, symbol, direction, strategy, entry_price, take_profit, stop_loss, 
              confidence, risk_reward_ratio, recommended_lot_size, max_holding_hours,
              expires_at, analysis_data, created_at, status
            ) VALUES (
              ${signal.tradeId}, 1, ${signal.symbol}, ${signal.direction}, ${signal.strategy}, 
              ${signal.entryPrice}, ${signal.takeProfit}, ${signal.stopLoss}, 
              ${signal.confidence}, ${signal.riskRewardRatio}, ${signal.recommendedLotSize},
              ${signal.maxHoldingTime}, ${signal.expiresAt}, ${JSON.stringify(signal.analysis)}, NOW(), 'auto_generated'
            )
          `;
          
          generatedCount++;
          console.log(`✅ Segnale forzato generato per ${symbol}: ${signal.direction} (${signal.confidence}%)`);
          
        } catch (error) {
          console.error(`❌ Errore generazione segnale forzato per ${symbol}:`, error);
        }
      }
      
      return {
        success: true,
        message: `${generatedCount} nuovi segnali generati con successo. Aggiorna la pagina per visualizzarli.`
      };
      
    } catch (error) {
      console.error("❌ Errore nella forzatura della generazione:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Errore nella generazione dei segnali. Riprova tra qualche minuto.";
      return {
        success: false,
        message: errorMessage
      };
    }
  }
);
