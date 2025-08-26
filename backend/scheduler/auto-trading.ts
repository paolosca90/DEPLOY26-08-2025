import { cron } from "encore.dev/cron";
import { analysisDB } from "../analysis/db";
import { generateSignalForSymbol } from "../analysis/signal-generator";
import { recordSignalAnalytics, recordSignalPerformance } from "../analysis/analytics-tracker";
import { learningEngine } from "../ml/learning-engine";
import { getUnifiedTradingConfig } from "../analysis/config-helper";

// Simboli da analizzare automaticamente
const AUTO_TRADING_SYMBOLS = [
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD",
  "XAUUSD", "XAGUSD", "CRUDE", "BRENT",
  "US30", "US500", "SPX500", "NAS100", "UK100", "GER40",
  "BTCUSD", "ETHUSD", "LTCUSD", "XRPUSD"
];

// Genera segnali automaticamente ogni 2 minuti per test più frequenti
export const generateAutoSignals = cron("generate-auto-signals", {
  every: "2m",
  handler: async () => {
    console.log("🤖 Avvio generazione automatica segnali...");

    try {
      const { mt5Config, tradeParams } = await getUnifiedTradingConfig();

      const signals = [];
      const startTime = Date.now();

      // Genera segnali per i primi 8 simboli per velocizzare il processo
      const symbolsToAnalyze = AUTO_TRADING_SYMBOLS.slice(0, 8);

      for (const symbol of symbolsToAnalyze) {
        try {
          const signalStartTime = Date.now();
          const signal = await generateSignalForSymbol(symbol, mt5Config, tradeParams);
          const generationTime = Date.now() - signalStartTime;

          // Check if the signal was generated with real data
          if (signal.analysis.dataSource !== 'MT5') {
            const errorMessage = `Signal for ${symbol} was generated using fallback data. Discarding.`;
            console.log(`❌ ${errorMessage}`);
            await recordSignalAnalytics({
              symbol,
              success: false,
              error: errorMessage,
              generationTime,
              timestamp: new Date()
            });
            continue; // Skip to the next symbol
          }

          signals.push({
            signal,
            generationTime,
            symbol
          });

          // Registra analytics per ogni segnale generato
          await recordSignalAnalytics({
            symbol,
            success: true,
            signal,
            generationTime,
            marketConditions: {
              sessionType: signal.analysis?.enhancedTechnical?.marketContext?.sessionType || 'UNKNOWN',
              volatilityState: signal.analysis?.enhancedTechnical?.multiTimeframeAnalysis?.volatilityState || 'UNKNOWN',
              trendAlignment: signal.analysis?.enhancedTechnical?.multiTimeframeAnalysis?.trendAlignment || 'UNKNOWN',
              confluence: signal.analysis?.enhancedTechnical?.multiTimeframeAnalysis?.confluence || 0
            },
            timestamp: new Date()
          });

          // Salva il segnale nel database con status auto_generated
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

          console.log(`✅ Segnale generato per ${symbol}: ${signal.direction} (${signal.confidence}%)`);

        } catch (error) {
          console.error(`❌ Errore generazione segnale per ${symbol}:`, error);
          
          // Registra l'errore
          await recordSignalAnalytics({
            symbol,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            generationTime: 0,
            timestamp: new Date()
          });
        }
      }

      // Seleziona i 3 migliori segnali per confidenza
      const topSignals = signals
        .sort((a, b) => b.signal.confidence - a.signal.confidence)
        .slice(0, 3);

      console.log(`🎯 Top 3 segnali selezionati:`);
      topSignals.forEach((item, index) => {
        console.log(`${index + 1}. ${item.symbol}: ${item.signal.direction} (${item.signal.confidence}%)`);
      });

      // Simula l'esecuzione automatica dei top 3 segnali
      for (const item of topSignals) {
        await simulateTradeExecution(item.signal);
      }

      // Aggiorna le statistiche globali
      await updateSignalGenerationStats(signals.length, topSignals.length);

      const totalTime = Date.now() - startTime;
      console.log(`✅ Generazione automatica completata in ${totalTime}ms. Generati ${signals.length} segnali.`);

    } catch (error) {
      console.error("❌ Errore nella generazione automatica:", error);
    }
  },
});

// Aggiorna le statistiche di generazione segnali
async function updateSignalGenerationStats(totalGenerated: number, topSelected: number) {
  try {
    // Calcola statistiche aggregate per la dashboard
    const stats = await analysisDB.queryRow`
      SELECT 
        COUNT(*) as total_signals_today,
        COUNT(CASE WHEN status = 'auto_generated' THEN 1 END) as auto_generated_today,
        COUNT(CASE WHEN status = 'auto_executed' THEN 1 END) as auto_executed_today,
        COUNT(CASE WHEN status = 'auto_closed' THEN 1 END) as auto_closed_today,
        CAST(AVG(confidence) AS DOUBLE PRECISION) as avg_confidence_today
      FROM trading_signals 
      WHERE created_at >= CURRENT_DATE
      AND status LIKE 'auto_%'
    `;

    console.log(`📊 Statistiche giornaliere aggiornate: ${stats?.total_signals_today || 0} segnali totali, confidenza media ${Number(stats?.avg_confidence_today || 0).toFixed(1)}%`);

  } catch (error) {
    console.error("❌ Errore aggiornamento statistiche:", error);
  }
}

// Simula l'esecuzione di un trade e il suo esito
async function simulateTradeExecution(signal: any) {
  try {
    console.log(`🎲 Simulando esecuzione trade ${signal.tradeId} (${signal.symbol})`);

    // Simula un ritardo di esecuzione realistico
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

    // Genera un order ID simulato
    const simulatedOrderId = Math.floor(Math.random() * 900000) + 100000;

    // Aggiorna il segnale come "eseguito automaticamente"
    await analysisDB.exec`
      UPDATE trading_signals 
      SET executed_at = NOW(), 
          execution_price = ${signal.entryPrice * (1 + (Math.random() - 0.5) * 0.0002)},
          lot_size = ${signal.recommendedLotSize},
          mt5_order_id = ${simulatedOrderId},
          status = 'auto_executed'
      WHERE trade_id = ${signal.tradeId}
    `;

    // Programma la chiusura del trade basandosi sulla strategia
    const holdingTimeMs = calculateHoldingTime(signal.strategy, signal.maxHoldingTime);
    
    setTimeout(async () => {
      await simulateTradeClose(signal, holdingTimeMs);
    }, holdingTimeMs);

    console.log(`✅ Trade ${signal.tradeId} simulato come eseguito automaticamente (Order: ${simulatedOrderId})`);

  } catch (error) {
    console.error(`❌ Errore simulazione esecuzione ${signal.tradeId}:`, error);
  }
}

// Simula la chiusura di un trade con esito realistico
async function simulateTradeClose(signal: any, holdingTimeMs: number) {
  try {
    console.log(`🔄 Simulando chiusura trade ${signal.tradeId} dopo ${holdingTimeMs}ms`);

    const outcome = calculateRealisticOutcome(signal);

    // Aggiorna il trade con l'esito
    await analysisDB.exec`
      UPDATE trading_signals 
      SET closed_at = NOW(), 
          profit_loss = ${outcome.profitLoss},
          status = 'auto_closed'
      WHERE trade_id = ${signal.tradeId}
    `;

    // Registra le performance per il ML in modo strutturato
    const executedSignal = await analysisDB.queryRow`
      SELECT executed_at, analysis_data FROM trading_signals WHERE trade_id = ${signal.tradeId}
    `;

    await recordSignalPerformance({
      tradeId: signal.tradeId,
      symbol: signal.symbol,
      predictedDirection: signal.direction,
      actualDirection: outcome.actualDirection,
      predictedConfidence: signal.confidence,
      actualProfitLoss: outcome.profitLoss,
      executionTime: executedSignal?.executed_at ? new Date(executedSignal.executed_at) : new Date(),
      closeTime: new Date(),
      marketConditionsAtEntry: executedSignal?.analysis_data?.enhancedTechnical?.marketContext || {},
      marketConditionsAtExit: { sessionType: executedSignal?.analysis_data?.enhancedTechnical?.marketContext?.sessionType || 'UNKNOWN', volatilityState: 'NORMAL' },
      technicalIndicatorsAtEntry: executedSignal?.analysis_data?.technical || {},
      technicalIndicatorsAtExit: { rsi: 50 + (Math.random() - 0.5) * 20, macd: (Math.random() - 0.5) * 0.001 }
    });

    console.log(`✅ Trade ${signal.tradeId} chiuso automaticamente: ${outcome.actualDirection} P/L: $${outcome.profitLoss.toFixed(2)}`);

    // Se abbiamo abbastanza dati, riaddestra il modello ML
    const recentTrades = await analysisDB.queryRow`
      SELECT COUNT(*) as count FROM trading_signals 
      WHERE status = 'auto_closed' AND created_at >= NOW() - INTERVAL '24 hours'
    `;

    if (Number(recentTrades?.count) >= 30) {
      console.log("🧠 Avvio riaddestramento modello ML...");
      try {
        await learningEngine.trainModel();
        console.log("✅ Modello ML riaddestrato con successo");
      } catch (mlError) {
        console.error("❌ Errore riaddestramento ML:", mlError);
      }
    }

  } catch (error) {
    console.error(`❌ Errore simulazione chiusura ${signal.tradeId}:`, error);
  }
}

// Calcola un tempo di holding realistico
function calculateHoldingTime(strategy: string, maxHours: number): number {
  const baseTime = {
    'SCALPING': { min: 1, max: 15 }, // 1-15 minuti
    'INTRADAY': { min: 60, max: 360 }, // 1-6 ore
  };

  const times = baseTime[strategy as keyof typeof baseTime] || { min: 30, max: 180 };
  
  // Tempo casuale nel range della strategia
  const randomMinutes = Math.random() * (times.max - times.min) + times.min;
  
  // Converti in millisecondi
  return Math.floor(randomMinutes * 60 * 1000);
}

// Calcola un esito realistico del trade
function calculateRealisticOutcome(signal: any) {
  const confidence = signal.confidence;
  const riskReward = signal.riskRewardRatio;
  const strategy = signal.strategy;
  const symbol = signal.symbol;

  // Probabilità di successo basata sulla confidenza
  let successProbability = 0.5; // Base 50%
  
  if (confidence >= 90) successProbability = 0.85;
  else if (confidence >= 85) successProbability = 0.80;
  else if (confidence >= 80) successProbability = 0.75;
  else if (confidence >= 75) successProbability = 0.70;
  else if (confidence >= 70) successProbability = 0.65;
  else successProbability = 0.55;

  // Aggiustamenti per strategia
  if (strategy === 'SCALPING') {
    successProbability *= 0.95; // Scalping è più difficile
  }

  // Aggiustamenti per volatilità del simbolo
  const volatileSymbols = ['BTCUSD', 'ETHUSD', 'GBPJPY', 'XAUUSD'];
  if (volatileSymbols.includes(symbol)) {
    successProbability *= 0.92; // Simboli volatili sono più rischiosi
  }

  // Determina se il trade è vincente
  const isWinning = Math.random() < successProbability;
  
  // Calcola il P/L
  let profitLoss: number;
  let actualDirection: string;

  if (isWinning) {
    // Trade vincente: usa il take profit
    const baseProfit = 100; // Base profit in USD
    profitLoss = baseProfit * riskReward * signal.recommendedLotSize;
    
    // Aggiungi variazione realistica
    profitLoss *= (0.8 + Math.random() * 0.4); // ±20% variazione
    
    actualDirection = signal.direction;
  } else {
    // Trade perdente: usa lo stop loss
    const baseLoss = 100; // Base loss in USD
    profitLoss = -baseLoss * signal.recommendedLotSize;
    
    // Aggiungi variazione realistica
    profitLoss *= (0.7 + Math.random() * 0.6); // Variazione nelle perdite
    
    actualDirection = signal.direction === 'LONG' ? 'SHORT' : 'LONG';
  }

  // Arrotonda a 2 decimali
  profitLoss = Math.round(profitLoss * 100) / 100;

  return {
    profitLoss,
    actualDirection,
    isWinning
  };
}

// Aggiorna le statistiche di performance ogni ora
export const updatePerformanceStats = cron("update-performance-stats", {
  every: "1h",
  handler: async () => {
    console.log("📊 Aggiornamento statistiche di performance...");

    try {
      // Calcola statistiche delle ultime 24 ore
      const stats = await analysisDB.queryRow`
        SELECT 
          COUNT(*) as total_trades,
          COUNT(CASE WHEN profit_loss > 0 THEN 1 END) as winning_trades,
          AVG(profit_loss) as avg_profit_loss,
          SUM(profit_loss) as total_profit_loss,
          AVG(confidence) as avg_confidence,
          MAX(profit_loss) as best_trade,
          MIN(profit_loss) as worst_trade
        FROM trading_signals 
        WHERE status IN ('auto_closed', 'closed') 
        AND created_at >= NOW() - INTERVAL '24 hours'
      `;

      if (stats && Number(stats.total_trades) > 0) {
        const totalTrades = Number(stats.total_trades);
        const winningTrades = Number(stats.winning_trades);
        const winRate = (winningTrades / totalTrades) * 100;
        const totalProfitLoss = Number(stats.total_profit_loss) || 0;
        const avgConfidence = Number(stats.avg_confidence) || 0;

        console.log(`📈 Statistiche 24h:`);
        console.log(`   - Trade totali: ${totalTrades}`);
        console.log(`   - Win rate: ${winRate.toFixed(1)}%`);
        console.log(`   - P/L totale: $${totalProfitLoss.toFixed(2)}`);
        console.log(`   - Confidenza media: ${avgConfidence.toFixed(1)}%`);

        // Aggiorna le metriche ML se necessario
        if (totalTrades >= 20) {
          await updateMLMetrics(stats);
        }
      }

      // Pulisci i vecchi segnali (più di 7 giorni) ma mantieni quelli recenti
      await cleanOldSignals();

    } catch (error) {
      console.error("❌ Errore aggiornamento statistiche:", error);
    }
  },
});

// Aggiorna le metriche ML
async function updateMLMetrics(stats: any) {
  try {
    const totalTrades = Number(stats.total_trades);
    const winningTrades = Number(stats.winning_trades);
    const accuracy = winningTrades / totalTrades;

    // Calcola precision e recall
    const precision = accuracy; // Semplificato per questo esempio
    const recall = accuracy;
    const f1Score = 2 * (precision * recall) / (precision + recall);

    // Calcola Sharpe ratio semplificato
    const avgReturn = Number(stats.avg_profit_loss) || 0;
    const sharpeRatio = avgReturn > 0 ? Math.min(3.0, avgReturn / 50) : 0;

    // Inserisci le metriche nel database ML
    await analysisDB.exec`
      INSERT INTO ml_model_metrics (
        model_name, model_version, metric_type, metric_value, training_date
      ) VALUES 
        ('auto_trading_model', 'v1.0', 'accuracy', ${accuracy}, NOW()),
        ('auto_trading_model', 'v1.0', 'precision', ${precision}, NOW()),
        ('auto_trading_model', 'v1.0', 'recall', ${recall}, NOW()),
        ('auto_trading_model', 'v1.0', 'f1_score', ${f1Score}, NOW()),
        ('auto_trading_model', 'v1.0', 'sharpe_ratio', ${sharpeRatio}, NOW())
    `;

    console.log(`🧠 Metriche ML aggiornate: Accuracy ${(accuracy * 100).toFixed(1)}%, Sharpe ${sharpeRatio.toFixed(2)}`);

  } catch (error) {
    console.error("❌ Errore aggiornamento metriche ML:", error);
  }
}

// Pulisce i vecchi segnali per mantenere il database efficiente
async function cleanOldSignals() {
  try {
    const result = await analysisDB.exec`
      DELETE FROM trading_signals 
      WHERE created_at < NOW() - INTERVAL '7 days'
      AND status IN ('auto_generated', 'auto_executed', 'auto_closed')
    `;

    console.log(`🧹 Puliti vecchi segnali automatici`);

  } catch (error) {
    console.error("❌ Errore pulizia vecchi segnali:", error);
  }
}

// Genera report giornaliero delle performance
export const generateDailyReport = cron("generate-daily-report", {
  every: "0 8 * * *", // Ogni giorno alle 8:00
  handler: async () => {
    console.log("📋 Generazione report giornaliero...");

    try {
      const dailyStats = await analysisDB.queryRow`
        SELECT 
          COUNT(*) as total_trades,
          COUNT(CASE WHEN profit_loss > 0 THEN 1 END) as winning_trades,
          SUM(profit_loss) as total_profit_loss,
          AVG(confidence) as avg_confidence,
          MAX(profit_loss) as best_trade,
          MIN(profit_loss) as worst_trade,
          COUNT(DISTINCT symbol) as symbols_traded
        FROM trading_signals 
        WHERE status IN ('auto_closed', 'closed') 
        AND created_at >= CURRENT_DATE - INTERVAL '1 day'
        AND created_at < CURRENT_DATE
      `;

      if (dailyStats && Number(dailyStats.total_trades) > 0) {
        const totalTrades = Number(dailyStats.total_trades);
        const winningTrades = Number(dailyStats.winning_trades);
        const winRate = (winningTrades / totalTrades) * 100;
        const totalProfitLoss = Number(dailyStats.total_profit_loss) || 0;

        console.log(`📊 REPORT GIORNALIERO:`);
        console.log(`   🎯 Trade eseguiti: ${totalTrades}`);
        console.log(`   ✅ Trade vincenti: ${winningTrades} (${winRate.toFixed(1)}%)`);
        console.log(`   💰 P/L totale: $${totalProfitLoss.toFixed(2)}`);
        console.log(`   📈 Miglior trade: $${Number(dailyStats.best_trade).toFixed(2)}`);
        console.log(`   📉 Peggior trade: $${Number(dailyStats.worst_trade).toFixed(2)}`);
        console.log(`   🎲 Simboli tradati: ${Number(dailyStats.symbols_traded)}`);
        console.log(`   🧠 Confidenza media: ${Number(dailyStats.avg_confidence).toFixed(1)}%`);
      } else {
        console.log("📊 Nessun trade completato ieri");
      }

    } catch (error) {
      console.error("❌ Errore generazione report giornaliero:", error);
    }
  },
});

// Cron job per mantenere sempre alcuni segnali visibili sulla dashboard
export const ensureVisibleSignals = cron("ensure-visible-signals", {
  every: "5m",
  handler: async () => {
    try {
      // Controlla se ci sono segnali recenti visibili
      const recentSignals = await analysisDB.queryRow`
        SELECT COUNT(*) as count 
        FROM trading_signals 
        WHERE status LIKE 'auto_%' 
        AND created_at >= NOW() - INTERVAL '30 minutes'
      `;

      const signalCount = Number(recentSignals?.count) || 0;
      
      if (signalCount < 3) {
        console.log(`🔄 Solo ${signalCount} segnali recenti trovati, generando segnali aggiuntivi...`);
        
        const { mt5Config, tradeParams } = await getUnifiedTradingConfig();
        
        // Genera alcuni segnali per i simboli più popolari
        const popularSymbols = ["EURUSD", "BTCUSD", "US30"];
        
        for (const symbol of popularSymbols) {
          try {
            const signal = await generateSignalForSymbol(symbol, mt5Config, tradeParams);
            
            // Check if the signal was generated with real data
            if (signal.analysis.dataSource !== 'MT5') {
              console.log(`❌ Backup signal for ${symbol} used fallback data. Discarding.`);
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
            
            console.log(`✅ Segnale di backup generato per ${symbol}: ${signal.direction} (${signal.confidence}%)`);
            
          } catch (error) {
            console.error(`❌ Errore generazione segnale backup per ${symbol}:`, error);
          }
        }
      }
      
    } catch (error) {
      console.error("❌ Errore nel controllo segnali visibili:", error);
    }
  },
});
